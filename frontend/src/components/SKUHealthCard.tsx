import { useEffect, useState } from 'react';
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
import { fetchSKUMetrics } from '../api/client';
import type { SKUMetricsResponse } from '../api/types';

const HEALTH_CONFIG = {
  healthy: { label: 'Healthy', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', Icon: CheckCircle },
  watch: { label: 'Watch', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', Icon: AlertTriangle },
  critical: { label: 'Critical', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', Icon: AlertTriangle },
  unknown: { label: 'No Data', color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200', Icon: HelpCircle },
} as const;

export default function SKUHealthCard({ itemId }: { itemId: string }) {
  const [metrics, setMetrics] = useState<SKUMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchSKUMetrics(itemId)
      .then((data) => { if (!cancelled) setMetrics(data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [itemId]);

  if (loading) {
    return (
      <div data-testid="sku-health-card" className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5 animate-pulse">
        <div className="h-4 w-24 bg-slate-100 rounded mb-3" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-slate-50 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!metrics || metrics.weeks_compared === 0) {
    return (
      <div data-testid="sku-health-card" className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <HelpCircle className="w-4 h-4" />
          <span>Forecast accuracy metrics not available</span>
        </div>
      </div>
    );
  }

  const { label, color, bg, border, Icon } = HEALTH_CONFIG[metrics.health];

  const metricItems = [
    { key: 'MAPE', value: metrics.mape != null ? `${metrics.mape}%` : '—' },
    { key: 'Bias', value: metrics.bias != null ? `${metrics.bias > 0 ? '+' : ''}${metrics.bias}%` : '—', icon: metrics.bias != null && metrics.bias > 0 ? TrendingUp : TrendingDown },
    { key: 'MAE', value: metrics.mae != null ? metrics.mae.toLocaleString() : '—' },
    { key: 'RMSE', value: metrics.rmse != null ? metrics.rmse.toLocaleString() : '—' },
  ];

  return (
    <div data-testid="sku-health-card" className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Forecast Health</h3>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${bg} ${border} border ${color}`}>
          <Icon className="w-3.5 h-3.5" />
          {label}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {metricItems.map((m) => (
          <div key={m.key} className="bg-slate-50/80 rounded-lg px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">{m.key}</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{m.value}</p>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-400 mt-3">
        Based on {metrics.weeks_compared} week{metrics.weeks_compared !== 1 ? 's' : ''} of forecast-vs-actual comparison
      </p>
    </div>
  );
}
