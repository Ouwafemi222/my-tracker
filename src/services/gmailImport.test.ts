import { describe, expect, it } from 'vitest'
import { alertIsInWindow, parseGmailAlert } from './gmailImport'

const NOW = new Date('2026-10-17T12:00:00.000Z')

function alert(input: { from: string; subject: string; body: string; daysAgo?: number }) {
  const occurredAt = new Date(NOW.getTime() - (input.daysAgo ?? 0) * 24 * 60 * 60 * 1000).toISOString()
  return parseGmailAlert({
    from: input.from,
    subject: input.subject,
    body: input.body,
    occurredAt,
  })
}

describe('alertIsInWindow', () => {
  it('keeps alerts from earlier days in the lookback, not only today', () => {
    const twentyDaysAgo = new Date(NOW.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString()
    const sixtyDaysAgo = new Date(NOW.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()
    expect(alertIsInWindow(twentyDaysAgo, NOW)).toBe(true)
    expect(alertIsInWindow(NOW.toISOString(), NOW)).toBe(true)
    expect(alertIsInWindow(sixtyDaysAgo, NOW)).toBe(false)
  })
})

describe('parseGmailAlert', () => {
  it('reads an OPay debit and ignores the remaining balance', () => {
    const parsed = alert({
      from: 'OPay <no-reply@opay.com>',
      subject: 'Debit Transaction',
      body: 'Your account has been debited with NGN 1,500.00. Available Balance: NGN 20,000.00. If you received this email in error, ignore it.',
      daysAgo: 12,
    })
    expect(parsed?.bankId).toBe('opay')
    expect(parsed?.transaction?.type).toBe('expense')
    expect(parsed?.transaction?.amountKobo).toBe(150_000)
    expect(parsed?.balanceKobo).toBe(2_000_000)
    expect(parsed?.transaction?.account).toBe('OPay')
  })

  it('reads a Moniepoint credit even when the body mentions a debit later', () => {
    const parsed = alert({
      from: 'Moniepoint <alerts@moniepoint.com>',
      subject: 'Credit Alert',
      body: 'Credit Amount: NGN 5,000.00\nSender: ADA LOVELACE\nAccount Balance: NGN 9,000.00\nThis message is not a debit instruction.',
      daysAgo: 18,
    })
    expect(parsed?.bankId).toBe('moniepoint')
    expect(parsed?.transaction?.type).toBe('other_income')
    expect(parsed?.transaction?.amountKobo).toBe(500_000)
    expect(parsed?.transaction?.counterparty).toContain('ADA LOVELACE')
  })

  it('reads Amount without a currency sign', () => {
    const parsed = alert({
      from: 'Kuda <hello@kuda.com>',
      subject: 'Debit Alert',
      body: 'Amount: 2,000.00\nNarration: POS purchase',
    })
    expect(parsed?.bankId).toBe('kuda')
    expect(parsed?.transaction?.amountKobo).toBe(200_000)
    expect(parsed?.transaction?.type).toBe('expense')
  })

  it('treats ALAT mail as Wema', () => {
    const parsed = alert({
      from: 'ALAT <notify@alat.ng>',
      subject: 'Debit Alert',
      body: 'You have been debited with NGN 800.00',
    })
    expect(parsed?.bankId).toBe('wema')
    expect(parsed?.transaction?.amountKobo).toBe(80_000)
  })

  it('reads a Rainest USDT credit', () => {
    const parsed = alert({
      from: 'Rainest <hello@rainest.com>',
      subject: 'USDT received',
      body: 'You received 25.00 USDT',
    })
    expect(parsed?.bankId).toBe('rainest')
    expect(parsed?.transaction?.type).toBe('other_income')
    expect(parsed?.transaction?.amountKobo).toBe(2_500)
  })

  it('does not turn a "to pay" newsletter into an OPay expense', () => {
    const parsed = alert({
      from: 'Newsletter <news@example.com>',
      subject: 'How to pay less',
      body: 'Amount: 2,000.00',
    })
    expect(parsed).toBeNull()
  })

  it('keeps OPay when the message also says grey', () => {
    const parsed = alert({
      from: 'OPay <no-reply@opay.com>',
      subject: 'Debit Alert',
      body: 'Amount: NGN 400.00\nA grey receipt is attached.',
    })
    expect(parsed?.bankId).toBe('opay')
    expect(parsed?.transaction?.amountKobo).toBe(40_000)
  })

  it('keeps a debit when the mail also shows a zero credit', () => {
    const parsed = alert({
      from: 'OPay <no-reply@opay.com>',
      subject: 'Transaction Notification',
      body: 'Credit\n₦0.00\nDebit\n₦1,500.00\nAvailable Balance: NGN 20,000.00',
    })
    expect(parsed?.transaction?.type).toBe('expense')
    expect(parsed?.transaction?.amountKobo).toBe(150_000)
    expect(parsed?.balanceKobo).toBe(2_000_000)
  })

  it('reads a DR amount and ignores the balance abbreviation', () => {
    const parsed = alert({
      from: 'GTBank <alert@gtbank.com>',
      subject: 'Transaction Alert',
      body: 'Amt: NGN 2,000.00 DR\nBal: NGN 9,000.00\nDescription: POS purchase',
    })
    expect(parsed?.transaction?.type).toBe('expense')
    expect(parsed?.transaction?.amountKobo).toBe(200_000)
    expect(parsed?.balanceKobo).toBe(900_000)
  })

  it('reads a transfer debit that does not say debit alert', () => {
    const parsed = alert({
      from: 'PalmPay <noreply@palmpay.com>',
      subject: 'Payment successful',
      body: 'You transferred ₦800.00 to JANE DOE',
    })
    expect(parsed?.bankId).toBe('palmpay')
    expect(parsed?.transaction?.type).toBe('expense')
    expect(parsed?.transaction?.amountKobo).toBe(80_000)
  })

  it('reads a Moniepoint minus amount as a debit', () => {
    const parsed = alert({
      from: 'Moniepoint <noreply@moniepoint.com>',
      subject: 'Transaction Notification',
      body: 'Amount: -NGN 25,000.00\nTransaction Type: Transfer\nBeneficiary: ACME LTD\nAvailable Balance: NGN 100,000.00\nNarration: Goods',
    })
    expect(parsed?.bankId).toBe('moniepoint')
    expect(parsed?.transaction?.type).toBe('expense')
    expect(parsed?.transaction?.amountKobo).toBe(2_500_000)
    expect(parsed?.transaction?.counterparty).toContain('ACME LTD')
    expect(parsed?.balanceKobo).toBe(10_000_000)
  })

  it('reads a Kuda minus amount as money out', () => {
    const parsed = alert({
      from: 'Kuda <hello@kuda.com>',
      subject: 'Money out',
      body: '−₦4,000.00\nTo: JANE DOE',
    })
    expect(parsed?.bankId).toBe('kuda')
    expect(parsed?.transaction?.type).toBe('expense')
    expect(parsed?.transaction?.amountKobo).toBe(400_000)
  })

  it('reads an OPay plus amount as a credit and a spaced minus as a debit', () => {
    const credit = alert({
      from: 'OPay <no-reply@opay.com>',
      subject: 'Transaction Notification',
      body: '+₦5,000.00\nSender: JOHN DOE',
    })
    const debit = alert({
      from: 'OPay <no-reply@opay.com>',
      subject: 'Transaction Notification',
      body: '- ₦1,200.00\nRecipient: JANE DOE',
    })
    expect(credit?.transaction?.type).toBe('other_income')
    expect(credit?.transaction?.amountKobo).toBe(500_000)
    expect(debit?.transaction?.type).toBe('expense')
    expect(debit?.transaction?.amountKobo).toBe(120_000)
  })

  it('reads an amount split across HTML lines', () => {
    const parsed = alert({
      from: 'GTBank <alert@gtbank.com>',
      subject: 'Transaction Alert',
      body: '<p>Debit Alert</p><p>Amount</p><p>&#8358;3,250.50</p><p>Description: POS Purchase</p>',
    })
    expect(parsed?.bankId).toBe('gtbank')
    expect(parsed?.transaction?.amountKobo).toBe(325_050)
    expect(parsed?.transaction?.type).toBe('expense')
  })
})
