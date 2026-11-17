import { useEffect, useRef, useState } from 'react';
import { matchesSearch } from 'src/lib/sorting';

const MIN_OPTIONS_FOR_SEARCH = 10;

export interface MultiSelectProps {
  options: string[];
  selected: string[];
  placeholder: string;
  onChange: (selected: string[]) => void;
}

export function MultiSelect({ options, selected, placeholder, onChange }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [isOpen]);

  // Selected values stay visible, so they can be removed even when they are no longer offered.
  const sorted = [...new Set([...options, ...selected])]
    .filter((option) => matchesSearch(search, option))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const toggle = (option: string) => {
    onChange(selected.includes(option) ? selected.filter((x) => x !== option) : [...selected, option]);
  };

  const label = selected.length === 0 ? placeholder : selected.length === 1 ? selected[0] : `${selected.length} selected`;

  return (
    <div ref={containerRef} className="relative">
      <button type="button" className="select select-sm w-56 justify-start text-left" onClick={() => setIsOpen(!isOpen)}>
        <span className="truncate">{label}</span>
      </button>

      {isOpen && (
        <div className="panel absolute z-20 mt-1 flex max-h-96 w-72 flex-col overflow-hidden shadow-lg">
          <div className="border-base-300 flex items-center justify-between border-b px-3 py-2 text-sm">
            <span>{selected.length} selected</span>
            <button type="button" className="btn btn-ghost btn-xs" disabled={selected.length === 0} onClick={() => onChange([])}>
              Clear
            </button>
          </div>

          {options.length >= MIN_OPTIONS_FOR_SEARCH && (
            <div className="border-base-300 border-b p-2">
              <input
                type="search"
                className="input input-sm w-full"
                placeholder="Search"
                value={search}
                autoFocus
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          )}

          <ul className="overflow-y-auto py-1">
            {sorted.map((option) => (
              <li key={option}>
                <label className="hover:bg-base-200 flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-primary"
                    checked={selected.includes(option)}
                    onChange={() => toggle(option)}
                  />
                  {option}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
