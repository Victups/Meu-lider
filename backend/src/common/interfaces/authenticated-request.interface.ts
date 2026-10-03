import type { Request } from 'express';
import type { JwtUser } from './jwt-payload.interface';

export interface AuthenticatedRequest extends Request {
  user: JwtUser;
}
