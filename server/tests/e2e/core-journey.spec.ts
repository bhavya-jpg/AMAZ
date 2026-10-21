// Core journey in a real browser against the production build:
// pair /tv → signed simulated press → visible door alert → OK acknowledges → motion never alerts.
import { expect, test, type APIRequestContext } from '@playwright/test'

async function admin(request: APIRequestContext) {
  const r = await request.post('/api/admin/login', { data: { password: 'e2e-admin' } })
  expect(r.ok()).toBeTruthy()
  // A device id is needed to address simulated events; no Ring token is configured in CI.
  expect((await request.post('/api/ring/devices', { data: { id: 'e2e-device', name: 'Front door' } })).ok()).toBeTruthy()
  await request.delete('/api/data')
}

test('press → TV alert → acknowledge; motion does not alert', async ({ page, request }) => {
  await admin(request)
  const consoleErrors: string[] = []
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))

  // Pair the web TV surface with the code it shows.
  await page.goto('/tv')
  const code = (await page.getByTestId('pair-code').textContent())!.trim()
  expect(code).toMatch(/^\d{6}$/)
  expect((await request.post('/api/surfaces/pair/approve', { data: { code } })).ok()).toBeTruthy()
  await expect(page.getByTestId('conn')).toHaveText(/connected/, { timeout: 10_000 })

  // Doorbell press → full-screen door alert.
  expect((await request.post('/api/sim/button_press')).ok()).toBeTruthy()
  await expect(page.getByTestId('alert-kind')).toHaveText('DOORBELL', { timeout: 5_000 })
  await expect(page.getByText('SIMULATED PRESS')).toBeVisible()
  // No Ring token and no live view in CI → the UI must say so, not show a fake image.
  await expect(page.getByText('No image available')).toBeVisible({ timeout: 10_000 })

  // OK / Enter acknowledges and clears.
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('alert')).toHaveCount(0)
  const t1 = (await (await request.get('/api/events')).json()).events
  expect(t1[0].acked_by).toBe('Living room TV (web)')

  // Bird / other motion → nothing on screen.
  for (let i = 0; i < 5; i++) expect((await request.post('/api/sim/motion_other')).ok()).toBeTruthy()
  await page.waitForTimeout(1500)
  await expect(page.getByTestId('alert')).toHaveCount(0)

  // Person motion → a badge, not a door alert.
  expect((await request.post('/api/sim/motion_human')).ok()).toBeTruthy()
  await expect(page.getByTestId('alert-kind')).toHaveText('PERSON NEARBY', { timeout: 5_000 })

  expect(consoleErrors.filter((e) => !e.includes('favicon'))).toEqual([])
})

test('latency: 50 presses, webhook receipt → alert rendered on the TV', async ({ page, request }) => {
  await admin(request)
  await page.goto('/tv')
  const code = (await page.getByTestId('pair-code').textContent())!.trim()
  await request.post('/api/surfaces/pair/approve', { data: { code } })
  await expect(page.getByTestId('conn')).toHaveText(/connected/, { timeout: 10_000 })

  for (let i = 0; i < 50; i++) {
    expect((await request.post('/api/sim/button_press')).ok()).toBeTruthy()
    await expect(page.getByTestId('alert-kind')).toHaveText('DOORBELL', { timeout: 5_000 })
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('alert')).toHaveCount(0)
  }
  await page.waitForTimeout(500)
  const events = (await (await request.get('/api/events')).json()).events as { decision: string; deliveries: { rendered_ms: number | null }[] }[]
  const ms = events
    .filter((e) => e.decision === 'door')
    .map((e) => e.deliveries.find((d) => d.rendered_ms !== null)?.rendered_ms)
    .filter((x): x is number => typeof x === 'number')
    .sort((a, b) => a - b)
  expect(ms.length).toBeGreaterThanOrEqual(48)
  const p50 = ms[Math.floor(ms.length * 0.5)]
  const p95 = ms[Math.floor(ms.length * 0.95)]
  console.log(`LATENCY n=${ms.length} p50=${p50}ms p95=${p95}ms max=${ms[ms.length - 1]}ms (local loopback, simulated events)`)
  expect(p95).toBeLessThan(2000)
})
