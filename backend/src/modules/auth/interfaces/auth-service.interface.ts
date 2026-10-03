import type { AuthResponseDto } from '../dtos/auth-response.dto';
import type { LoginDto } from '../dtos/login.dto';
import type { RegisterDto } from '../dtos/register.dto';
import type { AuthTokens } from './auth-tokens.interface';

export interface IAuthService {
  register(registerDto: RegisterDto): Promise<AuthResponseDto>;
  login(loginDto: LoginDto): Promise<AuthResponseDto>;
  refresh(refreshToken: string): Promise<AuthTokens>;
  logout(userId: string): Promise<void>;
}
