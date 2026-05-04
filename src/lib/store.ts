export type NAItem = {
  id: string
  assignee: string
  action: string
  quantity: string
  deadline: string
  isValid: boolean
  raw: string
  createdAt: string
}

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

const g = globalThis as Record<string, unknown>

if (!g.__naItems) g.__naItems = []
if (!g.__targets) {
  g.__targets = {
    applications: { total: 0, byType: { エンジニア: 0, セールス: 0, コーポレート: 0 } },
    firstInterview: { total: 0, byType: { エンジニア: 0, セールス: 0, コーポレート: 0 } },
    secondInterview: { total: 0, byType: { エンジニア: 0, セールス: 0, コーポレート: 0 } },
    offers: { total: 0, byType: { エンジニア: 0, セールス: 0, コーポレート: 0 } },
    acceptances: { total: 0, byType: { エンジニア: 0, セールス: 0, コーポレート: 0 } },
    hires: { total: 0, byType: { エンジニア: 0, セールス: 0, コーポレート: 0 } },
  }
}

export const naStore = {
  getAll: () => g.__naItems as NAItem[],
  add: (item: NAItem) => { (g.__naItems as NAItem[]).push(item) },
  remove: (id: string) => {
    g.__naItems = (g.__naItems as NAItem[]).filter(i => i.id !== id)
  },
  update: (id: string, updates: Partial<NAItem>) => {
    const items = g.__naItems as NAItem[]
    const idx = items.findIndex(i => i.id === id)
    if (idx > -1) Object.assign(items[idx], updates)
  },
}

export const targetStore = {
  get: () => g.__targets as Targets,
  set: (values: Targets) => { g.__targets = values },
}
