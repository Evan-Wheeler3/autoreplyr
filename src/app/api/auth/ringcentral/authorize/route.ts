/**
 * GET /api/auth/ringcentral/authorize?client_id=...
 *
 * Redirects the user to RingCentral's OAuth consent page.
 * The `client_id` query param identifies which AutoReplyr client is connecting.
 * It's passed through as `state` so the callback can complete the setup.
 */

import { buildAuthUrl } from '@/lib/providers/ringcentral'
import { env } from '@/lib/env'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('client_id')

  if (!clientId) {
    return NextResponse.json({ error: 'client_id required' }, { status: 400 })
  }

  const redirectUri = `${env.appUrl()}/api/auth/ringcentral/callback`
  const authUrl = buildAuthUrl(redirectUri, clientId)

  return NextResponse.redirect(authUrl)
}
