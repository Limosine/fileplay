import type { Cookies } from '@sveltejs/kit'
import { B64ToBuffer, bufferToB64 } from './utils'
import { neode } from './db'

export function genSecretB64(): string {
  // 64 length b64 string
  return bufferToB64(Buffer.from(crypto.getRandomValues(new Uint8Array(32)).join('')))
}

export async function hashB64(b64: string): Promise<string> {
  return bufferToB64(Buffer.from(await crypto.subtle.digest('SHA-256', B64ToBuffer(b64))))
}


/**
 * return the id of the authenticated client device
 */
export async function getAuthenticatedDeviceId(cookies: Cookies): Promise<string | undefined> {
  const id = cookies.get('id')
  const auth = cookies.get('auth')
  if (!id || !auth) {
    return
  }
  const device = await neode.find('Device', id)
  if (!device) {
    return
  }
  if ((await hashB64(auth)) === device.get('authHash')) {
    return device.get('id')
  }
  return
}
