import { useEffect, useState } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts';
import { fetchAggregateDemand } from '../api/client';
import type { AggregatePoint } from '../api/types';
import InfoTooltip from './InfoTooltip';

interface ChartRow {
  timestamp: string;
  label: string;
  historical: number | null;
  forecast: number | null;
  p10: number | null;
  p90: number | null;
}

function formatDate(ts: string) {
  const d = new Date(ts + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatNumber(val: number) {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toFixed(0);
}

export default function AggregatedDemandChart() {
  const [data, setData] = useState<ChartRow[]>([]);
  const [divider, setDivider] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAggregateDemand()
      .then((res) => {
        const points = res.data;
        const lastHist = points.filter((p: AggregatePoint) => p.source === 'historical').slice(-1)[0];
        const firstFc = points.find((p: AggregatePoint) => p.source === 'forecast');
        if (lastHist) setDivider(lastHist.timestamp);

        const rows: ChartRow[] = points.map((p: AggregatePoint) => ({
          timestamp: p.timestamp,
          label: formatDate(p.timestamp),
          historical: p.source === 'historical' ? p.value : null,
          forecast: p.source === 'forecast' ? p.value : null,
          p10: p.p10,
          p90: p.p90,
        }));

        if (lastHist && firstFc) {
          const bridgeIdx = rows.findIndex((r) => r.timestamp === firstFc.timestamp);
          if (bridgeIdx > 0) {
            rows[bridgeIdx].historical = rows[bridgeIdx - 1].historical;
          }
        }

        setData(rows);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load demand data');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
        <div className="h-5 w-72 bg-slate-100 rounded mb-6 animate-pulse" />
        <div className="h-[400px] bg-slate-50 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6 text-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div data-testid="aggregate-demand-chart" className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Aggregated Demand</h2>
          <p className="text-sm text-slate-500 mt-0.5">Last 13 weeks historical + 39 week forecast</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-600 rounded" /> Historical
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-violet-500 rounded border-b border-dashed" /> Forecast
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2.5 bg-violet-100 rounded" /> P10–P90
            <InfoTooltip text="80% confidence interval. The model estimates there is an 80% chance actual demand will fall within this shaded band. Wider bands indicate more uncertainty." />
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            interval={Math.floor(data.length / 8)}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickFormatter={formatNumber}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip
            formatter={(val, name) => [formatNumber(Number(val)), String(name)]}
            labelStyle={{ fontWeight: 600, color: '#1e293b', fontSize: 12 }}
            contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
          />
          {divider && (
            <ReferenceLine
              x={formatDate(divider)}
              stroke="#cbd5e1"
              strokeDasharray="4 4"
              label={{ value: 'Current Week', position: 'insideTopRight', fontSize: 10, fill: '#94a3b8' }}
            />
          )}
          <Area type="monotone" dataKey="p90" fill="#8b5cf6" fillOpacity={0.08} stroke="none" legendType="none" />
          <Area type="monotone" dataKey="p10" fill="#ffffff" fillOpacity={1} stroke="none" legendType="none" />
          <Line type="monotone" dataKey="historical" stroke="#2563eb" strokeWidth={2} dot={false} name="Historical" connectNulls={false} />
          <Line type="monotone" dataKey="forecast" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Forecast" connectNulls={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
