import { mockKPI, mockSchedule } from '@/lib/mock-data'

const HERP_API_KEY = process.env.HERP_API_KEY
const HERP_BASE_URL = 'https://herp.cloud/v1'

async function fetchHERP(path: string) {
  if (!HERP_API_KEY) return null
  try {
    const res = await fetch(`${HERP_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${HERP_API_KEY}` },
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    console.error('[fetchHERP]', path, e)
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const fallback = type === 'schedule' ? mockSchedule : mockKPI

  if (!HERP_API_KEY) {
    return Response.json({ source: 'mock', data: fallback })
  }

  // TODO: HERP API ドキュメントを参照して正しいパスに置き換える
  const data = await fetchHERP('/applicants')
  if (data) {
    return Response.json({ source: 'herp', data })
  }
  return Response.json({ source: 'mock-fallback', data: fallback })
}
