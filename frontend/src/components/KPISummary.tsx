import { useEffect, useState } from 'react';
import { Package, TrendingUp, BarChart3, AlertTriangle } from 'lucide-react';
import { fetchAggregateDemand, fetchSKUs, fetchAlerts } from '../api/client';

interface KPIData {
  totalSKUs: number;
  lastWeekUnits: number;
  alertCount: number;
  avgForecastNext4: number;
}

function formatNumber(val: number) {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toFixed(0);
}

export default function KPISummary() {
  const [kpi, setKpi] = useState<KPIData | null>(null);

  useEffect(() => {
    Promise.all([fetchAggregateDemand(), fetchSKUs(), fetchAlerts()]).then(
      ([agg, skus, alerts]) => {
        const hist = agg.data.filter((d) => d.source === 'historical');
        const fc = agg.data.filter((d) => d.source === 'forecast');
        const lastWeek = hist[hist.length - 1]?.value ?? 0;
        const avgFc = fc.slice(0, 4).reduce((s, d) => s + d.value, 0) / Math.max(fc.slice(0, 4).length, 1);
        setKpi({
          totalSKUs: skus.total,
          lastWeekUnits: lastWeek,
          alertCount: alerts.alerts.length,
          avgForecastNext4: avgFc,
        });
      },
    );
  }, []);

  if (!kpi) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200/60 p-5 animate-pulse h-[104px]" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Total SKUs',
      value: kpi.totalSKUs.toString(),
      icon: Package,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      valueColor: 'text-slate-900',
    },
    {
      label: 'Last Week Units',
      value: formatNumber(kpi.lastWeekUnits),
      icon: TrendingUp,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      valueColor: 'text-slate-900',
    },
    {
      label: 'Avg Forecast (4w)',
      value: formatNumber(kpi.avgForecastNext4),
      icon: BarChart3,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      valueColor: 'text-slate-900',
    },
    {
      label: 'Accuracy Alerts',
      value: kpi.alertCount.toString(),
      icon: AlertTriangle,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      valueColor: kpi.alertCount > 0 ? 'text-amber-600' : 'text-slate-900',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm
                     hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-9 h-9 ${c.iconBg} rounded-lg flex items-center justify-center`}>
              <c.icon className={`w-[18px] h-[18px] ${c.iconColor}`} />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{c.label}</span>
          </div>
          <div className={`text-2xl font-semibold ${c.valueColor} tabular-nums`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}
