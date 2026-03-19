import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts';
import { ArrowLeft, PanelRightOpen, PanelRightClose, BarChart3 } from 'lucide-react';
import { fetchHistorical, fetchForecast, fetchPreviousYear, fetchDemandDrivers } from '../api/client';
import type { HistoricalRecord, ForecastRecord, DemandDriversResponse } from '../api/types';
import DemandDriversPanel from '../components/DemandDriversPanel';
import SKUSearch from '../components/SKUSearch';

interface ChartRow {
  timestamp: string;
  label: string;
  historical: number | null;
  forecast: number | null;
  previousYear: number | null;
  p10: number | null;
  p90: number | null;
}

function formatDate(ts: string) {
  const d = new Date(ts + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatNumber(val: number) {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toFixed(0);
}

export default function SKUDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const [chartData, setChartData] = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [drivers, setDrivers] = useState<DemandDriversResponse | null>(null);
  const [dividerLabel, setDividerLabel] = useState('');
  const [inferenceDate, setInferenceDate] = useState('');

  useEffect(() => {
    if (!itemId) return;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchHistorical(itemId, 13),
      fetchForecast(itemId),
    ])
      .then(async ([hist, fc]) => {
        setInferenceDate(fc.inference_date);

        const allTimestamps = [
          ...hist.data.map((h: HistoricalRecord) => h.timestamp),
          ...fc.forecasts.slice(0, 39).map((f: ForecastRecord) => f.timestamp),
        ];

        let prevYear: Record<string, number> = {};
        try {
          const pyData = await fetchPreviousYear(itemId, allTimestamps);
          prevYear = Object.fromEntries(pyData.map((p) => [p.timestamp, p.units_sold]));
        } catch {
          /* previous year data may not be available */
        }

        const lastHist = hist.data[hist.data.length - 1];
        if (lastHist) setDividerLabel(formatDate(lastHist.timestamp));

        const rows: ChartRow[] = [];
        hist.data.forEach((h: HistoricalRecord) => {
          rows.push({
            timestamp: h.timestamp, label: formatDate(h.timestamp),
            historical: h.units_sold, forecast: null,
            previousYear: prevYear[h.timestamp] ?? null, p10: null, p90: null,
          });
        });

        fc.forecasts.slice(0, 39).forEach((f: ForecastRecord, i: number) => {
          rows.push({
            timestamp: f.timestamp, label: formatDate(f.timestamp),
            historical: i === 0 && lastHist ? lastHist.units_sold : null,
            forecast: f.mean,
            previousYear: prevYear[f.timestamp] ?? null,
            p10: f.p10, p90: f.p90,
          });
        });

        setChartData(rows);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load data for this SKU');
        setLoading(false);
      });
  }, [itemId]);

  useEffect(() => {
    if (!itemId || !panelOpen) return;
    fetchDemandDrivers(itemId).then(setDrivers);
  }, [itemId, panelOpen]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200/60 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="w-8 h-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center
                         hover:opacity-90 transition-opacity shadow-sm"
            >
              <BarChart3 className="w-4 h-4 text-white" />
            </Link>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Link to="/" className="hover:text-slate-600 transition-colors flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                Home
              </Link>
              <span>/</span>
              <span className="font-mono text-slate-900 font-medium">{itemId}</span>
            </div>
            {inferenceDate && (
              <span className="hidden sm:inline-flex text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-medium">
                Inference {inferenceDate}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <SKUSearch />
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              title={panelOpen ? 'Close demand drivers' : 'Open demand drivers'}
              className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
                panelOpen
                  ? 'bg-primary-50 border-primary-200 text-primary-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              {panelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        {error ? (
          <div className="bg-white rounded-xl border border-red-200 shadow-sm p-8 text-center text-red-600">
            {error}
          </div>
        ) : (
          <div className="flex gap-6">
            <div className={`transition-all duration-300 ${panelOpen ? 'w-[60%]' : 'w-full'}`}>
              <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Demand Forecast</h2>
                    <p className="text-sm text-slate-500 mt-0.5">52-week view: 13w historical + 39w forecast</p>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-blue-600 rounded" /> Historical
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-violet-500 rounded" /> Forecast
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-amber-400 rounded" /> Prev Year
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-2.5 bg-violet-100 rounded" /> P10–P90
                    </span>
                  </div>
                </div>
                {loading ? (
                  <div className="animate-pulse h-[450px] bg-slate-50 rounded-lg" />
                ) : (
                  <ResponsiveContainer width="100%" height={450}>
                    <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                        interval={Math.floor(chartData.length / 8)}
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
                      {dividerLabel && (
                        <ReferenceLine
                          x={dividerLabel}
                          stroke="#cbd5e1"
                          strokeDasharray="4 4"
                          label={{ value: 'Current Week', position: 'insideTopRight', fontSize: 10, fill: '#94a3b8' }}
                        />
                      )}
                      <Area type="monotone" dataKey="p90" fill="#8b5cf6" fillOpacity={0.08} stroke="none" legendType="none" />
                      <Area type="monotone" dataKey="p10" fill="#ffffff" fillOpacity={1} stroke="none" legendType="none" />
                      <Line type="monotone" dataKey="historical" stroke="#2563eb" strokeWidth={2} dot={false} name="Historical" connectNulls={false} />
                      <Line type="monotone" dataKey="forecast" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Forecast" connectNulls={false} />
                      <Line type="monotone" dataKey="previousYear" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="Prev Year" connectNulls={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {panelOpen && (
              <div className="w-[40%] transition-all duration-300">
                <DemandDriversPanel drivers={drivers} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
