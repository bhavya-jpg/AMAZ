// The core rule of DoorSignal: a doorbell press is a door alert; motion never is.
export type Decision = 'door' | 'badge' | 'log'

export function decide(type: string, subType?: string): Decision {
  if (type === 'button_press') return 'door'
  if (type === 'motion_detected' && subType === 'human') return 'badge'
  return 'log'
}
