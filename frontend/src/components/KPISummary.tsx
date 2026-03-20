import { useEffect, useState } from 'react';
import { Package, TrendingUp, TrendingDown, BarChart3, AlertTriangle, ShieldCheck } from 'lucide-react';
import { fetchAggregateDemand, fetchSKUs, fetchAlerts } from '../api/client';
import InfoTooltip from './InfoTooltip';

interface KPIData {
  totalSKUs: number;
  lastWeekUnits: number;
  prevWeekUnits: number | null;
  alertCount: number;
  avgForecastNext4: number;
  portfolioHealthPct: number;
}

const KPI_TOOLTIPS: Record<string, string> = {
  'Total SKUs': 'Number of unique products (Stock Keeping Units) being tracked in this portfolio.',
  'Last Week Units': 'Total units sold across all SKUs in the most recent completed week. The badge shows the week-over-week change.',
  'Avg Forecast (4w)': 'Average forecasted weekly units across all SKUs for the next 4 weeks, based on the latest AI model inference.',
  'Accuracy Alerts': 'SKUs where the AI forecast error (MAPE) exceeds 20%. These need human review — the model is struggling to predict them accurately.',
  'Portfolio Health': 'Percentage of SKUs with acceptable forecast accuracy (MAPE < 20%). Higher is better. Below 80% indicates widespread forecast quality issues.',
};

function formatNumber(val: number) {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toFixed(0);
}

function trendPct(current: number, previous: number | null): number | null {
  if (previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

interface TrendBadgeProps {
  pct: number | null;
}

function TrendBadge({ pct }: TrendBadgeProps) {
  if (pct == null) return null;
  const isUp = pct >= 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  const color = isUp ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50';
  return (
    <span data-testid="kpi-trend" className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${color}`}>
      <Icon className="w-3 h-3" />
      {isUp ? '+' : ''}{pct.toFixed(1)}%
    </span>
  );
}

export default function KPISummary() {
  const [kpi, setKpi] = useState<KPIData | null>(null);

  useEffect(() => {
    Promise.all([fetchAggregateDemand(), fetchSKUs(), fetchAlerts()]).then(
      ([agg, skus, alerts]) => {
        const hist = agg.data.filter((d) => d.source === 'historical');
        const fc = agg.data.filter((d) => d.source === 'forecast');
        const lastWeek = hist[hist.length - 1]?.value ?? 0;
        const prevWeek = hist.length >= 2 ? hist[hist.length - 2]?.value ?? null : null;
        const avgFc = fc.slice(0, 4).reduce((s, d) => s + d.value, 0) / Math.max(fc.slice(0, 4).length, 1);
        const healthyCount = skus.total - alerts.alerts.length;
        const healthPct = skus.total > 0 ? (healthyCount / skus.total) * 100 : 100;
        setKpi({
          totalSKUs: skus.total,
          lastWeekUnits: lastWeek,
          prevWeekUnits: prevWeek,
          alertCount: alerts.alerts.length,
          avgForecastNext4: avgFc,
          portfolioHealthPct: healthPct,
        });
      },
    );
  }, []);

  if (!kpi) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200/60 p-5 animate-pulse h-[104px]" />
        ))}
      </div>
    );
  }

  const weekTrend = trendPct(kpi.lastWeekUnits, kpi.prevWeekUnits);

  const cards = [
    {
      label: 'Total SKUs',
      value: kpi.totalSKUs.toString(),
      icon: Package,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      valueColor: 'text-slate-900',
      trend: null as number | null,
    },
    {
      label: 'Last Week Units',
      value: formatNumber(kpi.lastWeekUnits),
      icon: TrendingUp,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      valueColor: 'text-slate-900',
      trend: weekTrend,
    },
    {
      label: 'Avg Forecast (4w)',
      value: formatNumber(kpi.avgForecastNext4),
      icon: BarChart3,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      valueColor: 'text-slate-900',
      trend: null as number | null,
    },
    {
      label: 'Accuracy Alerts',
      value: kpi.alertCount.toString(),
      icon: AlertTriangle,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      valueColor: kpi.alertCount > 0 ? 'text-amber-600' : 'text-slate-900',
      trend: null as number | null,
    },
    {
      label: 'Portfolio Health',
      value: `${kpi.portfolioHealthPct.toFixed(0)}%`,
      icon: ShieldCheck,
      iconBg: kpi.portfolioHealthPct >= 80 ? 'bg-emerald-50' : kpi.portfolioHealthPct >= 50 ? 'bg-amber-50' : 'bg-red-50',
      iconColor: kpi.portfolioHealthPct >= 80 ? 'text-emerald-600' : kpi.portfolioHealthPct >= 50 ? 'text-amber-600' : 'text-red-600',
      valueColor: 'text-slate-900',
      trend: null as number | null,
    },
  ];

  return (
    <div data-testid="kpi-summary" className="grid grid-cols-2 lg:grid-cols-5 gap-5">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm
                     hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-9 h-9 ${c.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <c.icon className={`w-[18px] h-[18px] ${c.iconColor}`} />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1">
              {c.label}
              {KPI_TOOLTIPS[c.label] && <InfoTooltip text={KPI_TOOLTIPS[c.label]} />}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`text-2xl font-semibold ${c.valueColor} tabular-nums`}>{c.value}</div>
            <TrendBadge pct={c.trend} />
          </div>
        </div>
      ))}
    </div>
  );
}
