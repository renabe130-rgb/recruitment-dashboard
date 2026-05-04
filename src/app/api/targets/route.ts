import { targetStore, Targets } from '@/lib/store'

export async function GET() {
  return Response.json(await targetStore.get())
}

export async function POST(request: Request) {
  const body: Targets = await request.json()
  const ok = await targetStore.set(body)
  return Response.json({ ok })
}
