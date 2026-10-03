/** Error envelope returned by the backend's global exception filter. */
export interface ApiErrorBody {
  statusCode: number;
  errorCode: string;
  /** An array when class-validator rejects the payload, a string otherwise. */
  message: string | string[];
  timestamp: string;
  path: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
