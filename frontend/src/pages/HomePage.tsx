import { BarChart3 } from 'lucide-react';
import SKUSearch from '../components/SKUSearch';
import KPISummary from '../components/KPISummary';
import AggregatedDemandChart from '../components/AggregatedDemandChart';
import AlertCards from '../components/AlertCards';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200/60 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center shadow-sm">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-semibold text-slate-900 tracking-tight">
              Demand Planning
            </span>
          </div>
          <SKUSearch />
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
        <KPISummary />
        <AggregatedDemandChart />
        <AlertCards />
      </main>

      <footer className="border-t border-slate-200/60 bg-white mt-8">
        <div className="max-w-[1400px] mx-auto px-6 py-4 text-xs text-slate-400">
          Demand Planning Dashboard &middot; Data as of 2025-04-20
        </div>
      </footer>
    </div>
  );
}
