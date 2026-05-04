import { naStore } from '@/lib/store'

export async function GET() {
  return Response.json(await naStore.getAll())
}

export async function POST(request: Request) {
  const body = await request.json()
  const item = await naStore.add({
    assignee: body.assignee ?? '',
    action: body.action ?? '',
    quantity: body.quantity ?? '',
    deadline: body.deadline ?? '',
    isValid: body.isValid ?? false,
    raw: body.raw ?? '',
  })
  if (!item) return Response.json({ error: 'failed to create' }, { status: 500 })
  return Response.json(item, { status: 201 })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })
  const ok = await naStore.remove(id)
  return Response.json({ ok })
}
