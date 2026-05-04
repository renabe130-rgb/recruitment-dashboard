import { targetStore, Targets } from '@/lib/store'

export async function GET() {
  return Response.json(targetStore.get())
}

export async function POST(request: Request) {
  const body: Targets = await request.json()
  targetStore.set(body)
  return Response.json({ ok: true })
}
