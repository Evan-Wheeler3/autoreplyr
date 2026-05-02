import Link from 'next/link'
import { Suspense } from 'react'
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-sm text-gray-400 hover:text-gray-600 mb-8 transition-colors">
          ← Back to home
        </Link>
        <h1 className="text-2xl font-bold mb-2 text-center">autoreplyr</h1>
        <p className="text-gray-500 text-sm text-center mb-8">Sign in to your account</p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
