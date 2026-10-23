'use client'

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface RevenueChartProps {
  data: { month: string; revenue: number }[]
}

// L'encre pour les mois passés, un seul accent pour le mois en cours.
// Les couleurs sont des jetons CSS, donc suivent le thème.
export function RevenueChart({ data }: RevenueChartProps) {
  const last = data.length - 1
  return (
    <figure>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--hairline)" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12.5, fill: 'var(--muted)' }}
            axisLine={{ stroke: 'var(--hairline)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12.5, fill: 'var(--muted)' }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            cursor={{ fill: 'var(--surface)' }}
            formatter={(value: number) => [formatCurrency(value), 'Revenus']}
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--hairline)',
              borderRadius: 2,
              boxShadow: 'none',
              color: 'var(--ink)',
              fontSize: 13.5,
            }}
            labelStyle={{ color: 'var(--muted)' }}
            itemStyle={{ color: 'var(--ink)' }}
          />
          <Bar dataKey="revenue" radius={0} isAnimationActive={false}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === last ? 'var(--accent)' : 'var(--ink)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <figcaption className="mt-2 flex items-center gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 bg-ink" aria-hidden /> Mois écoulés
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 bg-accent" aria-hidden /> Mois en cours
        </span>
      </figcaption>
    </figure>
  )
}
