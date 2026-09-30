import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ConfigIssueBanner } from './components/ConfigIssueBanner'
import { RequireAuth } from './components/RequireAuth'
import { Layout } from './components/Layout'
import { AuthProvider } from './context/AuthContext'
import { BankBalanceProvider } from './context/BankBalanceContext'
import { ScreenLockProvider } from './context/ScreenLockContext'
import { LedgerFilterProvider } from './context/LedgerFilterContext'
import { TransactionProvider } from './context/TransactionContext'
import { AddTransactionPage } from './pages/AddTransactionPage'
import { BalancesPage } from './pages/BalancesPage'
import { BankPage } from './pages/BankPage'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { DataPage } from './pages/DataPage'
import { HistoryPage } from './pages/HistoryPage'
import { ProfilePage } from './pages/ProfilePage'

export default function App() {
  return (
    <AuthProvider>
      <ScreenLockProvider>
      <ConfigIssueBanner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route element={<RequireAuth />}>
            <Route
              element={
                <BankBalanceProvider>
                <TransactionProvider>
                  <LedgerFilterProvider>
                    <Layout />
                  </LedgerFilterProvider>
                </TransactionProvider>
                </BankBalanceProvider>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="add" element={<AddTransactionPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="balances" element={<BalancesPage />} />
              <Route path="bank/:bankId" element={<BankPage />} />
              <Route path="data" element={<DataPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      </ScreenLockProvider>
    </AuthProvider>
  )
}
