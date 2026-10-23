interface OrdersStatusChartProps {
  data: { label: string; value: number }[]
}

/**
 * Répartition des commandes par statut : une barre d'encre par ligne, sa
 * valeur en clair. Un seul ton — la comparaison se lit à la longueur, pas à la
 * couleur, et le libellé reste lisible sans légende.
 */
export function OrdersStatusChart({ data }: OrdersStatusChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const max = Math.max(1, ...data.map((d) => d.value))

  if (total === 0) {
    return <p className="border-y border-hairline py-10 text-center text-md text-muted">Aucune commande.</p>
  }

  return (
    <dl className="border-t border-hairline">
      {data.map(({ label, value }) => {
        const pct = total > 0 ? Math.round((value / total) * 100) : 0
        return (
          <div key={label} className="border-b border-hairline py-3">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-md text-ink">{label}</dt>
              <dd className="text-sm tabular-nums text-muted">
                <span className="font-medium text-ink">{value}</span> · {pct} %
              </dd>
            </div>
            <div className="mt-2 h-1.5 w-full bg-placeholder" aria-hidden>
              <div className="h-full bg-ink" style={{ width: `${(value / max) * 100}%` }} />
            </div>
          </div>
        )
      })}
    </dl>
  )
}
