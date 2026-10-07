import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(3)
  name: string;

  /** Short code a leader hands out; it decides the church and optionally the team. */
  @IsString()
  @Length(4, 16)
  inviteCode: string;
}
