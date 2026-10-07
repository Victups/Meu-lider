import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards';
import type { AuthenticatedRequest, MessageResponse } from '../../common/interfaces';
import type { UserResponseDto } from '../users/dtos/user-response.dto';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from './dtos/account.dto';
import { AuthResponseDto } from './dtos/auth-response.dto';
import { LoginDto } from './dtos/login.dto';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { RegisterDto } from './dtos/register.dto';
import type { AuthTokens } from './interfaces/auth-tokens.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthTokens> {
    return this.authService.refresh(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Request() req: AuthenticatedRequest): Promise<void> {
    await this.authService.logout(req.user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req: AuthenticatedRequest): Promise<UserResponseDto> {
    return this.authService.me(req.user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.authService.updateProfile(req.user.id, dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ): Promise<AuthTokens> {
    return this.authService.changePassword(req.user.id, dto);
  }

  // ponytail: no rate limit beyond 3 codes/hour per account; add @nestjs/throttler if abused.
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResponse> {
    await this.authService.forgotPassword(dto);
    return { message: 'Se o e-mail estiver cadastrado, enviamos um código.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponse> {
    await this.authService.resetPassword(dto);
    return { message: 'Senha redefinida. Entre com a nova senha.' };
  }
}
