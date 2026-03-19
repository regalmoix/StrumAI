import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { fetchSKUs } from '../api/client';

export default function SKUSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) return;

    const timer = setTimeout(async () => {
      const data = await fetchSKUs(query);
      setResults(data.skus.slice(0, 10));
      setOpen(true);
      setActiveIndex(-1);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(sku: string) {
    navigate(`/sku/${sku}`);
    setOpen(false);
    setQuery('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      handleSelect(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          data-testid="sku-search-input"
          type="text"
          value={query}
          onChange={(e) => {
            const nextQuery = e.target.value;
            setQuery(nextQuery);

            if (nextQuery.length < 2) {
              setResults([]);
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search SKU..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white
                     text-sm placeholder-slate-400 shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                     transition-shadow"
        />
      </div>
      {open && results.length > 0 && (
        <ul
          data-testid="sku-search-results"
          className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-lg shadow-xl
                     max-h-64 overflow-y-auto divide-y divide-slate-50"
        >
          {results.map((sku, i) => (
            <li key={sku}>
              <button
                data-testid={`sku-search-result-${sku}`}
                className={`w-full text-left px-3.5 py-2.5 text-sm font-mono transition-colors
                  ${i === activeIndex ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50'}`}
                onClick={() => handleSelect(sku)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                {sku}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
