/**
 * GET /api/auth/zoomphone/authorize?client_id=...
 *
 * Redirects the user to Zoom's OAuth consent page.
 * `client_id` is the AutoReplyr client ID, passed as `state`.
 */

import { buildAuthUrl } from '@/lib/providers/zoomphone'
import { env } from '@/lib/env'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('client_id')

  if (!clientId) {
    return NextResponse.json({ error: 'client_id required' }, { status: 400 })
  }

  const redirectUri = `${env.appUrl()}/api/auth/zoomphone/callback`
  const authUrl = buildAuthUrl(redirectUri, clientId)

  return NextResponse.redirect(authUrl)
}
