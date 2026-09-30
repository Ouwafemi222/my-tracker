import { parseNairaToKoboAllowZero } from './money'

export interface AlertDetails {
  narration: string
  accountNumber: string
  balance: string
  sender: string
  recipient: string
}

const META =
  /^(account number|account balance|sender|recipient|beneficiary)\s*:/i

export function packAlert(details: AlertDetails): string {
  const lines = [details.narration.trim() || 'Bank alert']
  if (details.accountNumber) lines.push(`Account number: ${details.accountNumber}`)
  if (details.balance) lines.push(`Account balance: ${details.balance}`)
  if (details.sender) lines.push(`Sender: ${details.sender}`)
  if (details.recipient) lines.push(`Recipient: ${details.recipient}`)
  return lines.join('\n').slice(0, 800)
}

function labeled(lines: string[], label: string): string {
  const prefix = `${label.toLowerCase()}:`
  const line = lines.find((item) => item.toLowerCase().startsWith(prefix))
  return line ? line.slice(prefix.length).trim() : ''
}

export function readAlert(description: string, counterparty: string): AlertDetails {
  const lines = description
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const narration = lines.find((line) => !META.test(line)) ?? ''
  const sender = labeled(lines, 'Sender')
  return {
    narration,
    accountNumber: labeled(lines, 'Account number'),
    balance: labeled(lines, 'Account balance'),
    sender: sender || cleanParty(counterparty),
    recipient: labeled(lines, 'Recipient') || labeled(lines, 'Beneficiary'),
  }
}

export function cleanParty(value: string): string {
  const trimmed = value.trim()
  const named = trimmed.match(/^([^<]+)</)
  if (named) {
    const name = named[1].replace(/["']/g, '').trim()
    if (name && !name.includes('@')) return name
  }
  if (trimmed.includes('@')) return ''
  return trimmed
}

export function titleName(value: string): string {
  const cleaned = value.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  if (cleaned !== cleaned.toUpperCase()) return cleaned
  return cleaned.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
}

export interface ReceiptStory {
  title: string
  amountLabel: string
  whoLabel: string
  who: string
  theirBank: string
  yourBank: string
  whenNote: string
}

export function receiptStory(
  description: string,
  counterparty: string,
  account: string,
  type: 'expense' | 'other_income' | 'earned_income' | 'internal_transfer',
): ReceiptStory {
  const alert = readAlert(description, counterparty)
  const text = alert.narration
  const toName = text.match(/\bto\s+([A-Za-z][A-Za-z .'-]{2,60})/i)?.[1]?.replace(/[.;].*$/, '').trim() ?? ''
  const theirBank =
    text.match(/recipient bank\s+([A-Za-z0-9 ]{2,40})/i)?.[1]?.trim() ?? ''
  const phone = text.match(/\b(0\d[\d*]{6,14})\b/)?.[1] ?? ''
  const airtime = /airtime/i.test(text)
  const data = /\bdata\b/i.test(text)
  const moneyIn = type === 'other_income' || type === 'earned_income'
  const who = titleName(moneyIn ? alert.sender || toName : alert.recipient || toName || phone)
  const yourBank = account.trim()

  let title = moneyIn ? 'Money received' : 'Money sent'
  let whoLabel = moneyIn ? 'From' : 'To'
  if (type === 'internal_transfer') {
    title = 'Moved between your banks'
    whoLabel = 'With'
  } else if (airtime) {
    title = 'Airtime'
    whoLabel = 'Number'
  } else if (data) {
    title = 'Mobile data'
    whoLabel = 'Number'
  } else if (/\btransfer\b/i.test(text) && !moneyIn) {
    title = 'Transfer sent'
  }

  return {
    title,
    amountLabel: moneyIn ? 'Amount received' : 'Amount',
    whoLabel,
    who,
    theirBank: titleName(theirBank),
    yourBank,
    whenNote: text && text.toLowerCase() !== who.toLowerCase() ? text : '',
  }
}

export function minorFromBalanceText(text: string): number | null {
  const match = text.match(/(?:₦|NGN|N|\$|USD)?\s*([\d,]+\.\d{2})/i)
  if (!match) return null
  return parseNairaToKoboAllowZero(match[1].replace(/,/g, ''))
}

export function balanceLine(text: string): string {
  return grabField(text, [
    'Account Balance',
    'Available Balance',
    'Wallet Balance',
    'Current Balance',
    'New Balance',
  ])
}

export function grabField(text: string, labels: string[]): string {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}\\s*[:\\-|]\\s*([^\\n|]{2,80})`, 'i'))
    if (match) return match[1].replace(/\s+/g, ' ').trim()
  }
  return ''
}
