import Link from 'next/link'

export default function OnboardingSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-6">✓</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">You&apos;re all set!</h1>
        <p className="text-gray-600 mb-2">
          Check your email for setup instructions tailored to your phone system.
        </p>
        <p className="text-gray-600 mb-8">
          Once the 5-minute setup is complete, AutoReplyr will start capturing missed calls automatically.
        </p>
        <Link
          href="/login"
          className="inline-block bg-[#1B2A4A] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#243761] transition-colors"
        >
          Go to your dashboard →
        </Link>
        <p className="text-sm text-gray-400 mt-6">
          Questions? Visit <a href="https://autoreplyr.com" className="underline">autoreplyr.com</a>
        </p>
      </div>
    </div>
  )
}
