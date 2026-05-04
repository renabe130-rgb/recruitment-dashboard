const SPREADSHEET_ID = '11f-2OMHm0estWO-CISuVY8gl-AJxf0PnyaR1_M4bAbk'
const SHEET_NAME = '採用計画表(5/1更新)'

export async function GET() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY

  if (!keyJson) {
    return Response.json({
      source: 'mock',
      rows: [],
      message: 'GOOGLE_SERVICE_ACCOUNT_KEY が未設定です',
    })
  }

  try {
    const { google } = await import('googleapis')
    const key = JSON.parse(keyJson)
    const auth = new google.auth.GoogleAuth({
      credentials: key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })

    const sheets = google.sheets({ version: 'v4', auth })
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'`,
    })

    return Response.json({ source: 'sheets', rows: res.data.values ?? [] })
  } catch (err: unknown) {
    const e = err as { cause?: { message?: string }, message?: string }
    console.error('Sheets API error:', err)
    return Response.json({
      source: 'error',
      rows: [],
      message: e?.cause?.message ?? e?.message ?? 'スプレッドシートの読み込みに失敗しました',
    }, { status: 500 })
  }
}
