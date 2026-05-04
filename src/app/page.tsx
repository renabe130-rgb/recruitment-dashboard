'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length !== 4) return
    setLoading(true)
    setError(false)

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pin }),
    })

    if (res.ok) {
      router.push('/dashboard')
    } else {
      setError(true)
      setPin('')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-sm text-center">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">採用ダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-1">4桁のパスワードを入力してください</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            className="w-full text-center text-3xl tracking-widest border-2 rounded-xl p-3 focus:outline-none focus:border-blue-500 transition-colors"
            autoFocus
          />

          {error && (
            <p className="text-red-500 text-sm">パスワードが違います</p>
          )}

          <button
            type="submit"
            disabled={pin.length !== 4 || loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors"
          >
            {loading ? '確認中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </main>
  )
}
