import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import { getRecentSKUs } from '../lib/recentSKUs';

export default function RecentlyViewedSKUs() {
  const [recent] = useState(getRecentSKUs);

  if (recent.length === 0) return null;

  return (
    <div data-testid="recently-viewed-skus" className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">Recently Viewed</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {recent.map((skuId) => (
          <Link
            key={skuId}
            to={`/sku/${skuId}`}
            data-testid={`recent-sku-${skuId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200
                       hover:border-blue-200 rounded-lg text-sm font-mono font-medium text-slate-700 hover:text-blue-700
                       transition-colors"
          >
            {skuId}
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </div>
  );
}
