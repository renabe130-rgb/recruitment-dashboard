'use client'

import { useState, useEffect } from 'react'

type JobTypeTarget = { total: number; byType: Record<string, number> }
type Targets = Record<string, JobTypeTarget>
type KPIData = Record<string, { total: number; byType: Record<string, number> }>

const STAGES = [
  { key: 'applications', label: '応募数' },
  { key: 'firstInterview', label: '一次面接' },
  { key: 'secondInterview', label: '二次面接' },
  { key: 'offers', label: '内定数' },
  { key: 'acceptances', label: '承諾数' },
  { key: 'hires', label: '採用数' },
]
const JOB_TYPES = ['エンジニア', 'セールス', 'コーポレート']

function progressColor(actual: number, target: number) {
  if (target === 0) return 'bg-gray-300'
  const pct = actual / target
  if (pct >= 0.8) return 'bg-green-500'
  if (pct >= 0.5) return 'bg-yellow-400'
  return 'bg-red-500'
}

function KPICard({
  label, actual, target, byType, byTypeTarget, onEditTarget
}: {
  label: string
  actual: number
  target: number
  byType: Record<string, number>
  byTypeTarget: Record<string, number>
  onEditTarget: (total: number, byType: Record<string, number>) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTotal, setEditTotal] = useState(String(target))
  const [editByType, setEditByType] = useState<Record<string, string>>(
    Object.fromEntries(JOB_TYPES.map(t => [t, String(byTypeTarget[t] ?? 0)]))
  )
  const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0

  const saveTarget = () => {
    onEditTarget(Number(editTotal), Object.fromEntries(JOB_TYPES.map(t => [t, Number(editByType[t])])))
    setEditing(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700">{label}</h3>
        <button onClick={() => setEditing(true)} className="text-xs text-blue-500 hover:underline">目標編集</button>
      </div>

      <div className="flex items-end gap-2 mb-2">
        <span className="text-3xl font-bold text-gray-800">{actual}</span>
        <span className="text-gray-400 mb-1">/ {target > 0 ? target : '未設定'} 名</span>
        {target > 0 && <span className="ml-auto text-sm font-medium text-gray-500">{pct}%</span>}
      </div>

      {target > 0 && (
        <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
          <div
            className={`h-2 rounded-full transition-all ${progressColor(actual, target)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        {expanded ? '▲ 職種別を閉じる' : '▼ 職種別を見る'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {JOB_TYPES.map(type => {
            const a = byType[type] ?? 0
            const t = byTypeTarget[type] ?? 0
            const p = t > 0 ? Math.min(100, Math.round((a / t) * 100)) : 0
            return (
              <div key={type}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{type}</span>
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
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <h4 className="font-semibold mb-4">{label} 目標値の設定</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">合計目標</label>
                <input type="number" value={editTotal} onChange={e => setEditTotal(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" />
              </div>
              {JOB_TYPES.map(type => (
                <div key={type}>
                  <label className="text-sm text-gray-600">{type}</label>
                  <input type="number" value={editByType[type]}
                    onChange={e => setEditByType(prev => ({ ...prev, [type]: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" />
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

export default function KPITab() {
  const [kpi, setKpi] = useState<KPIData | null>(null)
  const [targets, setTargets] = useState<Targets>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/herp').then(r => r.json()),
      fetch('/api/targets').then(r => r.json()),
    ]).then(([herpRes, tgt]) => {
      setKpi(herpRes.data)
      setTargets(tgt)
      setLoading(false)
    })
  }, [])

  const updateTarget = async (stage: string, total: number, byType: Record<string, number>) => {
    const updated = { ...targets, [stage]: { total, byType } }
    setTargets(updated)
    await fetch('/api/targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
  }

  if (loading) return <div className="text-center py-20 text-gray-400">読み込み中...</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {STAGES.map(({ key, label }) => (
        <KPICard
          key={key}
          label={label}
          actual={(kpi as KPIData)?.[key]?.total ?? 0}
          target={targets[key]?.total ?? 0}
          byType={(kpi as KPIData)?.[key]?.byType ?? {}}
          byTypeTarget={targets[key]?.byType ?? {}}
          onEditTarget={(total, byType) => updateTarget(key, total, byType)}
        />
      ))}
    </div>
  )
}
