export const metadata = { title: 'Privacy Policy — autoreplyr' }

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 prose prose-gray">
      <h1>Privacy Policy</h1>
      <p><strong>Effective date:</strong> April 28, 2026</p>

      <h2>1. Who we are</h2>
      <p>autoreplyr ("we", "us") provides an automated SMS follow-up service for local service businesses. Our website is https://autoreplyr.vercel.app.</p>

      <h2>2. Information we collect</h2>
      <p>We collect the phone number of callers who miss a call with one of our clients, and any SMS messages exchanged during the follow-up conversation. We do not collect names, email addresses, or payment information from callers.</p>

      <h2>3. How we use information</h2>
      <p>Caller phone numbers and conversation transcripts are used solely to facilitate the SMS follow-up conversation and to notify the business owner of qualified leads. We do not sell or share this information with third parties for marketing purposes.</p>

      <h2>4. SMS consent</h2>
      <p>Callers receive an initial SMS after a missed call. The first message asks for explicit opt-in consent before the conversation continues. Callers may opt out at any time by replying STOP.</p>

      <h2>5. Data retention</h2>
      <p>Conversation records are retained for up to 12 months and then deleted. Business clients may request deletion of their data at any time.</p>

      <h2>6. Contact</h2>
      <p>Questions about this policy: <a href="mailto:evan@velza.com">evan@velza.com</a></p>
    </main>
  )
}
