export const metadata = { title: 'Terms of Service — autoreplyr' }

export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 prose prose-gray">
      <h1>Terms of Service</h1>
      <p><strong>Effective date:</strong> April 28, 2026</p>

      <h2>1. Service description</h2>
      <p>autoreplyr provides automated SMS follow-up sequences triggered by missed phone calls on behalf of local service businesses ("clients"). By interacting with our SMS system you agree to these terms.</p>

      <h2>2. SMS messaging</h2>
      <p>Message and data rates may apply. Message frequency varies. You will not receive marketing messages without first providing explicit consent. Reply STOP at any time to opt out. Reply HELP for help.</p>

      <h2>3. Opt-out</h2>
      <p>You may opt out of receiving SMS messages at any time by replying STOP. After opting out you will receive one confirmation message and no further messages.</p>

      <h2>4. Limitation of liability</h2>
      <p>autoreplyr is not responsible for missed or delayed messages due to carrier issues. The service is provided "as is" without warranties of any kind.</p>

      <h2>5. Contact</h2>
      <p>Questions about these terms: <a href="mailto:evan@velza.com">evan@velza.com</a></p>
    </main>
  )
}
