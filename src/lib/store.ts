import { supabase } from './supabase'
import { ALLOWED_GROUPS } from './herp'

export type NAItem = {
  id: string
  assignee: string
  action: string
  quantity: string
  deadline: string
  isValid: boolean
  raw: string
  createdAt: string
  completedAt: string | null
}

export type NAItemInput = Omit<NAItem, 'id' | 'createdAt' | 'completedAt'>

export type StageTarget = {
  total: number
  byGroup: Record<string, number>
}

export type Targets = {
  applications:    StageTarget
  firstInterview:  StageTarget
  finalInterview:  StageTarget
  offered:         StageTarget
  offerAccepted:   StageTarget
}

export type NAFilter = 'pending' | 'completed' | 'all'

const emptyStage = (): StageTarget => ({
  total: 0,
  byGroup: Object.fromEntries(ALLOWED_GROUPS.map(g => [g, 0])),
})

const defaultTargets = (): Targets => ({
  applications:   emptyStage(),
  firstInterview: emptyStage(),
  finalInterview: emptyStage(),
  offered:        emptyStage(),
  offerAccepted:  emptyStage(),
})

type NARow = {
  id: string
  assignee: string
  action: string
  quantity: string
  deadline: string
  is_valid: boolean
  raw: string
  created_at: string
  completed_at: string | null
}

function rowToItem(row: NARow): NAItem {
  return {
    id: row.id,
    assignee: row.assignee,
    action: row.action,
    quantity: row.quantity,
    deadline: row.deadline,
    isValid: row.is_valid,
    raw: row.raw,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  }
}

export const naStore = {
  async getAll(filter: NAFilter = 'all'): Promise<NAItem[]> {
    let q = supabase
      .from('na_items')
      .select('*')
      .order('created_at', { ascending: false })
    if (filter === 'pending') q = q.is('completed_at', null)
    if (filter === 'completed') q = q.not('completed_at', 'is', null)
    const { data, error } = await q
    if (error) {
      console.error('[naStore.getAll]', error)
      return []
    }
    return (data as NARow[]).map(rowToItem)
  },

  async add(input: NAItemInput): Promise<NAItem | null> {
    const { data, error } = await supabase
      .from('na_items')
      .insert({
        assignee: input.assignee,
        action: input.action,
        quantity: input.quantity,
        deadline: input.deadline,
        is_valid: input.isValid,
        raw: input.raw,
      })
      .select()
      .single()
    if (error || !data) {
      console.error('[naStore.add]', error)
      return null
    }
    return rowToItem(data as NARow)
  },

  async setCompleted(id: string, completed: boolean): Promise<boolean> {
    const completedAt = completed ? new Date().toISOString() : null
    const { error } = await supabase
      .from('na_items')
      .update({ completed_at: completedAt })
      .eq('id', id)
    if (error) {
      console.error('[naStore.setCompleted]', error)
      return false
    }
    return true
  },

  async remove(id: string): Promise<boolean> {
    const { error } = await supabase.from('na_items').delete().eq('id', id)
    if (error) {
      console.error('[naStore.remove]', error)
      return false
    }
    return true
  },
}

// ─── KPI キャッシュ ──────────────────────────────────
export type KPICacheRow<T = unknown> = {
  data: T
  fetchedAt: string
}

export const kpiCacheStore = {
  async get<T>(month: string): Promise<KPICacheRow<T> | null> {
    const { data, error } = await supabase
      .from('kpi_cache')
      .select('data, fetched_at')
      .eq('month', month)
      .maybeSingle()
    if (error || !data) return null
    return { data: data.data as T, fetchedAt: data.fetched_at }
  },

  async set<T>(month: string, data: T): Promise<boolean> {
    const { error } = await supabase
      .from('kpi_cache')
      .upsert(
        { month, data, fetched_at: new Date().toISOString() },
        { onConflict: 'month' }
      )
    if (error) {
      console.error('[kpiCacheStore.set]', error)
      return false
    }
    return true
  },
}

// ─── 最終選考以降の候補者 ─────────────────────────────
export type FinalStageStep = 'finalInterview' | 'offered' | 'offerAccepted'

export type FinalStageCandidate = {
  candidacyId: string
  month: string
  candidateName: string
  groupName: string
  currentStep: FinalStageStep
  nextSchedule: string | null    // 最終選考の候補者: 選考予定日時
  offerDeadline: string | null   // 内定者: 承諾期限
  joinDate: string | null        // 入社予定者: 入社予定日 (YYYY-MM-DD)
  notes: string
  hiddenAt: string | null
  source: 'herp' | 'manual'
  updatedAt: string
}

type FinalStageRow = {
  candidacy_id: string
  month: string
  candidate_name: string
  group_name: string
  current_step: FinalStageStep
  next_schedule: string | null
  offer_deadline: string | null
  join_date: string | null
  notes: string
  hidden_at: string | null
  source: 'herp' | 'manual'
  updated_at: string
}

const stepRank: Record<FinalStageStep, number> = {
  finalInterview: 1,
  offered: 2,
  offerAccepted: 3,
}

function rowToCandidate(r: FinalStageRow): FinalStageCandidate {
  return {
    candidacyId: r.candidacy_id,
    month: r.month,
    candidateName: r.candidate_name,
    groupName: r.group_name,
    currentStep: r.current_step,
    nextSchedule: r.next_schedule,
    offerDeadline: r.offer_deadline,
    joinDate: r.join_date,
    notes: r.notes,
    hiddenAt: r.hidden_at,
    source: r.source,
    updatedAt: r.updated_at,
  }
}

export const finalStageStore = {
  async listByMonth(month: string, includeHidden = false): Promise<FinalStageCandidate[]> {
    let q = supabase
      .from('final_stage_candidates')
      .select('*')
      .eq('month', month)
      .order('updated_at', { ascending: false })
    if (!includeHidden) q = q.is('hidden_at', null)
    const { data, error } = await q
    if (error) {
      console.error('[finalStageStore.listByMonth]', error)
      return []
    }
    return (data as FinalStageRow[]).map(rowToCandidate)
  },

  // HERP からの自動 upsert: ステージが進んだ場合のみ更新（後退はしない）
  async upsertFromHerp(input: {
    candidacyId: string
    month: string
    candidateName: string
    groupName: string
    currentStep: FinalStageStep
  }): Promise<void> {
    // 既存レコードがあれば step を比較して、進んだ場合のみ更新
    const { data: existing } = await supabase
      .from('final_stage_candidates')
      .select('current_step, hidden_at')
      .eq('candidacy_id', input.candidacyId)
      .maybeSingle()

    if (existing) {
      const newRank = stepRank[input.currentStep]
      const oldRank = stepRank[existing.current_step as FinalStageStep] ?? 0
      if (newRank <= oldRank) return // 後退・同じはスキップ
      await supabase
        .from('final_stage_candidates')
        .update({
          current_step: input.currentStep,
          month: input.month,
          updated_at: new Date().toISOString(),
        })
        .eq('candidacy_id', input.candidacyId)
      return
    }

    // 新規挿入
    await supabase.from('final_stage_candidates').insert({
      candidacy_id: input.candidacyId,
      month: input.month,
      candidate_name: input.candidateName,
      group_name: input.groupName,
      current_step: input.currentStep,
      source: 'herp',
    })
  },

  async addManual(input: {
    candidateName: string
    groupName: string
    currentStep: FinalStageStep
    month: string
    nextSchedule?: string | null
    offerDeadline?: string | null
    joinDate?: string | null
    notes?: string
  }): Promise<FinalStageCandidate | null> {
    const id = `manual-${crypto.randomUUID()}`
    const { data, error } = await supabase
      .from('final_stage_candidates')
      .insert({
        candidacy_id: id,
        month: input.month,
        candidate_name: input.candidateName,
        group_name: input.groupName,
        current_step: input.currentStep,
        next_schedule: input.nextSchedule ?? null,
        offer_deadline: input.offerDeadline ?? null,
        join_date: input.joinDate ?? null,
        notes: input.notes ?? '',
        source: 'manual',
      })
      .select()
      .single()
    if (error || !data) {
      console.error('[finalStageStore.addManual]', error)
      return null
    }
    return rowToCandidate(data as FinalStageRow)
  },

  async update(
    candidacyId: string,
    patch: Partial<{
      nextSchedule: string | null
      offerDeadline: string | null
      joinDate: string | null
      notes: string
      currentStep: FinalStageStep
    }>
  ): Promise<boolean> {
    const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if ('nextSchedule' in patch)  dbPatch.next_schedule  = patch.nextSchedule
    if ('offerDeadline' in patch) dbPatch.offer_deadline = patch.offerDeadline
    if ('joinDate' in patch)      dbPatch.join_date      = patch.joinDate
    if ('notes' in patch)         dbPatch.notes          = patch.notes
    if ('currentStep' in patch)   dbPatch.current_step   = patch.currentStep
    const { error } = await supabase
      .from('final_stage_candidates')
      .update(dbPatch)
      .eq('candidacy_id', candidacyId)
    if (error) {
      console.error('[finalStageStore.update]', error)
      return false
    }
    return true
  },

  async hide(candidacyId: string): Promise<boolean> {
    const { error } = await supabase
      .from('final_stage_candidates')
      .update({ hidden_at: new Date().toISOString() })
      .eq('candidacy_id', candidacyId)
    if (error) return false
    return true
  },

  async unhide(candidacyId: string): Promise<boolean> {
    const { error } = await supabase
      .from('final_stage_candidates')
      .update({ hidden_at: null })
      .eq('candidacy_id', candidacyId)
    if (error) return false
    return true
  },

  // KPI 数値: 表示中の候補者の現在ステージで集計
  // finalInterview = 1, offered = 2, offerAccepted = 3 で「以上」を数える
  async countByMonth(month: string): Promise<{ finalInterview: number; offered: number; offerAccepted: number }> {
    const candidates = await this.listByMonth(month, false)
    const result = { finalInterview: 0, offered: 0, offerAccepted: 0 }
    candidates.forEach(c => {
      const r = stepRank[c.currentStep]
      if (r >= 1) result.finalInterview++
      if (r >= 2) result.offered++
      if (r >= 3) result.offerAccepted++
    })
    return result
  },
}

// 月別の目標値ストア (monthly_targets テーブル)
export const monthlyTargetStore = {
  async get(month: string): Promise<Targets> {
    const { data, error } = await supabase
      .from('monthly_targets')
      .select('data')
      .eq('month', month)
      .maybeSingle()
    if (error) {
      console.error('[monthlyTargetStore.get]', error)
      return defaultTargets()
    }
    if (!data) return defaultTargets()
    // 既存データに不足キーがあれば補完
    const merged = { ...defaultTargets(), ...((data.data ?? {}) as Partial<Targets>) }
    return merged
  },

  async set(month: string, values: Targets): Promise<boolean> {
    const { error } = await supabase
      .from('monthly_targets')
      .upsert(
        { month, data: values, updated_at: new Date().toISOString() },
        { onConflict: 'month' }
      )
    if (error) {
      console.error('[monthlyTargetStore.set]', error)
      return false
    }
    return true
  },
}
