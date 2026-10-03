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
}
