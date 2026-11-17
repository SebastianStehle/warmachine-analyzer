const PERCENT = 100;

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return '–';
  }

  return `${Math.round(value * PERCENT)}%`;
}

export function share(part: number, total: number) {
  return total > 0 ? part / total : null;
}

const CENTS = 100;

export function formatPrice(cents: number | null | undefined, currency: string | null | undefined) {
  if (cents === null || cents === undefined || !currency) {
    return '–';
  }

  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / CENTS);
}
