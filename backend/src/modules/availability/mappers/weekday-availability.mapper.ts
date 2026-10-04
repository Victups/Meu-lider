import { WeekdayAvailabilityResponseDto } from '../dtos/weekday-availability-response.dto';
import { WeekdayAvailability } from '../entities/weekday-availability.entity';

export function toWeekdayResponse(
  entry: WeekdayAvailability,
): WeekdayAvailabilityResponseDto {
  return { weekday: entry.weekday, isAvailable: entry.isAvailable };
}

export function toWeekdayResponseList(
  entries: WeekdayAvailability[],
): WeekdayAvailabilityResponseDto[] {
  return entries.map(toWeekdayResponse);
}
