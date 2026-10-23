// SQLite persistence via Node's built-in node:sqlite (no native dependencies).
import { mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { config } from './config'
import type { Decision } from './policy'

export type Origin = 'ring' | 'simulated' | 'replay'
export type SurfaceType = 'firetv' | 'tv' | 'phone' | 'light'

export interface EventRow {
  id: string
  request_id: string
  type: string
  sub_type: string | null
  device_id: string
  ring_ts: number
  received_at: number
  origin: Origin
  decision: Decision
  image_path: string | null
  image_source: string | null
  image_error: string | null
  acked_at: number | null
  acked_by: string | null
  description?: string | null
  description_source?: string | null
}

export interface SurfaceRow {
  id: string
  type: SurfaceType
  name: string
  token_hash: string
  paired_at: number
  last_seen: number | null
}

const SCHEMA = `
create table if not exists surfaces(
  id text primary key, type text not null, name text not null,
  token_hash text not null unique, paired_at integer not null, last_seen integer);
create table if not exists pairings(
  id text primary key, code text not null, type text not null, name text not null,
  created_at integer not null, expires_at integer not null,
  approved_surface_id text, token_plain text, claimed integer not null default 0);
create table if not exists events(
  id text primary key, request_id text not null unique, type text not null, sub_type text,
  device_id text not null, ring_ts integer not null, received_at integer not null,
  origin text not null, decision text not null,
  image_path text, image_source text, image_error text, acked_at integer, acked_by text);
create table if not exists deliveries(
  event_id text not null, surface_id text not null, sent_at integer not null,
  rendered_at integer, primary key(event_id, surface_id));
create table if not exists settings(key text primary key, value text not null);
`

const g = globalThis as unknown as { __dsDb?: DatabaseSync }

export function db(): DatabaseSync {
  if (!g.__dsDb) {
    const file = config.dbFile ?? path.join(config.dataDir, 'doorsignal.db')
    if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true })
    const d = new DatabaseSync(file)
    d.exec('pragma journal_mode = wal;')
    d.exec(SCHEMA)
    // Columns added after the first release: add them to databases created earlier.
    const cols = new Set((d.prepare('pragma table_info(events)').all() as { name: string }[]).map((c) => c.name))
    for (const c of ['description', 'description_source']) if (!cols.has(c)) d.exec(`alter table events add column ${c} text`)
    g.__dsDb = d
  }
  return g.__dsDb
}

/** Test helper: drop the singleton so each test gets a fresh database. */
export function resetDbForTests() {
  g.__dsDb?.close()
  g.__dsDb = undefined
}

// ---------- events ----------

/** Inserts an event; returns false if this request_id or event id was already processed. */
export function insertEvent(e: Omit<EventRow, 'image_path' | 'image_source' | 'image_error' | 'acked_at' | 'acked_by'>): boolean {
  const r = db()
    .prepare(
      `insert or ignore into events(id, request_id, type, sub_type, device_id, ring_ts, received_at, origin, decision)
       values(?,?,?,?,?,?,?,?,?)`,
    )
    .run(e.id, e.request_id, e.type, e.sub_type, e.device_id, e.ring_ts, e.received_at, e.origin, e.decision)
  return r.changes === 1
}

export function getEvent(id: string): EventRow | undefined {
  return db().prepare('select * from events where id = ?').get(id) as EventRow | undefined
}

export function listEvents(limit = 50): EventRow[] {
  return db().prepare('select * from events order by received_at desc limit ?').all(limit) as unknown as EventRow[]
}

export function setEventImage(id: string, imagePath: string | null, source: string | null, error: string | null) {
  db().prepare('update events set image_path = ?, image_source = ?, image_error = ? where id = ?').run(imagePath, source, error, id)
}

/** Marks an event acknowledged; returns false if it was already acknowledged or does not exist. */
export function setEventDescription(id: string, text: string | null, source: string | null) {
  db().prepare('update events set description = ?, description_source = ? where id = ?').run(text, source, id)
}

export function ackEvent(id: string, by: string, at = Date.now()): boolean {
  return db().prepare('update events set acked_at = ?, acked_by = ? where id = ? and acked_at is null').run(at, by, id).changes === 1
}

export function recordDelivery(eventId: string, surfaceId: string, at = Date.now()) {
  db().prepare('insert or ignore into deliveries(event_id, surface_id, sent_at) values(?,?,?)').run(eventId, surfaceId, at)
}

export function recordRendered(eventId: string, surfaceId: string, at = Date.now()) {
  db().prepare('update deliveries set rendered_at = coalesce(rendered_at, ?) where event_id = ? and surface_id = ?').run(at, eventId, surfaceId)
}

export function deliveriesFor(eventId: string) {
  return db()
    .prepare(
      `select d.surface_id, s.name, s.type, d.sent_at, d.rendered_at from deliveries d
       left join surfaces s on s.id = d.surface_id where d.event_id = ?`,
    )
    .all(eventId) as unknown as { surface_id: string; name: string; type: string; sent_at: number; rendered_at: number | null }[]
}

// ---------- surfaces & pairing ----------

export function insertPairing(p: { id: string; code: string; type: SurfaceType; name: string; ttlMs: number }) {
  const now = Date.now()
  db().prepare('insert into pairings(id, code, type, name, created_at, expires_at) values(?,?,?,?,?,?)').run(p.id, p.code, p.type, p.name, now, now + p.ttlMs)
}

export function getPairing(id: string) {
  return db().prepare('select * from pairings where id = ?').get(id) as
    | { id: string; code: string; type: SurfaceType; name: string; expires_at: number; approved_surface_id: string | null; token_plain: string | null; claimed: number }
    | undefined
}

export function pendingPairings() {
  return db()
    .prepare('select id, code, type, name, expires_at from pairings where approved_surface_id is null and expires_at > ? order by created_at desc')
    .all(Date.now()) as unknown as { id: string; code: string; type: SurfaceType; name: string; expires_at: number }[]
}

export function findPendingByCode(code: string) {
  return db().prepare('select * from pairings where code = ? and approved_surface_id is null and expires_at > ?').get(code, Date.now()) as
    | { id: string; type: SurfaceType; name: string }
    | undefined
}

/** Approves a pairing and creates the surface. The plain token is held only until the surface claims it once. */
export function approvePairing(pairingId: string, surface: { id: string; tokenPlain: string; tokenHash: string; type: SurfaceType; name: string }) {
  const d = db()
  d.prepare('insert into surfaces(id, type, name, token_hash, paired_at) values(?,?,?,?,?)').run(surface.id, surface.type, surface.name, surface.tokenHash, Date.now())
  d.prepare('update pairings set approved_surface_id = ?, token_plain = ? where id = ?').run(surface.id, surface.tokenPlain, pairingId)
}

export function claimPairingToken(pairingId: string): string | null {
  const p = getPairing(pairingId)
  if (!p || !p.approved_surface_id || p.claimed || !p.token_plain) return null
  db().prepare('update pairings set claimed = 1, token_plain = null where id = ?').run(pairingId)
  return p.token_plain
}

export function surfaceByTokenHash(hash: string): SurfaceRow | undefined {
  return db().prepare('select * from surfaces where token_hash = ?').get(hash) as SurfaceRow | undefined
}

export function touchSurface(id: string) {
  db().prepare('update surfaces set last_seen = ? where id = ?').run(Date.now(), id)
}

export function listSurfaces(): SurfaceRow[] {
  return db().prepare('select id, type, name, paired_at, last_seen from surfaces order by paired_at').all() as unknown as SurfaceRow[]
}

export function removeSurface(id: string) {
  db().prepare('delete from surfaces where id = ?').run(id)
}

// ---------- settings ----------

export function getSetting(key: string): string | undefined {
  const r = db().prepare('select value from settings where key = ?').get(key) as { value: string } | undefined
  return r?.value
}

export function setSetting(key: string, value: string) {
  db().prepare('insert into settings(key, value) values(?,?) on conflict(key) do update set value = excluded.value').run(key, value)
}

// ---------- deletion & retention ----------

export function imagesDir() {
  return path.join(config.dataDir, 'images')
}

/** "Delete my data": removes every event, delivery record and stored image. */
export function deleteAllEventData() {
  const d = db()
  d.exec('delete from deliveries; delete from events;')
  rmSync(imagesDir(), { recursive: true, force: true })
}

/** Retention: deletes alert images older than the TTL and clears their references. Returns the count removed. */
export function deleteExpiredImages(olderThanMs: number): number {
  const rows = db()
    .prepare('select id, image_path from events where image_path is not null and received_at < ?')
    .all(Date.now() - olderThanMs) as unknown as { id: string; image_path: string }[]
  for (const r of rows) {
    rmSync(r.image_path, { force: true })
    db().prepare("update events set image_path = null, image_error = 'deleted after retention period' where id = ?").run(r.id)
  }
  return rows.length
}
