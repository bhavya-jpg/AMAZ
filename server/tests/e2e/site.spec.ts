// The landing page and console render, link together, and log no errors.
import { expect, test } from '@playwright/test'

test('landing page renders hero, sections and navigation without errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Know when someone’s at the door.' })).toBeVisible()
  await expect(page.getByRole('img', { name: /showing a doorbell press full screen/i })).toBeVisible()
  for (const id of ['why', 'how', 'honest', 'privacy']) await expect(page.locator(`#${id}`)).toHaveCount(1)
  await expect(page.locator('footer')).toContainText('Not affiliated with or endorsed by Ring or Amazon')
  await page.getByRole('link', { name: 'Try the live demo' }).click()
  await expect(page).toHaveURL(/\/console$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Console')
  expect(errors).toEqual([])
})

test('mobile: no horizontal overflow and the menu opens and closes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Why', exact: true }).first()).toBeHidden()
  await page.getByRole('button', { name: 'Menu' }).click()
  await expect(page.locator('.nav-sheet')).toBeVisible()
  await page.getByRole('button', { name: 'Menu' }).click()
  await expect(page.locator('.nav-sheet')).toBeHidden()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
