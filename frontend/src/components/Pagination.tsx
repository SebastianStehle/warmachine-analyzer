import { Pagination as HeroPagination } from '@heroui/react';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

// Pages are zero based like the API.
export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <HeroPagination className="w-full">
      <HeroPagination.Summary>
        {total} results, page {page + 1} of {pages}
      </HeroPagination.Summary>
      <HeroPagination.Content>
        <HeroPagination.Item>
          <HeroPagination.Previous isDisabled={page <= 0} onPress={() => onChange(page - 1)}>
            <HeroPagination.PreviousIcon />
            <span>Previous</span>
          </HeroPagination.Previous>
        </HeroPagination.Item>
        <HeroPagination.Item>
          <HeroPagination.Next isDisabled={page >= pages - 1} onPress={() => onChange(page + 1)}>
            <span>Next</span>
            <HeroPagination.NextIcon />
          </HeroPagination.Next>
        </HeroPagination.Item>
      </HeroPagination.Content>
    </HeroPagination>
  );
}
