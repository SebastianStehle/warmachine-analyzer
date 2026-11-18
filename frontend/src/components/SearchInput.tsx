import { SearchField } from '@heroui/react';
import { useEffect, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { texts } from 'src/texts';

const DEBOUNCE_MS = 300;

export interface SearchInputProps {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

// Debounced, so that server side searches do not send a request for every key stroke.
export function SearchInput({ value, placeholder, onChange }: SearchInputProps) {
  const [text, setText] = useState(value);
  const debouncedChange = useDebouncedCallback(onChange, DEBOUNCE_MS);

  useEffect(() => {
    setText(value);
  }, [value]);

  return (
    <SearchField
      aria-label={placeholder ?? texts.common.search}
      className="w-full sm:w-72"
      value={text}
      onChange={(next) => {
        setText(next);
        debouncedChange(next);
      }}
    >
      <SearchField.Group>
        <SearchField.SearchIcon />
        <SearchField.Input placeholder={placeholder ?? texts.common.search} />
        <SearchField.ClearButton />
      </SearchField.Group>
    </SearchField>
  );
}
