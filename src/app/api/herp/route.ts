import { mockKPI, mockSchedule } from '@/lib/mock-data'
import { buildKPISummary, getRequisitionGroups, getAllRequisitions, ALLOWED_GROUPS } from '@/lib/herp'
import { kpiCacheStore, finalStageStore } from '@/lib/store'

const HERP_API_KEY = process.env.HERP_API_KEY
const CACHE_TTL_MS = 24 * 60 * 60 * 1000  // 24時間（強制更新で上書き可）

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  // schedule は今のところモック
  if (type === 'schedule') {
    return Response.json({ source: HERP_API_KEY ? 'mock-fallback' : 'mock', data: mockSchedule })
  }

  // 確認用: HERP に登録されている職種グループ一覧を返す
  if (type === 'groups') {
    if (!HERP_API_KEY) return Response.json({ source: 'mock', groups: [] })
    const groups = await getRequisitionGroups()
    return Response.json({ source: 'herp', groups })
  }

  // 確認用: 求人と職種グループの紐付け状況
  if (type === 'debug') {
    if (!HERP_API_KEY) return Response.json({ error: 'no key' })
    const [groups, requisitions] = await Promise.all([
      getRequisitionGroups(),
      getAllRequisitions(),
    ])
    const groupIdToName = new Map(groups.map(g => [g.id, g.name]))
    const allowedSet = new Set<string>(ALLOWED_GROUPS)
    const byGroup: Record<string, number> = {}
    let allowedCount = 0
    let noneCount = 0
    requisitions.forEach(r => {
      if (!('requisitionGroupId' in r) || !r.requisitionGroupId) {
        noneCount++
        byGroup['(グループ未設定)'] = (byGroup['(グループ未設定)'] ?? 0) + 1
        return
      }
      const name = groupIdToName.get(r.requisitionGroupId as string) ?? '(不明なID)'
      byGroup[name] = (byGroup[name] ?? 0) + 1
      if (allowedSet.has(name)) allowedCount++
    })
    return Response.json({
      source: 'herp',
      totalRequisitions: requisitions.length,
      requisitionsWithoutGroup: noneCount,
      allowedRequisitions: allowedCount,
      byGroup,
    })
  }

  // type=kpi (or default)
  if (!HERP_API_KEY) {
    return Response.json({ source: 'mock', data: mockKPI })
  }

  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const month = searchParams.get('month') ?? defaultMonth
  const force = searchParams.get('force') === 'true'

  // キャッシュ確認 (force=true でなければ)
  if (!force) {
    const cached = await kpiCacheStore.get(month)
    if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS) {
      const counts = await finalStageStore.countByMonth(month)
      const data = cached.data as Record<string, unknown>
      const overlay = {
        ...data,
        finalInterview: { ...(data.finalInterview as object), total: counts.finalInterview, byGroup: (data.finalInterview as { byGroup: Record<string, number> }).byGroup },
        offered:        { ...(data.offered as object),        total: counts.offered,        byGroup: (data.offered as { byGroup: Record<string, number> }).byGroup },
        offerAccepted:  { ...(data.offerAccepted as object),  total: counts.offerAccepted,  byGroup: (data.offerAccepted as { byGroup: Record<string, number> }).byGroup },
      }
      return Response.json({ source: 'cache', month, data: overlay, cachedAt: cached.fetchedAt })
    }
    // キャッシュなし & 強制更新でない → 未集計を返す（自動でHERPに取りにいかない）
    return Response.json({ source: 'no-cache', month, data: null })
  }

  // HERP から集計（force=true 時のみ）
  try {
    const summary = await buildKPISummary(month)

    // final 以降の候補者を Supabase に upsert
    await Promise.all(
      summary.finalStageFromHerp.map(c =>
        finalStageStore.upsertFromHerp({
          candidacyId: c.candidacyId,
          month,
          candidateName: c.candidateName,
          groupName: c.groupName,
          currentStep: c.currentStep,
        })
      )
    )

    // 最終選考以降の数値を表示中の final_stage_candidates から再集計
    const counts = await finalStageStore.countByMonth(month)
    summary.finalInterview.total = counts.finalInterview
    summary.offered.total = counts.offered
    summary.offerAccepted.total = counts.offerAccepted

    // キャッシュ保存（finalStageFromHerp は再集計の元なので保存対象から除外してサイズ削減）
    const { finalStageFromHerp: _omit, ...cacheable } = summary
    void _omit
    await kpiCacheStore.set(month, cacheable)

    return Response.json({ source: 'herp', month, data: summary })
  } catch (e) {
    console.error('[/api/herp] buildKPISummary error:', e)
    return Response.json({ source: 'mock-fallback', month, data: mockKPI })
  }
}
