import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { DollarSign, BarChart3 } from 'lucide-react';
import type { DemandDriversResponse } from '../api/types';

function formatDate(ts: string) {
  const d = new Date(ts + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface ChartRow {
  label: string;
  historicalPrice: number | null;
  projectedPrice: number | null;
  historicalInstock: number | null;
  projectedInstock: number | null;
}

export default function DemandDriversPanel({ drivers }: { drivers: DemandDriversResponse | null }) {
  if (!drivers) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200/60 p-5 animate-pulse h-[260px]" />
        <div className="bg-white rounded-xl border border-slate-200/60 p-5 animate-pulse h-[260px]" />
      </div>
    );
  }

  const lastN = drivers.historical.slice(-26);
  const projFirst = drivers.projected.slice(1);

  const rows: ChartRow[] = [];

  lastN.forEach((h) => {
    rows.push({
      label: formatDate(h.timestamp),
      historicalPrice: h.avg_unit_price,
      projectedPrice: null,
      historicalInstock: h.cust_instock ? +(h.cust_instock * 100).toFixed(1) : null,
      projectedInstock: null,
    });
  });

  if (lastN.length > 0 && projFirst.length > 0) {
    const lastHist = lastN[lastN.length - 1];
    rows.push({
      label: formatDate(projFirst[0].timestamp),
      historicalPrice: lastHist.avg_unit_price,
      projectedPrice: projFirst[0].avg_unit_price,
      historicalInstock: lastHist.cust_instock ? +(lastHist.cust_instock * 100).toFixed(1) : null,
      projectedInstock: projFirst[0].cust_instock ? +(projFirst[0].cust_instock * 100).toFixed(1) : null,
    });
    projFirst.slice(1).forEach((p) => {
      rows.push({
        label: formatDate(p.timestamp),
        historicalPrice: null,
        projectedPrice: p.avg_unit_price,
        historicalInstock: null,
        projectedInstock: p.cust_instock ? +(p.cust_instock * 100).toFixed(1) : null,
      });
    });
  }

  const legendItems = [
    { label: 'Historical', color: '#2563eb', dashed: false },
    { label: 'Projected', color: '#8b5cf6', dashed: true },
  ];

  const chartLegend = (
    <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-2">
      {legendItems.map((l) => (
        <span key={l.label} className="flex items-center gap-1">
          <span className={`w-2.5 h-0.5 rounded ${l.dashed ? 'border-b border-dashed border-violet-500' : ''}`}
                style={{ backgroundColor: l.dashed ? 'transparent' : l.color }} />
          {l.label}
        </span>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-blue-50 rounded-md flex items-center justify-center">
            <DollarSign className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Avg Unit Price</h3>
        </div>
        {chartLegend}
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={rows} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} interval={Math.floor(rows.length / 4)} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={35} domain={['auto', 'auto']} tickFormatter={(v) => `$${v}`} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 11 }} formatter={(v) => [`$${Number(v).toFixed(2)}`, '']} />
            <Line type="monotone" dataKey="historicalPrice" stroke="#2563eb" strokeWidth={1.5} dot={false} name="Historical" connectNulls={false} />
            <Line type="monotone" dataKey="projectedPrice" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Projected" connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-emerald-50 rounded-md flex items-center justify-center">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">In-Stock Rate</h3>
        </div>
        {chartLegend}
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={rows} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} interval={Math.floor(rows.length / 4)} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={35} domain={[80, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 11 }} formatter={(v) => [`${Number(v).toFixed(1)}%`, '']} />
            <Line type="monotone" dataKey="historicalInstock" stroke="#059669" strokeWidth={1.5} dot={false} name="Historical" connectNulls={false} />
            <Line type="monotone" dataKey="projectedInstock" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Projected" connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
