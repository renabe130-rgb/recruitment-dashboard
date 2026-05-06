import { finalStageStore, FinalStageStep } from '@/lib/store'

const STEPS: FinalStageStep[] = ['finalInterview', 'offered', 'offerAccepted']

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  if (!month) return Response.json({ error: 'month required' }, { status: 400 })
  const items = await finalStageStore.listByMonth(month, false)
  return Response.json(items)
}

export async function POST(request: Request) {
  const body = await request.json()
  if (!body.candidateName || !body.groupName || !body.currentStep || !body.month) {
    return Response.json({ error: 'candidateName, groupName, currentStep, month are required' }, { status: 400 })
  }
  if (!STEPS.includes(body.currentStep)) {
    return Response.json({ error: 'invalid currentStep' }, { status: 400 })
  }
  const item = await finalStageStore.addManual({
    candidateName: body.candidateName,
    groupName: body.groupName,
    currentStep: body.currentStep,
    month: body.month,
    nextSchedule: body.nextSchedule ?? null,
    offerDeadline: body.offerDeadline ?? null,
    joinDate: body.joinDate ?? null,
    notes: body.notes ?? '',
  })
  if (!item) return Response.json({ error: 'failed to create' }, { status: 500 })
  return Response.json(item, { status: 201 })
}

export async function PATCH(request: Request) {
  const body = await request.json()
  const { candidacyId, action, ...patch } = body
  if (!candidacyId) return Response.json({ error: 'candidacyId required' }, { status: 400 })

  if (action === 'hide')   return Response.json({ ok: await finalStageStore.hide(candidacyId) })
  if (action === 'unhide') return Response.json({ ok: await finalStageStore.unhide(candidacyId) })

  // currentStep のバリデーション
  if (patch.currentStep && !STEPS.includes(patch.currentStep)) {
    return Response.json({ error: 'invalid currentStep' }, { status: 400 })
  }
  const ok = await finalStageStore.update(candidacyId, patch)
  return Response.json({ ok })
}
