import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateMemberDto {
  @IsUUID()
  userId: string;

  /** Taken from the route when omitted — the path param is the source of truth. */
  @IsOptional()
  @IsUUID()
  churchId: string;

  @IsString()
  @MinLength(3)
  fullName: string;

  @IsOptional()
  @IsString()
  @MaxLength(14)
  cpf?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthDate?: Date;
}
