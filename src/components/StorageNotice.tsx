export function StorageNotice() {
  return (
    <div
      className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="status"
    >
      <strong className="font-semibold">Browser-only storage:</strong> Your records
      are saved in this browser&apos;s local storage only. Clearing site data or using
      another device will not show the same records unless you export a backup.
    </div>
  )
}
