import { config } from './config'
import { getSetting, setSetting } from './store'

export type Mode = 'live' | 'replay'

export function currentMode(): Mode {
  const m = getSetting('mode')
  return m === 'live' || m === 'replay' ? m : config.defaultMode
}

export function setMode(m: Mode) {
  setSetting('mode', m)
}

export function configuredDevice(): { id: string; name: string } | undefined {
  const id = getSetting('device_id')
  return id ? { id, name: getSetting('device_name') ?? id } : undefined
}
