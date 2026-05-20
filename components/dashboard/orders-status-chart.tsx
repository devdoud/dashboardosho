'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface OrdersStatusChartProps {
  data: { name: string; value: number; color: string }[]
}

export function OrdersStatusChart({ data }: OrdersStatusChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [value, 'Commandes']}
          contentStyle={{
            background: 'hsl(0 0% 100%)',
            border: '1px solid hsl(214.3 31.8% 91.4%)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: '12px' }}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
