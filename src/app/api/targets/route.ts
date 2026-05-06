import { monthlyTargetStore, Targets } from '@/lib/store'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const month = url.searchParams.get('month')
  if (!month) return Response.json({ error: 'month required (e.g. ?month=2026-05)' }, { status: 400 })
  return Response.json(await monthlyTargetStore.get(month))
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  const month = url.searchParams.get('month')
  if (!month) return Response.json({ error: 'month required' }, { status: 400 })
  const body: Targets = await request.json()
  const ok = await monthlyTargetStore.set(month, body)
  return Response.json({ ok })
}
