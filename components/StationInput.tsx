"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Station } from "@/lib/types";

interface Props {
  label: string;
  placeholder: string;
  value: Station | null;
  onChange: (station: Station | null) => void;
}

export default function StationInput({ label, placeholder, value, onChange }: Props) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<Station[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchStations = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/stations?q=${encodeURIComponent(q)}`);
      const data: Station[] = await res.json();
      setResults(data.slice(0, 8));
      setIsOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (value) onChange(null); // clear selection on re-type

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchStations(val), 300);
  };

  const handleSelect = (stn: Station) => {
    setQuery(`${stn.code} — ${stn.name}`);
    onChange(stn);
    setIsOpen(false);
    setResults([]);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1">
      <label className="text-sm font-semibold text-neutral-600">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-4 py-3 pr-10 rounded-xl border-2 border-neutral-200 
                     focus:border-primary-500 focus:outline-none transition-colors 
                     bg-white text-neutral-800 placeholder:text-neutral-400 text-sm font-medium"
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 animate-spin">
            ⟳
          </span>
        )}
        {value && !loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-lg">✓</span>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul className="absolute top-full mt-1 left-0 right-0 z-50 bg-white border border-neutral-200 
                       rounded-xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-neutral-100">
          {results.map((stn) => (
            <li
              key={stn.id}
              onMouseDown={() => handleSelect(stn)}
              className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-primary-50 
                         transition-colors group"
            >
              <span className="mt-0.5 flex-shrink-0 w-9 h-6 flex items-center justify-center 
                               bg-primary-100 text-primary-700 rounded font-mono text-xs font-bold">
                {stn.code}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-neutral-800 truncate group-hover:text-primary-700">
                  {stn.name}
                </span>
                <span className="text-xs text-neutral-400">{stn.displayName}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
