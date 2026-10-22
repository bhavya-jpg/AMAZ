// The DoorSignal TV workflow, run against a deployed instance (replay mode):
// /tv shows a code → paired through /console → simulated doorbell press → full-screen alert on the TV
// with the recorded Ring Playground image and a SIMULATED label → Enter clears it.
// Pairing needs the admin login, read from DEPLOYED_ADMIN_PASSWORD; it is never logged.
import { expect, test, type BrowserContext, type Page, type TestInfo } from '@playwright/test'

const PASSWORD = process.env.DEPLOYED_ADMIN_PASSWORD

type Problem = { page: string; kind: string; detail: string }

function watch(page: Page, label: string, problems: Problem[]) {
  page.on('pageerror', (e) => problems.push({ page: label, kind: 'pageerror', detail: e.message }))
  page.on('console', (m) => m.type() === 'error' && problems.push({ page: label, kind: 'console', detail: m.text() }))
  page.on('requestfailed', (r) => {
    // An open SSE stream is aborted when the page closes; that is not a failure.
    if (!r.url().includes('/stream')) problems.push({ page: label, kind: 'requestfailed', detail: `${r.method()} ${r.url()} ${r.failure()?.errorText}` })
  })
  page.on('response', (r) => {
    if (r.status() >= 400) problems.push({ page: label, kind: `http ${r.status()}`, detail: `${r.request().method()} ${r.url().replace(/sig=[0-9a-f]+/, 'sig=…')}` })
  })
}

async function shot(page: Page, info: TestInfo, name: string) {
  await info.attach(name, { body: await page.screenshot(), contentType: 'image/png' })
}

// Callers pass a snapshot taken before closing contexts, which cancels in-flight requests (e.g. timeline thumbnails).
async function finish(info: TestInfo, problems: Problem[]) {
  await info.attach('browser-errors.json', { body: JSON.stringify(problems, null, 2), contentType: 'application/json' })
  expect(problems, 'browser console / network errors').toEqual([])
}

async function openTv(context: BrowserContext, problems: Problem[]) {
  const tv = await context.newPage()
  watch(tv, 'tv', problems)
  await tv.goto('/tv')
  const code = (await tv.getByTestId('pair-code').textContent({ timeout: 90_000 }))!.trim()
  expect(code).toMatch(/^\d{6}$/)
  return { tv, code }
}

async function getEvent(context: BrowserContext, id: string) {
  const r = await context.request.get('/api/events')
  expect(r.ok()).toBeTruthy()
  return ((await r.json()).events as Array<Record<string, unknown>>).find((e) => e.id === id)
}

test('public sandbox: TV shows a pairing code; a simulated press is recorded with the Playground image', async ({ browser }, info) => {
  const problems: Problem[] = []
  const tvCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const { tv } = await openTv(tvCtx, problems)
  await shot(tv, info, '01-tv-pairing-code')

  const conCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const con = await conCtx.newPage()
  watch(con, 'console', problems)
  await con.goto('/console', { waitUntil: 'domcontentloaded' })
  await expect(con.getByTestId('mode')).toContainText('REPLAY')

  // Public presses are rate limited to one every 3 s across all visitors; retry once if we hit it.
  let sim = await Promise.all([con.waitForResponse((r) => r.url().includes('/api/sim/button_press')), con.getByTestId('sim-press').click()]).then(([r]) => r)
  if (sim.status() === 429) {
    await con.waitForTimeout(3500)
    problems.splice(0) // the 429 above is the documented rate limit, not a defect
    sim = await Promise.all([con.waitForResponse((r) => r.url().includes('/api/sim/button_press')), con.getByTestId('sim-press').click()]).then(([r]) => r)
  }
  expect(sim.status()).toBe(200)
  const eventId = (await sim.json()).webhook.body.event_id as string

  await expect(con.getByTestId('timeline')).toContainText('button_press', { timeout: 15_000 })
  await expect.poll(async () => (await getEvent(conCtx, eventId))?.image_url, { timeout: 20_000 }).toBeTruthy()
  const ev = (await getEvent(conCtx, eventId))!
  expect(ev).toMatchObject({ type: 'button_press', origin: 'simulated', decision: 'door', image_source: 'replay: recorded Ring Playground snapshot' })
  const img = await conCtx.request.get(String(ev.image_url))
  expect(img.headers()['content-type']).toBe('image/jpeg')
  expect((await img.body()).subarray(0, 2).toString('hex')).toBe('ffd8')
  await shot(con, info, '02-console-timeline')
  const found = [...problems]
  await tvCtx.close()
  await conCtx.close()
  await finish(info, found)
})

test('full TV workflow: pair → press → full-screen alert with image → Enter clears', async ({ browser }, info) => {
  test.skip(!PASSWORD, 'DEPLOYED_ADMIN_PASSWORD is not set. Pairing a screen requires the admin login on the deployed app.')
  const problems: Problem[] = []

  const tvCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const { tv, code } = await openTv(tvCtx, problems)
  await shot(tv, info, '01-tv-pairing-code')

  const conCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  // Log in through the API so the password never appears in a UI step, screenshot or report.
  const login = await conCtx.request.post('/api/admin/login', { data: { password: PASSWORD } })
  expect(login.ok(), 'admin login failed (password not shown)').toBeTruthy()
  const con = await conCtx.newPage()
  watch(con, 'console', problems)
  await con.goto('/console', { waitUntil: 'domcontentloaded' })
  await expect(con.getByTestId('mode')).toContainText('REPLAY')

  // Pair through the console UI with the code read from the TV.
  await con.getByLabel('Pairing code').fill(code)
  const [approve] = await Promise.all([
    con.waitForResponse((r) => r.url().includes('/api/surfaces/pair/approve')),
    con.getByRole('button', { name: 'Pair', exact: true }).click(),
  ])
  expect(approve.status()).toBe(200)
  const surfaceId = (await approve.json()).surface_id as string
  // A door alert stays until someone acknowledges it, so a newly paired screen first shows any press
  // still open on this (shared) sandbox. Clear those so the press below is the one we verify.
  await expect(tv.getByTestId('conn').or(tv.getByTestId('alert'))).toBeVisible({ timeout: 20_000 })
  for (let i = 0; i < 20 && (await tv.getByTestId('alert').isVisible()); i++) {
    if (i === 0) await shot(tv, info, '02a-tv-earlier-open-alert')
    await tv.keyboard.press('Enter')
    await tv.waitForTimeout(500)
  }
  await expect(tv.getByTestId('conn')).toHaveText(/connected/, { timeout: 20_000 })
  await shot(tv, info, '02-tv-paired-idle')

  try {
    // Simulated doorbell press from the console.
    const [sim] = await Promise.all([
      con.waitForResponse((r) => r.url().includes('/api/sim/button_press')),
      con.getByTestId('sim-press').click(),
    ])
    expect(sim.status()).toBe(200)
    const eventId = (await sim.json()).webhook.body.event_id as string

    // The TV shows the full-screen door alert, labelled as simulated, with the recorded Playground image.
    await expect(tv.getByTestId('alert')).toBeVisible({ timeout: 15_000 })
    await expect(tv.getByTestId('alert-kind')).toHaveText('DOORBELL')
    await expect(tv.getByText('SIMULATED PRESS')).toBeVisible()
    const img = tv.getByTestId('alert-img')
    await expect(img).toBeVisible({ timeout: 20_000 })
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), { timeout: 15_000 }).toBe(true)
    const src = (await img.getAttribute('src'))!
    const bytes = await tvCtx.request.get(src)
    expect(bytes.headers()['content-type']).toBe('image/jpeg')
    expect((await bytes.body()).subarray(0, 2).toString('hex')).toBe('ffd8')
    await shot(tv, info, '03-tv-doorbell-alert')

    const ev = (await getEvent(conCtx, eventId))!
    expect(ev).toMatchObject({ origin: 'simulated', decision: 'door', image_source: 'replay: recorded Ring Playground snapshot' })

    // Enter (the remote's OK) acknowledges and clears the alert.
    await tv.keyboard.press('Enter')
    await expect(tv.getByTestId('alert')).toHaveCount(0, { timeout: 10_000 })
    await expect(tv.getByTestId('conn')).toBeVisible()
    await shot(tv, info, '04-tv-cleared')
    await expect.poll(async () => (await getEvent(conCtx, eventId))?.acked_at, { timeout: 10_000 }).toBeTruthy()
    const acked = (await getEvent(conCtx, eventId))!
    const delivered = acked.deliveries as Array<{ surface: string; rendered_ms: number | null }>
    expect(delivered.some((d) => d.surface === 'Living room TV (web)' && d.rendered_ms !== null)).toBe(true)
    await con.reload({ waitUntil: 'domcontentloaded' })
    await expect(con.getByTestId('timeline')).toContainText('button_press')
    await shot(con, info, '05-console-timeline')
    await info.attach('event.json', { body: JSON.stringify({ ...acked, image_url: '(signed URL omitted)' }, null, 2), contentType: 'application/json' })
  } finally {
    // Leave the shared sandbox as we found it.
    await conCtx.request.delete('/api/surfaces', { data: { id: surfaceId } })
    await conCtx.request.delete('/api/admin/login')
  }
  const found = [...problems]
  await tvCtx.close()
  await conCtx.close()
  await finish(info, found)
})
