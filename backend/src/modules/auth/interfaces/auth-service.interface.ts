import type { UserResponseDto } from '../../users/dtos/user-response.dto';
import type {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from '../dtos/account.dto';
import type { AuthResponseDto } from '../dtos/auth-response.dto';
import type { LoginDto } from '../dtos/login.dto';
import type { RegisterDto } from '../dtos/register.dto';
import type { AuthTokens } from './auth-tokens.interface';

export interface IAuthService {
  register(registerDto: RegisterDto): Promise<AuthResponseDto>;
  login(loginDto: LoginDto): Promise<AuthResponseDto>;
  refresh(refreshToken: string): Promise<AuthTokens>;
  logout(userId: string): Promise<void>;
  me(userId: string): Promise<UserResponseDto>;
  updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserResponseDto>;
  /** Ends every other session and returns fresh tokens for this one. */
  changePassword(userId: string, dto: ChangePasswordDto): Promise<AuthTokens>;
  /** Always resolves, so the response never reveals which e-mails have an account. */
  forgotPassword(dto: ForgotPasswordDto): Promise<void>;
  resetPassword(dto: ResetPasswordDto): Promise<void>;
}
