export const mockKPI = {
  applications: {
    total: 42,
    byType: { エンジニア: 18, セールス: 15, コーポレート: 9 },
  },
  firstInterview: {
    total: 28,
    byType: { エンジニア: 12, セールス: 10, コーポレート: 6 },
  },
  secondInterview: {
    total: 14,
    byType: { エンジニア: 6, セールス: 5, コーポレート: 3 },
  },
  offers: {
    total: 7,
    byType: { エンジニア: 3, セールス: 3, コーポレート: 1 },
  },
  acceptances: {
    total: 5,
    byType: { エンジニア: 2, セールス: 2, コーポレート: 1 },
  },
  hires: {
    total: 3,
    byType: { エンジニア: 1, セールス: 1, コーポレート: 1 },
  },
}

export const mockSchedule = {
  finalInterview: [
    { name: '山田 太郎', jobType: 'エンジニア', date: '2026-04-28' },
    { name: '佐藤 花子', jobType: 'セールス', date: '2026-04-30' },
    { name: '田中 一郎', jobType: 'コーポレート', date: null },
  ],
  offerMeeting: [
    { name: '鈴木 二郎', jobType: 'エンジニア', date: '2026-04-27' },
    { name: '高橋 美咲', jobType: 'セールス', date: null },
  ],
  offerAcceptance: [
    { name: '渡辺 健太', jobType: 'エンジニア', date: '2026-05-01' },
  ],
  joining: [
    { name: '伊藤 さくら', jobType: 'セールス', date: '2026-05-01' },
    { name: '中村 大輔', jobType: 'コーポレート', date: '2026-06-01' },
  ],
}
