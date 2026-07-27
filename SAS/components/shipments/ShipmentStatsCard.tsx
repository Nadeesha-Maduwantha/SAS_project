import { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  label: string
  value: string | number
  iconBgClass?: string
  borderColor?: string
}

// Styled to match the dashboard's CardShell recipe (DashboardMetricCards.tsx):
// header row with tinted icon tile + bold title, hairline separator, big
// number in the body. borderColor is kept in Props for compatibility with
// existing callers but no longer rendered (dashboard cards have no stripe).
export function ShipmentStatsCard({
  icon,
  label,
  value,
  iconBgClass = 'bg-blue-100 text-blue-600',
  borderColor = 'border-l-blue-500',
}: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-[18px] py-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)] flex flex-col">
      <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-gray-100">
        {/* [&>svg] sizes whatever icon callers pass to the dashboard's 14px,
            so pages don't need editing */}
        <div className={`w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5 ${iconBgClass}`}>
          {icon}
        </div>
        <span className="text-xs font-bold text-gray-700 tracking-tight">{label}</span>
      </div>
      <p className="text-[26px] font-extrabold text-gray-900 leading-none tracking-tight tabular-nums">
        {value}
      </p>
    </div>
  )
}