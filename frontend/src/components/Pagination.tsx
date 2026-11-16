export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm">{total} results</span>

      <div className="join">
        <button className="btn join-item btn-sm" disabled={page <= 0} onClick={() => onChange(page - 1)}>
          «
        </button>
        <button className="btn join-item btn-sm pointer-events-none">
          Page {page + 1} of {pages}
        </button>
        <button className="btn join-item btn-sm" disabled={page >= pages - 1} onClick={() => onChange(page + 1)}>
          »
        </button>
      </div>
    </div>
  );
}
