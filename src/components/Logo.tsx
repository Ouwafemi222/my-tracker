export function Logo({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-[#1a3a2f] shadow-lg shadow-[#1a3a2f]/25 ${className}`}
      aria-hidden
    >
      <span className="font-serif text-[1.15em] font-semibold leading-none text-[#d6ee7a]">₦</span>
    </div>
  )
}
