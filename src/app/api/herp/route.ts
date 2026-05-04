import { mockKPI, mockSchedule } from '@/lib/mock-data'

const HERP_API_KEY = process.env.HERP_API_KEY
const HERP_BASE_URL = 'https://herp.cloud/v1'

async function fetchHERP(path: string) {
  if (!HERP_API_KEY) return null
  const res = await fetch(`${HERP_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${HERP_API_KEY}` },
    next: { revalidate: 300 },
  })
  if (!res.ok) return null
  return res.json()
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  if (!HERP_API_KEY) {
    return Response.json({ source: 'mock', data: type === 'schedule' ? mockSchedule : mockKPI })
  }

  // TODO: fill in actual HERP API paths once credentials arrive
  const data = await fetchHERP('/applicants')
  return Response.json({ source: 'herp', data: data ?? (type === 'schedule' ? mockSchedule : mockKPI) })
}
