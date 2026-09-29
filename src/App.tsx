import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { TransactionProvider } from './context/TransactionContext'
import { AddTransactionPage } from './pages/AddTransactionPage'
import { DashboardPage } from './pages/DashboardPage'
import { DataPage } from './pages/DataPage'
import { HistoryPage } from './pages/HistoryPage'

export default function App() {
  return (
    <TransactionProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="add" element={<AddTransactionPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="data" element={<DataPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TransactionProvider>
  )
}
