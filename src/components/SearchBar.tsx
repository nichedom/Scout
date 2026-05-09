import { useRef, useState, useCallback, useEffect } from 'react';
import type { LocationData } from '../types';

interface NominatimResult {
  place_id: number;
  display_name: string;
  name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
}

interface Props {
  onSelect: (loc: LocationData) => void;
  compact?: boolean;
}

export default function SearchBar({ onSelect, compact = false }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'ScoutApp/1.0' } }
      );
      const data: NominatimResult[] = await res.json();
      setResults(data);
      setShowDropdown(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 350);
  };

  const handleSelect = (result: NominatimResult) => {
    const name = result.name || result.display_name.split(',')[0];
    onSelect({
      name,
      address: result.display_name,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      placeId: String(result.place_id),
      types: [result.type, result.class].filter(Boolean),
    });
    setQuery(name);
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className={`relative transition-all duration-300 ${focused ? 'scale-[1.01]' : ''}`}>
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke={focused ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)'}
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          placeholder={compact ? 'Search places…' : 'Search any city, landmark, or neighborhood…'}
          onFocus={() => {
            setFocused(true);
            if (results.length > 0) setShowDropdown(true);
          }}
          onBlur={() => setFocused(false)}
          className={`
            w-full glass rounded-xl outline-none transition-all duration-300
            font-body text-white placeholder-white/25
            ${compact ? 'pl-10 pr-4 py-2.5 text-sm' : 'pl-12 pr-6 py-4 text-base'}
          `}
          style={{
            borderColor: focused ? 'rgba(255,255,255,0.2)' : 'var(--border)',
          }}
        />

        {!compact && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            {isSearching ? (
              <div className="w-3 h-3 border border-white/30 border-t-amber-400 rounded-full animate-spin" />
            ) : (
              <kbd className="text-[10px] text-white/20 font-mono border border-white/10 rounded px-1.5 py-0.5">
                Enter
              </kbd>
            )}
          </div>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 glass rounded-xl overflow-hidden border border-white/10">
          {results.map((r) => (
            <button
              key={r.place_id}
              onMouseDown={() => handleSelect(r)}
              className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
            >
              <div className="text-sm text-white/90 font-body truncate">
                {r.name || r.display_name.split(',')[0]}
              </div>
              <div className="text-xs text-white/30 font-mono truncate mt-0.5">
                {r.display_name}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
