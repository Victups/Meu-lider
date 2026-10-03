import type { JwtUser } from '../../../../common/interfaces';
import type { MaterializeOccurrencesDto } from '../dtos/materialize-occurrences.dto';
import type {
  MaterializeOccurrencesResultDto,
  OccurrencesPreviewDto,
} from '../dtos/occurrences-result.dto';

export interface IRecurrenceService {
  preview(
    churchId: string,
    eventId: string,
    options: MaterializeOccurrencesDto,
  ): Promise<OccurrencesPreviewDto>;

  materialize(
    churchId: string,
    eventId: string,
    options: MaterializeOccurrencesDto,
    user: JwtUser,
  ): Promise<MaterializeOccurrencesResultDto>;
}
