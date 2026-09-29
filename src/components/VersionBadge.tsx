export function VersionBadge({ version }: { version: 1 | 2 }) {
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-600/20">
      Version {version}
    </span>
  )
}
