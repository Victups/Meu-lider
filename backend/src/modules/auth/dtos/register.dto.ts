import { IsEmail, IsString, MinLength, IsUUID } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(3)
  name: string;

  @IsUUID()
  churchId: string;
}
