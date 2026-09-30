import type { TransactionType } from '../types/transaction'

export const ACCOUNTS = [
  'OPay',
  'PalmPay',
  'GTBank',
  'Wema',
  'Premium Bank',
  'Kuda',
  'Grey',
] as const

const EARNED_CATEGORIES = [
  'Salary',
  'Freelance',
  'Business revenue',
  'Bonus',
  'Other earned',
] as const

const OTHER_INCOME_CATEGORIES = [
  'Gift',
  'Refund',
  'Loan received',
  'Family support',
  'Other received',
] as const

const EXPENSE_CATEGORIES = [
  'Food & groceries',
  'Transport',
  'Rent & utilities',
  'Bills',
  'Health',
  'Entertainment',
  'Shopping',
  'Education',
  'Savings transfer',
  'Other expense',
] as const

const TRANSFER_CATEGORIES = ['Between my accounts'] as const

export function categoriesForType(type: TransactionType): readonly string[] {
  switch (type) {
    case 'earned_income':
      return EARNED_CATEGORIES
    case 'other_income':
      return OTHER_INCOME_CATEGORIES
    case 'expense':
      return EXPENSE_CATEGORIES
    case 'internal_transfer':
      return TRANSFER_CATEGORIES
    default:
      return []
  }
}
