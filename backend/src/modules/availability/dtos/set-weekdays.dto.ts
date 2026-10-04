import { ArrayUnique, IsArray, IsInt, Max, Min } from 'class-validator';

export class SetWeekdaysDto {
  /** Weekdays the member can serve, 0 = Sunday … 6 = Saturday. */
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays: number[];
}
