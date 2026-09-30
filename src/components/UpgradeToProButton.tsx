import { getProAppUrl, isSimpleApp } from '../config/appVariant'

export function UpgradeToProButton({ compact = false }: { compact?: boolean }) {
  if (!isSimpleApp()) return null

  const proUrl = getProAppUrl()

  function goPro() {
    if (!proUrl) return
    window.location.href = proUrl
  }

  if (!proUrl) return null

  if (compact) {
    return (
      <button
        type="button"
        onClick={goPro}
        className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:from-indigo-500 hover:to-violet-500"
      >
        Upgrade to My Tracker Pro
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={goPro}
      className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500"
    >
      Upgrade to My Tracker Pro
    </button>
  )
}
