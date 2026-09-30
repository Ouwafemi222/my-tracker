export function Logo({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-md shadow-emerald-600/25 ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" className="h-[55%] w-[55%] text-white" fill="none">
        <path
          d="M16 4c-2 8-8 10-8 16a8 8 0 0016 0c0-6-6-8-8-16z"
          fill="currentColor"
          opacity="0.95"
        />
        <path
          d="M16 20v8M12 24h8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
