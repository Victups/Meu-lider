/** UUID v4 as returned by the API. */
export type ID = string;

/** ISO-8601 timestamp. The API serialises every date this way. */
export type ISODateString = string;

export interface Timestamped {
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
