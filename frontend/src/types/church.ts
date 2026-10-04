import type { ID, Timestamped } from './common';

export interface Church extends Timestamped {
  id: ID;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  website: string | null;
  active: boolean;
}

export interface CreateChurchInput {
  name: string;
  slug: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

/**
 * `null` clears a field. The API skips validation for null on every optional
 * rule, while an empty string would still be checked — and fail on `email`.
 */
export interface UpdateChurchInput {
  name?: string;
  slug?: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logoUrl?: string | null;
}
