import { Link } from 'react-router-dom';
import { BarChart3, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <BarChart3 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-6xl font-bold text-slate-200 mb-2">404</h1>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Page not found</h2>
        <p className="text-sm text-slate-500 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
