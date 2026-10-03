import type { JwtUser } from '../../../common/interfaces';
import type { ChurchResponseDto } from '../dtos/church-response.dto';
import type { CreateChurchDto } from '../dtos/create-church.dto';
import type { UpdateChurchDto } from '../dtos/update-church.dto';

export interface IChurchesService {
  create(createChurchDto: CreateChurchDto, user: JwtUser): Promise<ChurchResponseDto>;
  findAll(): Promise<ChurchResponseDto[]>;
  findOne(id: string): Promise<ChurchResponseDto>;
  findBySlug(slug: string): Promise<ChurchResponseDto>;
  findUserChurches(userId: string): Promise<ChurchResponseDto[]>;
  update(id: string, updateData: UpdateChurchDto, user: JwtUser): Promise<ChurchResponseDto>;
  remove(id: string, user: JwtUser): Promise<ChurchResponseDto>;
}
