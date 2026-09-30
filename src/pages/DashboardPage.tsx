import { isProApp } from '../config/appVariant'
import { ProDashboardPage } from './ProDashboardPage'
import { SimpleDashboardPage } from './SimpleDashboardPage'

export function DashboardPage() {
  return isProApp() ? <ProDashboardPage /> : <SimpleDashboardPage />
}
