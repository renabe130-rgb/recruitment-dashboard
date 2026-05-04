import { naStore, NAItem } from '@/lib/store'
import { randomUUID } from 'crypto'

export async function GET() {
  return Response.json(naStore.getAll())
}

export async function POST(request: Request) {
  const body = await request.json()
  const item: NAItem = {
    id: randomUUID(),
    assignee: body.assignee ?? '',
    action: body.action ?? '',
    quantity: body.quantity ?? '',
    deadline: body.deadline ?? '',
    isValid: body.isValid ?? false,
    raw: body.raw ?? '',
    createdAt: new Date().toISOString(),
  }
  naStore.add(item)
  return Response.json(item, { status: 201 })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })
  naStore.remove(id)
  return Response.json({ ok: true })
}
