import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react';
import { fetchAlerts } from '../api/client';
import type { AlertItem } from '../api/types';

export default function AlertCards() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAlerts().then((res) => {
      setAlerts(res.alerts.slice(0, 12));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div>
        <div className="h-5 w-56 bg-slate-100 rounded mb-4 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200/60 p-5 animate-pulse h-[120px]" />
          ))}
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-8 text-center">
        <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-5 h-5 text-emerald-500" />
        </div>
        <p className="text-sm text-slate-500">No forecast accuracy alerts at this time.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Forecast Accuracy Alerts</h2>
          <p className="text-sm text-slate-500 mt-0.5">SKUs with MAPE above threshold</p>
        </div>
        <span className="text-xs text-slate-400">{alerts.length} items</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {alerts.map((alert) => {
          const isOver = alert.direction === 'over';
          return (
            <button
              key={alert.item_id}
              onClick={() => navigate(`/sku/${alert.item_id}`)}
              className="bg-white rounded-xl border border-slate-200/60 p-4 text-left
                         hover:border-slate-300 hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-mono text-slate-500 group-hover:text-primary-600 transition-colors leading-tight">
                  {alert.item_id.replace('CUST_003_', '')}
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                    isOver
                      ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                      : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                  }`}
                >
                  {isOver ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {isOver ? 'Over' : 'Under'}
                </span>
              </div>
              <div className="text-xl font-semibold text-slate-900 tabular-nums">
                {alert.mape > 999 ? '999+' : alert.mape.toFixed(0)}%
                <span className="text-xs font-normal text-slate-400 ml-1">MAPE</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1.5">
                {alert.weeks_compared}w compared &middot; Bias{' '}
                <span className={isOver ? 'text-amber-600' : 'text-rose-600'}>
                  {alert.bias > 0 ? '+' : ''}{alert.bias > 999 ? '999+' : alert.bias.toFixed(0)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
