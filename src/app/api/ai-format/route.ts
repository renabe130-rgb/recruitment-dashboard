import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MEMBERS = ['建部', '大森', '李', '土海', '安部']

const SYSTEM = `あなたは採用チームのNA（ネクストアクション）管理アシスタントです。
入力されたテキストを解析し、以下のJSONフォーマットで返してください。

ルール:
- 担当者は次のいずれかから特定する: ${MEMBERS.join('、')}
- isValid は 量・期日・担当 の3つ全てが揃っている場合のみ true
- 期日がない、担当者がない、または量が不明な場合は isValid: false
- 量とは「何を何件/何通/何回」など数値を伴う具体的なアクションの規模のこと
- 複数のNAが入力された場合は配列で返す

出力形式（JSONのみ、説明なし）:
[
  {
    "assignee": "担当者名",
    "action": "アクション内容（簡潔に）",
    "quantity": "量（例: 100通、3件、なし）",
    "deadline": "期日（例: 4/10、次回MTG、なし）",
    "isValid": true または false
  }
]`

export async function POST(request: Request) {
  const { text } = await request.json()
  if (!text?.trim()) {
    return Response.json({ error: 'text required' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY が未設定です' }, { status: 500 })
  }

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM,
    messages: [{ role: 'user', content: text }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : '[]'

  try {
    const items = JSON.parse(raw.match(/\[[\s\S]*\]/)?.[0] ?? '[]')
    return Response.json({ items })
  } catch {
    return Response.json({ error: '解析に失敗しました', raw }, { status: 500 })
  }
}
