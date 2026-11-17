import type { Key } from '@heroui/react';
import { Autocomplete, EmptyState, Header, ListBox, SearchField, Separator, useFilter } from '@heroui/react';
import { Fragment } from 'react';

export interface MultiSelectGroup {
  label: string;
  options: string[];
}

export interface MultiSelectProps {
  options: string[] | MultiSelectGroup[];
  selected: string[];
  placeholder: string;
  onChange: (selected: string[]) => void;
}

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

function toGroups(options: string[] | MultiSelectGroup[], selected: string[]): MultiSelectGroup[] {
  const groups: MultiSelectGroup[] = options.map((option) =>
    typeof option === 'string' ? { label: '', options: [option] } : option,
  );

  const offered = new Set(groups.flatMap((group) => group.options));

  // Selected values stay visible, so they can be removed even when they are no longer offered.
  const missing = selected.filter((value) => !offered.has(value));

  const ungrouped = [...groups.filter(({ label }) => !label).flatMap((group) => group.options), ...missing].sort(byName);
  const labeled = groups.filter(({ label }) => label).sort((a, b) => byName(a.label, b.label));

  return [...(ungrouped.length > 0 ? [{ label: '', options: ungrouped }] : []), ...labeled].map((group) => ({
    ...group,
    options: [...group.options].sort(byName),
  }));
}

export function MultiSelect({ options, selected, placeholder, onChange }: MultiSelectProps) {
  const { contains } = useFilter({ sensitivity: 'base' });
  const groups = toGroups(options, selected);

  // Keys must be unique, but an option can appear in several groups, e.g. a mercenary caster in several armies.
  const toKey = (label: string, option: string) => `${label}\u0000${option}`;
  const toValue = (key: Key) => String(key).split('\u0000').pop()!;

  const selectedKeys = groups.flatMap(({ label, options: values }) =>
    values.filter((value) => selected.includes(value)).map((value) => toKey(label, value)),
  );

  return (
    <Autocomplete
      aria-label={placeholder}
      className="w-72"
      placeholder={placeholder}
      selectionMode="multiple"
      value={selectedKeys}
      onChange={(keys) => onChange([...new Set((keys as Key[]).map(toValue))])}
    >
      <Autocomplete.Trigger>
        <Autocomplete.Value />
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField autoFocus aria-label="Search" name="search" variant="secondary">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
            {groups.map(({ label, options: values }, index) => (
              <Fragment key={label || 'ungrouped'}>
                {index > 0 && <Separator />}
                <ListBox.Section>
                  {label && <Header>{label}</Header>}
                  {values.map((value) => (
                    <ListBox.Item key={toKey(label, value)} id={toKey(label, value)} textValue={value}>
                      {value}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox.Section>
              </Fragment>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}
