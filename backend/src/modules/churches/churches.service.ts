import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceType } from '../../common/constants';
import {
  ChurchAccessDeniedException,
  ChurchSlugAlreadyExistsException,
  InsufficientPermissionException,
  ResourceNotFoundException,
} from '../../common/exceptions';
import type { JwtUser } from '../../common/interfaces';
import { UserRole } from '../users/entities/user.entity';
import { ChurchResponseDto } from './dtos/church-response.dto';
import { CreateChurchDto } from './dtos/create-church.dto';
import { UpdateChurchDto } from './dtos/update-church.dto';
import { Church } from './entities/church.entity';
import type { IChurchesService } from './interfaces/churches-service.interface';
import { toChurchResponse, toChurchResponseList } from './mappers/church.mapper';

@Injectable()
export class ChurchesService implements IChurchesService {
  constructor(
    @InjectRepository(Church)
    private readonly churchesRepository: Repository<Church>,
  ) {}

  async create(createChurchDto: CreateChurchDto, user: JwtUser): Promise<ChurchResponseDto> {
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new InsufficientPermissionException('Apenas o super admin pode criar igrejas');
    }

    await this.assertSlugIsAvailable(createChurchDto.slug);

    const church = this.churchesRepository.create(createChurchDto);
    return toChurchResponse(await this.churchesRepository.save(church));
  }

  async findAll(): Promise<ChurchResponseDto[]> {
    const churches = await this.churchesRepository.find({ where: { active: true } });
    return toChurchResponseList(churches);
  }

  async findOne(id: string): Promise<ChurchResponseDto> {
    return toChurchResponse(await this.findChurchEntity(id));
  }

  async findBySlug(slug: string): Promise<ChurchResponseDto> {
    const church = await this.churchesRepository.findOne({ where: { slug, active: true } });

    if (!church) {
      throw new ResourceNotFoundException(ResourceType.CHURCH, slug);
    }

    return toChurchResponse(church);
  }

  async findUserChurches(userId: string): Promise<ChurchResponseDto[]> {
    const churches = await this.churchesRepository
      .createQueryBuilder('church')
      .innerJoin('church.users', 'user', 'user.id = :userId', { userId })
      .where('church.active = :active', { active: true })
      .getMany();

    return toChurchResponseList(churches);
  }

  async update(
    id: string,
    updateData: UpdateChurchDto,
    user: JwtUser,
  ): Promise<ChurchResponseDto> {
    const church = await this.findChurchEntity(id);

    if (user.role !== UserRole.SUPER_ADMIN && user.churchId !== id) {
      throw new ChurchAccessDeniedException(id);
    }

    if (updateData.slug && updateData.slug !== church.slug) {
      await this.assertSlugIsAvailable(updateData.slug);
    }

    Object.assign(church, updateData);
    return toChurchResponse(await this.churchesRepository.save(church));
  }

  async remove(id: string, user: JwtUser): Promise<ChurchResponseDto> {
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new InsufficientPermissionException('Apenas o super admin pode remover igrejas');
    }

    const church = await this.findChurchEntity(id);
    church.active = false;

    return toChurchResponse(await this.churchesRepository.save(church));
  }

  private async findChurchEntity(id: string): Promise<Church> {
    const church = await this.churchesRepository.findOne({
      where: { id, active: true },
      relations: { users: true, teams: true, members: true },
    });

    if (!church) {
      throw new ResourceNotFoundException(ResourceType.CHURCH, id);
    }

    return church;
  }

  private async assertSlugIsAvailable(slug: string): Promise<void> {
    const existingChurch = await this.churchesRepository.findOne({ where: { slug } });

    if (existingChurch) {
      throw new ChurchSlugAlreadyExistsException(slug);
    }
  }
}
