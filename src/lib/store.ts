import { supabase } from './supabase'

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

export type JobTypeTarget = {
  total: number
  byType: Record<string, number>
}

export type Targets = {
  applications: JobTypeTarget
  firstInterview: JobTypeTarget
  secondInterview: JobTypeTarget
  offers: JobTypeTarget
  acceptances: JobTypeTarget
  hires: JobTypeTarget
}

export type NAFilter = 'pending' | 'completed' | 'all'

const DEFAULT_TARGETS: Targets = {
  applications:    { total: 0, byType: { エンジニア: 0, セールス: 0, コーポレート: 0 } },
  firstInterview:  { total: 0, byType: { エンジニア: 0, セールス: 0, コーポレート: 0 } },
  secondInterview: { total: 0, byType: { エンジニア: 0, セールス: 0, コーポレート: 0 } },
  offers:          { total: 0, byType: { エンジニア: 0, セールス: 0, コーポレート: 0 } },
  acceptances:     { total: 0, byType: { エンジニア: 0, セールス: 0, コーポレート: 0 } },
  hires:           { total: 0, byType: { エンジニア: 0, セールス: 0, コーポレート: 0 } },
}

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

export const targetStore = {
  async get(): Promise<Targets> {
    const { data, error } = await supabase
      .from('targets')
      .select('data')
      .eq('id', 1)
      .single()
    if (error || !data) {
      console.error('[targetStore.get]', error)
      return DEFAULT_TARGETS
    }
    return (data.data ?? DEFAULT_TARGETS) as Targets
  },

  async set(values: Targets): Promise<boolean> {
    const { error } = await supabase
      .from('targets')
      .update({ data: values, updated_at: new Date().toISOString() })
      .eq('id', 1)
    if (error) {
      console.error('[targetStore.set]', error)
      return false
    }
    return true
  },
}
