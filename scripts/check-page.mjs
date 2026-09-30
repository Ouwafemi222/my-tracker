import { chromium } from 'playwright'

const url = process.argv[2] || 'http://127.0.0.1:4173'
const browser = await chromium.launch()
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})

await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(2000)
const text = await page.locator('body').innerText()
console.log('URL:', url)
console.log('Body text length:', text.trim().length)
console.log('Body preview:', text.trim().slice(0, 400))
console.log('Errors:', errors.length ? errors : 'none')
await browser.close()
