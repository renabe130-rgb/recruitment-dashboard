// HERP Hire API ラッパー
// docs: https://public-api.herp.cloud/hire/public/doc

const HERP_BASE_URL = 'https://public-api.herp.cloud/hire/v1'

export type Step =
  | 'entry'
  | 'casualInterview'
  | 'resumeScreening'
  | 'firstInterview'
  | 'secondInterview'
  | 'thirdInterview'
  | 'finalInterview'
  | 'offered'
  | 'offerAccepted'

export type Candidacy = {
  id: string
  name: string
  status: 'active' | 'terminated'
  requisitionId: string
  appliedAt: string
  step: Step
  stepUpdatedAt: string
  email?: string
  age?: string
  company?: string
  channel?: { type: string }
}

export type Contact = {
  id: string
  step: Step
  type: string
  createdAt: string
  createdBy: string
}

export type Requisition = {
  id: string
  name?: string
  title?: string
}

export type RequisitionGroup = {
  id: string
  name: string
}

export type RequisitionGroupDetail = {
  id: string
  name: string
  requisitions: { id: string; name: string; isArchived: boolean }[]
}

function authHeader(): Record<string, string> {
  const key = process.env.HERP_API_KEY
  if (!key) throw new Error('HERP_API_KEY is not set')
  return { Authorization: `Bearer ${key}` }
}

async function herpGet<T>(path: string, retry = 3): Promise<T | null> {
  try {
    const res = await fetch(`${HERP_BASE_URL}${path}`, {
      headers: authHeader(),
      cache: 'no-store',
    })
    if (res.status === 429 && retry > 0) {
      const resetAt = res.headers.get('x-reset-at')
      const waitMs = resetAt
        ? Math.min(Math.max(0, new Date(resetAt).getTime() - Date.now()) + 1000, 65000)
        : 5000
      console.warn(`[herpGet] 429 ${path} -> wait ${waitMs}ms`)
      await new Promise(r => setTimeout(r, waitMs))
      return herpGet<T>(path, retry - 1)
    }
    if (!res.ok) {
      console.error('[herpGet]', path, res.status, await res.text().catch(() => ''))
      return null
    }
    return await res.json() as T
  } catch (e) {
    console.error('[herpGet]', path, e)
    return null
  }
}

// ─── ページネーション全件取得 ────────────────────────
export async function getAllCandidacies(extraQuery = ''): Promise<Candidacy[]> {
  const all: Candidacy[] = []
  let page = 1
  while (page <= 50) {
    const sep = extraQuery ? '&' : ''
    const res = await herpGet<{ candidacies: Candidacy[]; hasNextPage: boolean }>(
      `/candidacies?page=${page}${sep}${extraQuery}`
    )
    if (!res) break
    all.push(...(res.candidacies ?? []))
    if (!res.hasNextPage) break
    page++
  }
  return all
}

export async function getAllRequisitions(): Promise<Requisition[]> {
  const all: Requisition[] = []
  let page = 1
  while (page <= 20) {
    const res = await herpGet<{ requisitions: Requisition[]; hasNextPage: boolean }>(
      `/requisitions?page=${page}`
    )
    if (!res) break
    all.push(...(res.requisitions ?? []))
    if (!res.hasNextPage) break
    page++
  }
  return all
}

export async function getRequisitionGroups(): Promise<RequisitionGroup[]> {
  const res = await herpGet<{ requisitionGroups: RequisitionGroup[] }>(`/requisition-groups`)
  return res?.requisitionGroups ?? []
}

export async function getRequisitionGroupDetail(id: string): Promise<RequisitionGroupDetail | null> {
  const res = await herpGet<{ requisitionGroup: RequisitionGroupDetail }>(`/requisition-groups/${id}`)
  return res?.requisitionGroup ?? null
}

export async function getContactsForCandidacy(candidacyId: string): Promise<Contact[]> {
  const res = await herpGet<{ contacts: Contact[] }>(`/candidacies/${candidacyId}/contacts`)
  return res?.contacts ?? []
}

// レート制限対策: 並列度を制限してコンタクトを一括取得
export async function getContactsBulk(
  candidacyIds: string[],
  concurrency = 3
): Promise<Map<string, Contact[]>> {
  const out = new Map<string, Contact[]>()
  let i = 0
  async function worker() {
    while (i < candidacyIds.length) {
      const idx = i++
      const id = candidacyIds[idx]
      out.set(id, await getContactsForCandidacy(id))
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, candidacyIds.length) }, worker))
  return out
}

// ─── 集計 ────────────────────────────────────────
export type StageKey = 'applications' | 'firstInterview' | 'finalInterview' | 'offered' | 'offerAccepted'

export const STAGE_TO_HERP_STEP: Record<Exclude<StageKey, 'applications'>, Step> = {
  firstInterview: 'firstInterview',
  finalInterview: 'finalInterview',
  offered:        'offered',
  offerAccepted:  'offerAccepted',
}

export type GroupKey = string  // 職種グループ名 (例: "営業" "エンジニア")

// ダッシュボードで集計対象にする職種グループ（HERP登録名と完全一致が必要）
// それ以外のグループ（外部公開用など）に紐づく求人・候補者は集計から除外する
export const ALLOWED_GROUPS = [
  'D2Cマーケター(建部)',
  'SV(大森)',
  'その他営業系1day(大森)',
  'インターン(土海)',
  'エステエリマネ/研修講師(安部)',
  'オープンポジション(李)',
  'デザイナー(李)',
  '人事/採用担当(李)',
  '店舗開発(李)',
  '施工管理(李)',
  '経理担当(土海)',
  '賃貸営業(大森)',
] as const

export type KPIByGroup = {
  total: number
  byGroup: Record<GroupKey, number>
}

export type KPISummary = {
  applications:    KPIByGroup
  firstInterview:  KPIByGroup
  finalInterview:  KPIByGroup
  offered:         KPIByGroup
  offerAccepted:   KPIByGroup
  groupNames:      string[]   // 表示順を固定するための配列
  fetchedAt:       string
  totalCandidacies: number
  finalStageFromHerp: {
    candidacyId: string
    candidateName: string
    groupName: string
    currentStep: 'finalInterview' | 'offered' | 'offerAccepted'
  }[]
}

// 月（YYYY-MM）の境界判定: その月の 00:00 ～ 翌月の 00:00 (排他的)
function isInMonth(iso: string, year: number, month: number): boolean {
  if (!iso) return false
  const d = new Date(iso)
  return d.getFullYear() === year && d.getMonth() + 1 === month
}

const STAGE_BY_STEP = Object.fromEntries(
  Object.entries(STAGE_TO_HERP_STEP).map(([stage, step]) => [step, stage])
) as Record<Step, Exclude<StageKey, 'applications'>>

export async function buildKPISummary(monthYM: string): Promise<KPISummary> {
  const [yStr, mStr] = monthYM.split('-')
  const year = Number(yStr)
  const month = Number(mStr)
  if (!year || !month) throw new Error(`invalid month: ${monthYM}`)

  const allowedSet = new Set<string>(ALLOWED_GROUPS)

  // 1. グループ一覧 → ホワイトリスト抽出
  const allGroups = await getRequisitionGroups()
  const targetGroups = allGroups.filter(g => allowedSet.has(g.name))

  // 2. 各グループの詳細から requisitionId -> groupName マップ
  const reqIdToGroupName = new Map<string, string>()
  await Promise.all(
    targetGroups.map(async g => {
      const detail = await getRequisitionGroupDetail(g.id)
      detail?.requisitions.forEach(r => reqIdToGroupName.set(r.id, g.name))
    })
  )

  // 3. 当月アクション/応募の候補者だけ取得（レート制限対策で月絞り込み）
  // - appliedAt が当月: 応募者
  // - stepUpdatedAt が当月: ステージ進行があった候補者
  const monthFromTo = `${monthYM}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const monthEnd = `${monthYM}-${String(lastDay).padStart(2, '0')}`
  const [appliedThisMonth, stepUpdatedThisMonth] = await Promise.all([
    getAllCandidacies(`appliedAtFrom=${monthFromTo}&appliedAtTo=${monthEnd}`),
    getAllCandidacies(`stepUpdatedAtFrom=${monthFromTo}&stepUpdatedAtTo=${monthEnd}`),
  ])
  // 重複排除（id ベース）
  const candMap = new Map<string, Candidacy>()
  ;[...appliedThisMonth, ...stepUpdatedThisMonth].forEach(c => candMap.set(c.id, c))
  const candidacies = [...candMap.values()]

  const OTHER_GROUP = 'その他'
  const groupNames = [...ALLOWED_GROUPS, OTHER_GROUP]
  const emptyKPI = (): KPIByGroup => ({
    total: 0,
    byGroup: Object.fromEntries(groupNames.map(n => [n, 0])) as Record<string, number>,
  })

  const summary: KPISummary = {
    applications:   emptyKPI(),
    firstInterview: emptyKPI(),
    finalInterview: emptyKPI(),
    offered:        emptyKPI(),
    offerAccepted:  emptyKPI(),
    groupNames,
    fetchedAt: new Date().toISOString(),
    totalCandidacies: candidacies.length,
    finalStageFromHerp: [],
  }

  const stepRankFinal: Record<string, number> = { finalInterview: 1, offered: 2, offerAccepted: 3 }

  // groupName 判定: ホワイトリストになければ「その他」
  const getGroupName = (c: Candidacy): string =>
    reqIdToGroupName.get(c.requisitionId) ?? OTHER_GROUP

  // 応募数: 当月応募の全候補者（グループ無視・HERPの数字と一致）
  appliedThisMonth.forEach(c => {
    if (!isInMonth(c.appliedAt, year, month)) return
    const g = getGroupName(c)
    summary.applications.total++
    summary.applications.byGroup[g] = (summary.applications.byGroup[g] ?? 0) + 1
  })

  // 一次以降: 全候補者（グループ無視）の当月コンタクトを集計
  const contactsMap = await getContactsBulk(candidacies.map(c => c.id))
  candidacies.forEach(c => {
    const g = getGroupName(c)
    const seenStages = new Set<string>()
    let highestFinalRank = 0
    let highestFinalStep: 'finalInterview' | 'offered' | 'offerAccepted' | null = null
    ;(contactsMap.get(c.id) ?? []).forEach(ct => {
      if (!isInMonth(ct.createdAt, year, month)) return
      const stage = STAGE_BY_STEP[ct.step]
      if (!stage) return
      if (!seenStages.has(stage)) {
        seenStages.add(stage)
        summary[stage].total++
        summary[stage].byGroup[g] = (summary[stage].byGroup[g] ?? 0) + 1
      }
      // 最終選考以降の最高到達ステージを記録
      const r = stepRankFinal[ct.step] ?? 0
      if (r > highestFinalRank) {
        highestFinalRank = r
        highestFinalStep = ct.step as 'finalInterview' | 'offered' | 'offerAccepted'
      }
    })
    if (highestFinalStep) {
      summary.finalStageFromHerp.push({
        candidacyId: c.id,
        candidateName: c.name,
        groupName: g,
        currentStep: highestFinalStep,
      })
    }
  })

  return summary
}
