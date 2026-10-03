export interface PaginationQuery {
  page: number;
  pageSize: number;
}

/** Matches the `Paginated<T>` envelope the clients already consume. */
export interface PaginatedResult<TItem> extends PaginationQuery {
  items: TItem[];
  total: number;
}
