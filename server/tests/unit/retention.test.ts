import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { deleteExpiredImages, getEvent, imagesDir, insertEvent, resetDbForTests, setEventImage } from '@/lib/store'

beforeEach(() => resetDbForTests())

function addEvent(id: string, ageMs: number) {
  insertEvent({ id, request_id: `r-${id}`, type: 'button_press', sub_type: null, device_id: 'd', ring_ts: 0, received_at: Date.now() - ageMs, origin: 'simulated', decision: 'door' })
  mkdirSync(imagesDir(), { recursive: true })
  const file = path.join(imagesDir(), `${id}.jpg`)
  writeFileSync(file, Buffer.from([0xff, 0xd8, 0xff]))
  setEventImage(id, file, 'test', null)
  return file
}

describe('image retention', () => {
  it('deletes images older than the TTL and keeps recent ones', () => {
    const old = addEvent('old', 2 * 3600_000)
    const fresh = addEvent('fresh', 60_000)
    expect(deleteExpiredImages(3600_000)).toBe(1)
    expect(existsSync(old)).toBe(false)
    expect(getEvent('old')!.image_path).toBeNull()
    expect(getEvent('old')!.image_error).toContain('retention')
    expect(existsSync(fresh)).toBe(true)
    expect(getEvent('fresh')!.image_path).toBe(fresh)
  })
})
