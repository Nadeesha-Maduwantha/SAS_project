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
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${borderColor} px-5 py-4 flex items-center gap-4 shadow-sm`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBgClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  )
}