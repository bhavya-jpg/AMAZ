// Event pipeline: runs after the webhook has already answered 200.
//   policy → immediate alert fan-out → image acquisition → image update
import { signedImagePath } from './auth'
import { broadcast } from './hub'
import { acquireImage } from './media'
import { configuredDevice } from './mode'
import { config } from './config'
import { deleteExpiredImages, setEventImage, type EventRow } from './store'

export function timelineEntry(ev: EventRow) {
  return {
    id: ev.id,
    type: ev.type,
    sub_type: ev.sub_type,
    decision: ev.decision,
    origin: ev.origin,
    received_at: ev.received_at,
    has_image: Boolean(ev.image_path),
    image_url: ev.image_path ? signedImagePath(ev.id) : null,
    image_source: ev.image_source,
    image_error: ev.image_error,
    acked_at: ev.acked_at,
    acked_by: ev.acked_by,
  }
}

export async function processEvent(ev: EventRow) {
  deleteExpiredImages(config.imageTtlMinutes * 60_000)
  broadcast({ event: 'event', data: timelineEntry(ev) })
  if (ev.decision === 'log') return

  const device = configuredDevice()
  broadcast({
    event: 'alert',
    data: {
      event_id: ev.id,
      kind: ev.decision,
      device_name: device?.id === ev.device_id ? device.name : 'Front door',
      at: ev.received_at,
      origin: ev.origin,
      image_url: null,
      image_source: null,
    },
  })

  const img = await acquireImage(ev)
  setEventImage(ev.id, img.path, img.source, img.error)
  broadcast({
    event: 'update',
    data: {
      event_id: ev.id,
      image_url: img.path ? signedImagePath(ev.id) : null,
      image_source: img.source,
      image_error: img.error,
    },
  })
  broadcast({ event: 'event', data: timelineEntry({ ...ev, image_path: img.path, image_source: img.source, image_error: img.error }) })
}
