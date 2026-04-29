interface BadgeProps {
  label: string
  variant?: 'green' | 'red' | 'yellow' | 'blue' | 'gray'
}

const variants = {
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  blue: 'bg-blue-100 text-blue-800',
  gray: 'bg-gray-100 text-gray-600',
}

export function Badge({ label, variant = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {label}
    </span>
  )
}

export function intentBadge(intent: string | null) {
  if (intent === 'high') return <Badge label="High" variant="red" />
  if (intent === 'medium') return <Badge label="Medium" variant="yellow" />
  if (intent === 'low') return <Badge label="Low" variant="gray" />
  return <Badge label="—" variant="gray" />
}

export function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    new: { label: 'New', variant: 'blue' },
    in_progress: { label: 'In Progress', variant: 'yellow' },
    qualified: { label: 'Qualified', variant: 'green' },
    booked: { label: 'Booked', variant: 'green' },
    lost: { label: 'Lost', variant: 'gray' },
    active: { label: 'Active', variant: 'green' },
    inactive: { label: 'Inactive', variant: 'gray' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'gray' as const }
  return <Badge label={label} variant={variant} />
}
