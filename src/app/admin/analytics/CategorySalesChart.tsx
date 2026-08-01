'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface CategorySales {
  category: string;
  total_sales: number;
  order_count: number;
}

// Recharts의 ResponsiveContainer가 SSR 중 DOM 크기를 측정하려다 실패하는 문제가
// 있어(SalesChart.tsx와 동일 이슈), 이 컴포넌트는 항상 next/dynamic({ssr:false})로만
// 불러와야 합니다.
export default function CategorySalesChart({ data }: { data: CategorySales[] }) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-sm text-muted">
        집계 기간 내 결제완료된 주문이 없습니다.
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#999' }} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#999' }}
            tickFormatter={(val) => `₩${(val / 10000).toLocaleString()}만`}
          />
          <Tooltip
            contentStyle={{ borderRadius: '0px', border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
            labelStyle={{ fontSize: '12px', color: '#333', marginBottom: '4px', fontWeight: 'bold' }}
            formatter={(val, name) =>
              name === 'total_sales' ? [`₩${Number(val).toLocaleString()}`, '매출액'] : [`${val}건`, '주문 건수']
            }
          />
          <Bar dataKey="total_sales" fill="#4A6741" radius={[4, 4, 0, 0]} animationDuration={1200} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
