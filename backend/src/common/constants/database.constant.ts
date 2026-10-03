/** PostgreSQL SQLSTATE codes surfaced through TypeORM's `QueryFailedError.driverError`. */
export const PG_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
} as const;
