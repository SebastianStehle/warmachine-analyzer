import { useEffect, useState } from 'react';

const DEBOUNCE_MS = 300;

export interface SearchInputProps {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

// Debounced, so that server side searches do not send a request for every key stroke.
export function SearchInput({ value, placeholder, onChange }: SearchInputProps) {
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    if (text === value) {
      return;
    }

    const timer = setTimeout(() => onChange(text), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, value, onChange]);

  return (
    <label className="input input-sm w-full sm:w-72">
      <svg
        className="h-4 w-4 opacity-70"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input type="search" value={text} placeholder={placeholder ?? 'Search'} onChange={(event) => setText(event.target.value)} />
    </label>
  );
}
