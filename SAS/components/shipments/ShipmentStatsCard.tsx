import { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  label: string
  value: string | number
  iconBgClass?: string
  borderColor?: string
}

export function ShipmentStatsCard({
  icon,
  label,
  value,
  iconBgClass = 'bg-blue-100 text-blue-600',
  borderColor = 'border-l-blue-500',
}: Props) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${borderColor} px-4 py-3 flex items-center gap-3 shadow-sm`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBgClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  )
}