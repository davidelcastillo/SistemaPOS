"use client";

import { useEffect, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export const SEARCH_DEBOUNCE_MS = 300;

interface SearchBarProps {
  onSearch: (query: string) => void;
}

/**
 * Inventory search input (SE-R2): debounces typing by 300ms before emitting
 * the settled query so `/api/inventario/search` is not hammered per keystroke.
 * SE-R4 — no barcode input: scanning is a business restriction, the only input
 * is free text search.
 */
export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    // Never emit on mount (empty query = no search yet). After the first
    // search, clearing the input emits "" so the list resets (SE-R2/R3).
    if (query === "" && !hasSearched) return;
    const timer = setTimeout(() => onSearch(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, hasSearched, onSearch]);

  return (
    <div className="relative">
      <MagnifyingGlassIcon
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#4A4A4A]"
      />
      <label htmlFor="inventory-search" className="sr-only">
        Buscar productos
      </label>
      <input
        id="inventory-search"
        type="search"
        placeholder="Buscar por nombre, SKU o categoría"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          if (event.target.value !== "") setHasSearched(true);
        }}
        className="w-full rounded-[2px] border border-[#4A4A4A] bg-white py-2 pl-10 pr-3 text-sm text-[#1A1A1A] outline-none transition-colors focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/30"
      />
    </div>
  );
}
