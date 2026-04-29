import { Resend } from 'resend'
import type { Lead } from '@/types'

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
