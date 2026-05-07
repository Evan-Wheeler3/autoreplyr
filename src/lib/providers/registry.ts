/**
 * Provider registry — maps voip_provider column values to Provider instances.
 *
 * Webhook handlers and the Stripe webhook handler import from here instead of
 * referencing individual provider files directly. This keeps all provider
 * wiring in one place and makes it trivial to add new providers.
 */

import type { Provider } from './types'
import { openphone } from './openphone'
import { aircall } from './aircall'
import { dialpad } from './dialpad'
// Future providers are added here as they are built:
// import { ringcentral } from './ringcentral'
// import { dialpad } from './dialpad'
// import { justcall } from './justcall'
// import { kixie } from './kixie'
// import { eightx8 } from './8x8'
// import { zoom } from './zoom'

const REGISTRY: Record<string, Provider> = {
  openphone,
  aircall,
  dialpad,
  // ringcentral,
  // aircall,
  // dialpad,
  // justcall,
  // kixie,
  // '8x8': eightx8,
  // zoom_phone: zoom,
}

/**
 * Returns the Provider implementation for the given voip_provider value,
 * or null if the provider is not yet registered.
 */
export function getProvider(voipProvider: string): Provider | null {
  return REGISTRY[voipProvider] ?? null
}
