// HERP_API_KEY 未設定時のフォールバック用モックKPI
export const mockKPI = {
  applications:   { total: 42, byGroup: { エンジニア: 18, セールス: 15, コーポレート: 9 } },
  firstInterview: { total: 28, byGroup: { エンジニア: 12, セールス: 10, コーポレート: 6 } },
  finalInterview: { total: 14, byGroup: { エンジニア: 6,  セールス: 5,  コーポレート: 3 } },
  offered:        { total: 7,  byGroup: { エンジニア: 3,  セールス: 3,  コーポレート: 1 } },
  offerAccepted:  { total: 5,  byGroup: { エンジニア: 2,  セールス: 2,  コーポレート: 1 } },
  groupNames:     ['エンジニア', 'セールス', 'コーポレート'],
  totalCandidacies: 42,
  fetchedAt: new Date().toISOString(),
}
