import type { UserResponseDto } from '../../users/dtos/user-response.dto';
import type { AuthTokens } from '../interfaces/auth-tokens.interface';

export class AuthResponseDto implements AuthTokens {
  user: UserResponseDto;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
