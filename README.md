# Gratitude Expenses Tracking

Personal finance web app for tracking cash flow in **Nigerian naira (₦)**. Built with React, TypeScript, Vite, and Tailwind CSS.

Two feature versions live on separate Git branches in one repository:

| Branch       | App version | Storage key (localStorage)   |
| ------------ | ----------- | ---------------------------- |
| `version-1`  | Simple tracker | `gratitude-expenses-v1`   |
| `version-2`  | Upgraded dashboard | `gratitude-expenses-v2` |

Checking out a branch changes the code you run locally; **it does not create two public website URLs automatically**. Deploy each branch separately if you need two live sites.

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Production build

```bash
npm run build
npm run preview
```

## Tests

```bash
npm test
```

Calculation rules are covered by unit tests in `src/utils/calculations.test.ts`.

## Features

### Version 1

- Dashboard with date selector (Africa/Lagos), summary cards, daily narrative, recent transactions
- Manual transaction entry with validation
- History with search, filters, edit, and delete
- JSON backup export and restore
- Optional demo data (empty records by default)

### Version 2

See the `version-2` branch for charts, budgets, CSV export, light/dark mode, period summaries, and Version 1 backup import.

## Calculation rules

- Amounts are stored as **integer kobo** (100 kobo = ₦1).
- Reporting dates use **Africa/Lagos**.
- **Total money in** = earned income + other money received (earned income is not counted twice).
- **Total money out** = expenses only.
- **Net cash flow** = total money in − total money out (this is **not** an account balance).
- **Internal transfers** between your own accounts are excluded from income and spending.

Example: ₦50,000 earned + ₦5,000 other received − ₦12,000 expenses → **₦55,000** total inflows and **₦43,000** net cash flow. Internal transfers do not change those figures.

## Browser storage

All records are saved in **this browser’s localStorage only**. Clearing site data, private browsing, or another device will not show the same records unless you export and restore a JSON backup.

Version 1 and Version 2 use **separate storage keys**, so switching branches on the same origin does not overwrite the other version’s data.

## Switch branches safely

```bash
git fetch origin
git checkout version-1   # simple tracker
git checkout version-2   # upgraded dashboard
npm install              # if dependencies changed
npm run dev
```

Commit or stash local changes before switching branches.

## License

Private assignment project.
