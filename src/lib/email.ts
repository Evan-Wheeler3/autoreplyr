import { Resend } from 'resend'
import type { Lead } from '@/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://autoreplyr.com'

const PROVIDER_SETUP: Record<string, { label: string; steps: string[]; docsUrl: string }> = {
  yeastar: {
    label: 'Yeastar / 4-Voice',
    docsUrl: 'https://help.yeastar.com/en/p-series-cloud-edition/event-list/30012-call-end-details.html',
    steps: [
      'Log into your Yeastar / 4-Voice admin portal.',
      'Navigate to <strong>Settings → Integration → Webhooks</strong>.',
      `Add this webhook URL: <code>${APP_URL}/api/webhooks/yeastar</code>`,
      'Subscribe to event <strong>30012 (Call End Details)</strong>.',
      'Save and enable the webhook.',
      'Ensure outbound SMS is enabled for your phone number in the Yeastar SMS settings.',
    ],
  },
  openphone: {
    label: 'OpenPhone / Quo',
    docsUrl: 'https://www.openphone.com/docs/api-reference',
    steps: [
      'Log into your OpenPhone web app at app.openphone.com.',
      'Go to <strong>Settings → Integrations → API</strong>.',
      'Create an API key with <strong>read + write</strong> access.',
      'Go to <strong>Settings → Integrations → Webhooks</strong>.',
      `Add this webhook URL: <code>${APP_URL}/api/webhooks/openphone</code>`,
      'Subscribe to <strong>call.completed</strong> and <strong>message.received</strong> events.',
    ],
  },
  ringcentral: {
    label: 'RingCentral',
    docsUrl: 'https://developers.ringcentral.com/guide/notifications/webhooks',
    steps: [
      'Go to your dashboard and click <strong>Connect RingCentral</strong> in the Phone System section.',
      'You will be redirected to RingCentral to authorize AutoReplyr.',
      'Once connected, AutoReplyr will start capturing missed calls automatically.',
    ],
  },
  aircall: {
    label: 'Aircall',
    docsUrl: 'https://developer.aircall.io/api-references/webhooks',
    steps: [
      'Log into your Aircall Dashboard at dashboard.aircall.io.',
      'Go to <strong>Integrations → API Keys</strong> and create a key.',
      'Go to <strong>Integrations → Webhooks</strong>.',
      `Add this webhook URL: <code>${APP_URL}/api/webhooks/aircall</code>`,
      'Subscribe to the <strong>call.ended</strong> event.',
    ],
  },
  dialpad: {
    label: 'Dialpad',
    docsUrl: 'https://developers.dialpad.com/reference/webhooks',
    steps: [
      'Log into Dialpad at dialpad.com.',
      'Go to <strong>Admin → Integrations → Webhooks</strong>.',
      `Add this webhook URL: <code>${APP_URL}/api/webhooks/dialpad</code>`,
      'Subscribe to the <strong>Inbound Hangup</strong> event.',
    ],
  },
  zoomphone: {
    label: 'Zoom Phone',
    docsUrl: 'https://developers.zoom.us/docs/api/phone/',
    steps: [
      'Go to your dashboard and click <strong>Connect Zoom Phone</strong> in the Phone System section.',
      'You will be redirected to Zoom to authorize AutoReplyr.',
      'Once connected, AutoReplyr will start capturing missed calls automatically.',
    ],
  },
  gotoconnect: {
    label: 'GoTo Connect',
    docsUrl: 'https://developer.goto.com/GoToConnect/',
    steps: [
      'Go to your dashboard and click <strong>Connect GoTo Connect</strong> in the Phone System section.',
      'You will be redirected to GoTo to authorize AutoReplyr.',
      'Once connected, AutoReplyr will start capturing missed calls automatically.',
    ],
  },
  '8x8': {
    label: '8x8',
    docsUrl: 'https://developer.8x8.com/',
    steps: [
      'Log into your 8x8 Admin Console.',
      'Go to <strong>Settings → API & Webhooks</strong>.',
      `Add this webhook URL: <code>${APP_URL}/api/webhooks/8x8</code>`,
      'Subscribe to missed call alerts.',
    ],
  },
  nextiva: {
    label: 'Nextiva',
    docsUrl: 'https://developer.nextiva.com/',
    steps: [
      'Log into your Nextiva admin portal.',
      'Go to <strong>Settings → Webhooks</strong>.',
      `Add this webhook URL: <code>${APP_URL}/api/webhooks/nextiva</code>`,
      'Subscribe to <strong>New Missed Call</strong> events.',
    ],
  },
  justcall: {
    label: 'JustCall',
    docsUrl: 'https://developers.justcall.io/docs/webhooks',
    steps: [
      'Log into JustCall at app.justcall.io.',
      'Go to <strong>Settings → Webhooks</strong>.',
      `Add this webhook URL: <code>${APP_URL}/api/webhooks/justcall</code>`,
      'Subscribe to the <strong>Missed Call</strong> webhook event.',
    ],
  },
  kixie: {
    label: 'Kixie',
    docsUrl: 'https://help.kixie.com/en/articles/webhooks',
    steps: [
      'Log into Kixie at app.kixie.com.',
      'Go to <strong>Settings → Webhooks</strong>.',
      `Add this webhook URL: <code>${APP_URL}/api/webhooks/kixie</code>`,
      'Subscribe to the <strong>endcall</strong> event.',
    ],
  },
  cloudtalk: {
    label: 'CloudTalk',
    docsUrl: 'https://support.cloudtalk.io/hc/en-us/articles/webhooks',
    steps: [
      'Log into CloudTalk at app.cloudtalk.io.',
      'Go to <strong>Settings → Webhooks</strong>.',
      `Add this webhook URL: <code>${APP_URL}/api/webhooks/cloudtalk</code>`,
      'Subscribe to the <strong>call.missed</strong> event.',
    ],
  },
  microsoft_teams: {
    label: 'Microsoft Teams Phone',
    docsUrl: 'https://learn.microsoft.com/en-us/microsoftteams/phone-system-overview',
    steps: [
      'A member of the AutoReplyr team will configure your Teams Phone integration within 24 hours.',
      'You will receive a follow-up email with next steps.',
    ],
  },
}

export async function sendSetupEmail({
  toEmail,
  ownerName,
  businessName,
  voipProvider,
  providerPhoneNumber,
}: {
  toEmail: string
  ownerName: string
  businessName: string
  voipProvider: string | null
  providerPhoneNumber: string | null
}) {
  const resend = getResend()
  const providerInfo = voipProvider ? PROVIDER_SETUP[voipProvider] : null
  const loginUrl = `${APP_URL}/login`

  const setupHtml = providerInfo
    ? `
      <h3>Setup steps for ${providerInfo.label}</h3>
      <ol style="font-size:14px;line-height:1.8;">
        ${providerInfo.steps.map((s) => `<li>${s}</li>`).join('')}
      </ol>
      <p style="font-size:13px;color:#666;">
        <a href="${providerInfo.docsUrl}">Official ${providerInfo.label} documentation →</a>
      </p>
    `
    : `<p>Our team will reach out with setup instructions for your phone system.</p>`

  await resend.emails.send({
    from: 'AutoReplyr <hello@autoreplyr.com>',
    to: toEmail,
    subject: `Your AutoReplyr account is ready — complete your setup`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #111;">
        <h2 style="color: #1B2A4A;">Hi ${ownerName},</h2>
        <p>Your AutoReplyr account for <strong>${businessName}</strong> is active. Complete the 5-minute setup below and you'll start capturing missed calls automatically.</p>
        ${providerPhoneNumber ? `<p><strong>Your business number:</strong> ${providerPhoneNumber}</p>` : ''}
        ${setupHtml}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p>Once setup is complete, any missed call to your number will trigger an automated SMS conversation — and qualified leads will appear in your dashboard.</p>
        <p>
          <a href="${loginUrl}" style="background:#1B2A4A;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">View your dashboard →</a>
        </p>
        <p style="color:#666;font-size:13px;margin-top:32px;">
          Questions? Reply to this email or contact <a href="mailto:evan@velza.com">evan@velza.com</a>.
        </p>
      </div>
    `,
  })
}

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('Missing RESEND_API_KEY')
  return new Resend(key)
}

export async function sendWelcomeEmail({
  toEmail,
  ownerName,
  businessName,
  tempPassword,
}: {
  toEmail: string
  ownerName: string
  businessName: string
  tempPassword: string
}) {
  const resend = getResend()
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://autoreplyr.com'}/login`

  await resend.emails.send({
    from: 'autoreplyr <hello@autoreplyr.com>',
    to: toEmail,
    subject: 'Your autoreplyr system is live',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
        <h2 style="color: #1d4ed8;">Hi ${ownerName},</h2>
        <p>Your autoreplyr system for <strong>${businessName}</strong> is live and ready to go.</p>
        <p>From now on, when you miss a call, your caller will automatically receive an SMS starting a conversation. High-urgency leads will alert you immediately.</p>
        <h3>Your login details:</h3>
        <p><strong>Email:</strong> ${toEmail}<br>
        <strong>Password:</strong> ${tempPassword}</p>
        <p><a href="${loginUrl}" style="background: #1d4ed8; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 8px;">View your dashboard →</a></p>
        <p style="color: #666; font-size: 13px; margin-top: 32px;">You'll receive a weekly email every Monday showing what was captured. You don't need to log in regularly — we'll keep you posted.</p>
        <p style="color: #666; font-size: 13px;">Questions? Reply to this email.</p>
      </div>
    `,
  })
}

export async function sendHighIntentAlert({
  toEmail,
  businessName,
  callerNumber,
  transcript,
}: {
  toEmail: string
  businessName: string
  callerNumber: string
  transcript: Lead['transcript']
}) {
  const resend = getResend()

  const transcriptHtml = transcript
    .map(
      (m) =>
        `<tr><td style="padding:4px 8px;color:${m.direction === 'outbound' ? '#1d4ed8' : '#111'};font-weight:${m.direction === 'outbound' ? 'bold' : 'normal'}">${m.direction === 'outbound' ? 'Bot' : 'Caller'}</td><td style="padding:4px 8px">${m.body}</td></tr>`
    )
    .join('')

  await resend.emails.send({
    from: 'autoreplyr <alerts@autoreplyr.com>',
    to: toEmail,
    subject: `🔴 Urgent lead — ${businessName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
        <h2 style="color: #dc2626;">Urgent lead captured</h2>
        <p><strong>Business:</strong> ${businessName}<br>
        <strong>Caller:</strong> ${callerNumber}<br>
        <strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <h3>Conversation so far:</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${transcriptHtml}
        </table>
        <p style="color:#666;font-size:13px;margin-top:24px;">This caller was scored as high intent. Call them back ASAP.</p>
      </div>
    `,
  })
}

export async function sendWeeklyReport({
  toEmail,
  ownerName,
  businessName,
  leadsThisWeek,
  highIntentLeads,
}: {
  toEmail: string
  ownerName: string
  businessName: string
  leadsThisWeek: Lead[]
  highIntentLeads: Lead[]
}) {
  const resend = getResend()

  const statusCounts = leadsThisWeek.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1
    return acc
  }, {})

  const statusRows = Object.entries(statusCounts)
    .map(([s, c]) => `<tr><td style="padding:4px 8px;text-transform:capitalize">${s.replace('_', ' ')}</td><td style="padding:4px 8px;font-weight:bold">${c}</td></tr>`)
    .join('')

  const highIntentRows = highIntentLeads
    .map(
      (l) =>
        `<tr><td style="padding:4px 8px;font-family:monospace">${l.caller_number}</td><td style="padding:4px 8px;font-size:13px;color:#666">${(l.transcript ?? []).filter((m) => m.direction === 'inbound').map((m) => m.body).join(' | ').slice(0, 120)}</td></tr>`
    )
    .join('')

  const encouragement =
    leadsThisWeek.length > 0
      ? `You captured <strong>${leadsThisWeek.length} lead${leadsThisWeek.length > 1 ? 's' : ''}</strong> this week that would have been missed calls. Keep it up!`
      : `No missed calls this week — looks like business is good! autoreplyr is standing by.`

  await resend.emails.send({
    from: 'autoreplyr <reports@autoreplyr.com>',
    to: toEmail,
    subject: `Your autoreplyr weekly report — ${businessName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
        <h2 style="color: #1d4ed8;">Weekly report for ${businessName}</h2>
        <p>${encouragement}</p>

        <h3>Leads by status</h3>
        ${statusRows ? `<table style="width:100%;border-collapse:collapse;font-size:14px;">${statusRows}</table>` : '<p style="color:#666">No leads this week.</p>'}

        ${
          highIntentLeads.length > 0
            ? `<h3 style="color:#dc2626;">High intent leads (${highIntentLeads.length})</h3>
               <table style="width:100%;border-collapse:collapse;font-size:14px;">${highIntentRows}</table>`
            : ''
        }

        <p style="color:#666;font-size:13px;margin-top:32px;">
          This report covers the past 7 days. You'll receive the next one next Monday.<br>
          — autoreplyr
        </p>
      </div>
    `,
  })
}
