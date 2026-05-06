'use client'

import { useState, useEffect, useCallback } from 'react'

type StageData = { total: number; byGroup: Record<string, number> }
type KPISummary = {
  applications:    StageData
  firstInterview:  StageData
  finalInterview:  StageData
  offered:         StageData
  offerAccepted:   StageData
  groupNames:      string[]
  fetchedAt?:      string
  totalCandidacies?: number
}
type Targets = {
  applications:    StageData
  firstInterview:  StageData
  finalInterview:  StageData
  offered:         StageData
  offerAccepted:   StageData
}

type FinalStageStep = 'finalInterview' | 'offered' | 'offerAccepted'
type FinalStageCandidate = {
  candidacyId: string
  month: string
  candidateName: string
  groupName: string
  currentStep: FinalStageStep
  nextSchedule: string | null
  offerDeadline: string | null
  joinDate: string | null
  notes: string
  source: 'herp' | 'manual'
}

const STAGES = [
  { key: 'applications',    label: '応募数' },
  { key: 'firstInterview',  label: '一次選考' },
  { key: 'finalInterview',  label: '最終選考' },
  { key: 'offered',         label: '内定数' },
  { key: 'offerAccepted',   label: '承諾数' },
] as const

type StageKey = typeof STAGES[number]['key']

const STEP_LABEL: Record<FinalStageStep, string> = {
  finalInterview: '最終選考',
  offered:        '内定',
  offerAccepted:  '承諾',
}

const SECTION_DEFS: { step: FinalStageStep; title: string; dateField: 'nextSchedule' | 'offerDeadline' | 'joinDate'; dateLabel: string }[] = [
  { step: 'finalInterview', title: '最終選考の候補者', dateField: 'nextSchedule',  dateLabel: '選考予定日時' },
  { step: 'offered',        title: '内定者',           dateField: 'offerDeadline', dateLabel: '承諾期限' },
  { step: 'offerAccepted',  title: '入社予定者',       dateField: 'joinDate',      dateLabel: '入社予定日' },
]

const MONTH_OPTIONS = (() => {
  const arr: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    arr.push({ value: ym, label: `${d.getFullYear()}年${d.getMonth() + 1}月` })
  }
  return arr
})()

const defaultMonth = MONTH_OPTIONS[0].value

function progressColor(actual: number, target: number) {
  if (target === 0) return 'bg-gray-300'
  const pct = actual / target
  if (pct >= 0.8) return 'bg-green-500'
  if (pct >= 0.5) return 'bg-yellow-400'
  return 'bg-red-500'
}

function toLocalDatetimeInputValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDatetime(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  const m = d.getMonth() + 1
  const day = d.getDate()
  const dow = ['日','月','火','水','木','金','土'][d.getDay()]
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${m}/${day}(${dow}) ${hh}:${mm}`
}

function formatDate(s: string | null): string {
  if (!s) return '-'
  const d = new Date(s)
  const m = d.getMonth() + 1
  const day = d.getDate()
  const dow = ['日','月','火','水','木','金','土'][d.getDay()]
  return `${m}/${day}(${dow})`
}

function KPICard({
  label, actual, target, byGroup, byGroupTarget, groupNames, onEditTarget, showZeroTargets,
}: {
  label: string
  actual: number
  target: number
  byGroup: Record<string, number>
  byGroupTarget: Record<string, number>
  groupNames: string[]
  onEditTarget: (total: number, byGroup: Record<string, number>) => void
  showZeroTargets: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTotal, setEditTotal] = useState(String(target))
  const [editByGroup, setEditByGroup] = useState<Record<string, string>>({})

  const openEdit = () => {
    setEditTotal(String(target))
    setEditByGroup(Object.fromEntries(groupNames.map(n => [n, String(byGroupTarget[n] ?? 0)])))
    setEditing(true)
  }
  const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0
  const saveTarget = () => {
    onEditTarget(Number(editTotal) || 0, Object.fromEntries(groupNames.map(n => [n, Number(editByGroup[n] || 0)])))
    setEditing(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700">{label}</h3>
        <button onClick={openEdit} className="text-xs text-blue-500 hover:underline">目標編集</button>
      </div>
      <div className="flex items-end gap-2 mb-2">
        <span className="text-3xl font-bold text-gray-800">{actual}</span>
        <span className="text-gray-400 mb-1">/ {target > 0 ? target : '未設定'} 名</span>
        {target > 0 && <span className="ml-auto text-sm font-medium text-gray-500">{pct}%</span>}
      </div>
      {target > 0 && (
        <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
          <div className={`h-2 rounded-full transition-all ${progressColor(actual, target)}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      <button onClick={() => setExpanded(!expanded)} className="text-xs text-gray-400 hover:text-gray-600">
        {expanded ? '▲ 職種別を閉じる' : '▼ 職種別を見る'}
      </button>
      {expanded && (
        <div className="mt-3 space-y-2">
          {groupNames
            .filter(name => showZeroTargets || (byGroupTarget[name] ?? 0) > 0)
            .map(name => {
              const a = byGroup[name] ?? 0
              const t = byGroupTarget[name] ?? 0
              const p = t > 0 ? Math.min(100, Math.round((a / t) * 100)) : 0
              return (
                <div key={name}>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>{name}</span>
                    <span>{a} / {t > 0 ? t : '未設定'} 名 {t > 0 ? `(${p}%)` : ''}</span>
                  </div>
                  {t > 0 && (
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${progressColor(a, t)}`} style={{ width: `${p}%` }} />
                    </div>
                  )}
                </div>
              )
            })}
          {!showZeroTargets && groupNames.filter(n => (byGroupTarget[n] ?? 0) === 0).length > 0 && (
            <p className="text-[11px] text-gray-400 pt-1">
              ※目標未設定の職種({groupNames.filter(n => (byGroupTarget[n] ?? 0) === 0).length}個)は非表示中。上部のチェックで切り替え可能
            </p>
          )}
        </div>
      )}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h4 className="font-semibold mb-4">{label} 目標値の設定</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">合計目標</label>
                <input type="number" value={editTotal} onChange={e => setEditTotal(e.target.value)} onWheel={e => (e.target as HTMLElement).blur()} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" />
              </div>
              {groupNames.map(name => (
                <div key={name}>
                  <label className="text-sm text-gray-600">{name}</label>
                  <input type="number" value={editByGroup[name] ?? '0'} onChange={e => setEditByGroup(prev => ({ ...prev, [name]: e.target.value }))} onWheel={e => (e.target as HTMLElement).blur()} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={saveTarget} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm">保存</button>
              <button onClick={() => setEditing(false)} className="flex-1 border py-2 rounded-lg text-sm">キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const emptyTargets = (groupNames: string[]): Targets => {
  const empty = () => ({ total: 0, byGroup: Object.fromEntries(groupNames.map(n => [n, 0])) })
  return {
    applications: empty(),
    firstInterview: empty(),
    finalInterview: empty(),
    offered: empty(),
    offerAccepted: empty(),
  }
}

function StageSection({
  step, title, dateField, dateLabel, items, groupNames, onChanged, month,
}: {
  step: FinalStageStep
  title: string
  dateField: 'nextSchedule' | 'offerDeadline' | 'joinDate'
  dateLabel: string
  items: FinalStageCandidate[]
  groupNames: string[]
  onChanged: () => void
  month: string
}) {
  const [editing, setEditing] = useState<FinalStageCandidate | null>(null)
  const [adding, setAdding] = useState(false)

  const handleHide = async (id: string) => {
    if (!confirm('このカードを非表示にします（KPI数値からも除外）')) return
    await fetch('/api/final-stage', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidacyId: id, action: 'hide' }),
    })
    onChanged()
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <span className="text-xs text-gray-400">{items.length}名</span>
        </div>
        <button onClick={() => setAdding(true)} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
          + 候補者を追加
        </button>
      </div>

      {items.length === 0 ? (
        <p className="p-6 text-sm text-gray-400 text-center">該当する候補者はいません</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-600">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">名前</th>
                <th className="text-left px-3 py-2 font-semibold">職種</th>
                <th className="text-left px-3 py-2 font-semibold">{dateLabel}</th>
                <th className="text-left px-3 py-2 font-semibold">備考</th>
                <th className="text-right px-3 py-2 font-semibold w-24"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(c => {
                const dateValue = c[dateField]
                const formatted = dateField === 'joinDate' ? formatDate(dateValue) : formatDatetime(dateValue)
                return (
                  <tr key={c.candidacyId} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-800 font-medium whitespace-nowrap">
                      {c.candidateName}
                      {c.source === 'manual' && <span className="ml-1 text-[10px] text-gray-400">(手動)</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{c.groupName}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{formatted}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-xs truncate" title={c.notes}>{c.notes || '-'}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button onClick={() => setEditing(c)} className="text-xs text-blue-500 hover:underline">編集</button>
                      <button onClick={() => handleHide(c.candidacyId)} className="ml-2 text-gray-300 hover:text-red-400" aria-label="非表示">×</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <CandidateModal
          mode="edit"
          candidate={editing}
          step={step}
          dateField={dateField}
          dateLabel={dateLabel}
          groupNames={groupNames}
          month={month}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onChanged() }}
        />
      )}
      {adding && (
        <CandidateModal
          mode="add"
          step={step}
          dateField={dateField}
          dateLabel={dateLabel}
          groupNames={groupNames}
          month={month}
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); onChanged() }}
        />
      )}
    </section>
  )
}

function CandidateModal({
  mode, candidate, step, dateField, dateLabel, groupNames, month, onClose, onSaved,
}: {
  mode: 'add' | 'edit'
  candidate?: FinalStageCandidate
  step: FinalStageStep
  dateField: 'nextSchedule' | 'offerDeadline' | 'joinDate'
  dateLabel: string
  groupNames: string[]
  month: string
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(candidate?.candidateName ?? '')
  const [group, setGroup] = useState(candidate?.groupName ?? groupNames[0] ?? '')
  const [currentStep, setCurrentStep] = useState<FinalStageStep>(candidate?.currentStep ?? step)
  const [nextSchedule, setNextSchedule] = useState(toLocalDatetimeInputValue(candidate?.nextSchedule ?? null))
  const [offerDeadline, setOfferDeadline] = useState(toLocalDatetimeInputValue(candidate?.offerDeadline ?? null))
  const [joinDate, setJoinDate] = useState(candidate?.joinDate ?? '')
  const [notes, setNotes] = useState(candidate?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (mode === 'add' && !name.trim()) return
    setSaving(true)
    const payload: Record<string, unknown> = {
      currentStep,
      nextSchedule:  nextSchedule  ? new Date(nextSchedule).toISOString()  : null,
      offerDeadline: offerDeadline ? new Date(offerDeadline).toISOString() : null,
      joinDate:      joinDate || null,
      notes,
    }
    if (mode === 'add') {
      Object.assign(payload, {
        candidateName: name,
        groupName: group,
        month,
      })
      await fetch('/api/final-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else if (candidate) {
      payload.candidacyId = candidate.candidacyId
      await fetch('/api/final-stage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h4 className="font-semibold mb-4">{mode === 'add' ? '候補者を手動追加' : `${name} の編集`}</h4>
        <div className="space-y-3">
          {mode === 'add' && (
            <div>
              <label className="text-sm text-gray-600">名前 *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" />
            </div>
          )}
          <div>
            <label className="text-sm text-gray-600">職種</label>
            <select value={group} onChange={e => setGroup(e.target.value)} disabled={mode === 'edit'} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm disabled:bg-gray-50">
              {groupNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">ステージ</label>
            <select value={currentStep} onChange={e => setCurrentStep(e.target.value as FinalStageStep)} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm">
              <option value="finalInterview">最終選考</option>
              <option value="offered">内定</option>
              <option value="offerAccepted">承諾</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">{dateLabel}</label>
            {dateField === 'joinDate' ? (
              <input type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" />
            ) : dateField === 'offerDeadline' ? (
              <input type="datetime-local" value={offerDeadline} onChange={e => setOfferDeadline(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" />
            ) : (
              <input type="datetime-local" value={nextSchedule} onChange={e => setNextSchedule(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" />
            )}
            <p className="text-[11px] text-gray-400 mt-1">※ステージ変更時の他日付項目は編集モーダルを再度開けば編集できます</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">備考</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm resize-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={save} disabled={saving || (mode === 'add' && !name.trim())} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm disabled:opacity-40">
            {saving ? '保存中...' : (mode === 'add' ? '追加' : '保存')}
          </button>
          <button onClick={onClose} className="flex-1 border py-2 rounded-lg text-sm">キャンセル</button>
        </div>
      </div>
    </div>
  )
}

export default function KPITab() {
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)
  const [kpi, setKpi] = useState<KPISummary | null>(null)
  const [targets, setTargets] = useState<Targets | null>(null)
  const [source, setSource] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [finalStageItems, setFinalStageItems] = useState<FinalStageCandidate[]>([])
  const [showZeroTargets, setShowZeroTargets] = useState(false)

  const fetchKpi = useCallback(async (force = false) => {
    setLoading(true)
    const url = `/api/herp?type=kpi&month=${selectedMonth}${force ? '&force=true' : ''}`
    const [herpRes, tgt, finalStage] = await Promise.all([
      fetch(url).then(r => r.json()),
      fetch(`/api/targets?month=${selectedMonth}`).then(r => r.json()),
      fetch(`/api/final-stage?month=${selectedMonth}`).then(r => r.json()),
    ])
    setKpi(herpRes.data)
    setSource(herpRes.source ?? '')
    setTargets(tgt)
    setFinalStageItems(finalStage)
    setLoading(false)
  }, [selectedMonth])

  useEffect(() => { fetchKpi(false) }, [fetchKpi])

  const reloadFinalStage = async () => {
    const [tgt, finalStage] = await Promise.all([
      fetch(`/api/herp?type=kpi&month=${selectedMonth}`).then(r => r.json()).catch(() => null),
      fetch(`/api/final-stage?month=${selectedMonth}`).then(r => r.json()),
    ])
    if (tgt) {
      setKpi(tgt.data)
      setSource(tgt.source ?? '')
    }
    setFinalStageItems(finalStage)
  }

  const handleForceRefresh = () => fetchKpi(true)

  const updateTarget = async (stage: StageKey, total: number, byGroup: Record<string, number>) => {
    const groupNames = kpi?.groupNames ?? []
    const base = targets ?? emptyTargets(groupNames)
    const updated = { ...base, [stage]: { total, byGroup } }
    setTargets(updated)
    await fetch(`/api/targets?month=${selectedMonth}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
  }

  const monthLabel = MONTH_OPTIONS.find(o => o.value === selectedMonth)?.label ?? selectedMonth

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">表示月:</label>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm bg-white">
            {MONTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          {!loading && kpi?.fetchedAt && (
            <span className="text-xs text-gray-400">
              {source === 'cache' ? 'キャッシュ' : 'HERP取得'}: {new Date(kpi.fetchedAt).toLocaleString('ja-JP')}
            </span>
          )}
          <button onClick={handleForceRefresh} disabled={loading} className="text-sm text-gray-500 hover:text-blue-600 disabled:opacity-40">
            ⟳ HERP最新を取得
          </button>
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-gray-600 select-none cursor-pointer">
        <input
          type="checkbox"
          checked={showZeroTargets}
          onChange={e => setShowZeroTargets(e.target.checked)}
          className="w-3.5 h-3.5"
        />
        目標未設定の職種も表示する
      </label>

      {source === 'mock' || source === 'mock-fallback' ? (
        <div className="text-xs px-3 py-2 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg">
          ※モックデータを表示中（source: {source}）
        </div>
      ) : null}

      {loading ? (
        <div className="text-center py-20 text-gray-400">
          {monthLabel}のKPIを読み込み中...（HERP直取得時は1〜3分かかります）
        </div>
      ) : source === 'no-cache' || !kpi ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
          <p className="text-gray-700 font-medium mb-2">{monthLabel}のKPIはまだ集計されていません</p>
          <p className="text-sm text-gray-500 mb-4">HERPから取得すると 1〜3分かかります（一度取得すると 24時間キャッシュされます）</p>
          <button
            onClick={handleForceRefresh}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            {monthLabel}のKPIを集計する
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STAGES.map(({ key, label }) => {
              const stage = kpi[key] as StageData
              const tgt = targets?.[key] ?? { total: 0, byGroup: {} }
              return (
                <KPICard
                  key={key}
                  label={label}
                  actual={stage?.total ?? 0}
                  target={tgt.total ?? 0}
                  byGroup={stage?.byGroup ?? {}}
                  byGroupTarget={tgt.byGroup ?? {}}
                  groupNames={kpi.groupNames}
                  onEditTarget={(total, byGroup) => updateTarget(key, total, byGroup)}
                  showZeroTargets={showZeroTargets}
                />
              )
            })}
          </div>

          {SECTION_DEFS.map(({ step, title, dateField, dateLabel }) => (
            <StageSection
              key={step}
              step={step}
              title={title}
              dateField={dateField}
              dateLabel={dateLabel}
              items={finalStageItems.filter(i => i.currentStep === step)}
              groupNames={kpi.groupNames}
              month={selectedMonth}
              onChanged={reloadFinalStage}
            />
          ))}
        </>
      )}
    </div>
  )
}
