import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  token: string;
}
