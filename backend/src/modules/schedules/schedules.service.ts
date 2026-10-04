import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceType } from '../../common/constants';
import {
  DuplicateScheduleException,
  ResourceNotFoundException,
  TeamRoleNotInTeamException,
} from '../../common/exceptions';
import type { JwtUser } from '../../common/interfaces';
import { TeamRole } from '../teams/entities/team-role.entity';
import { CreateScheduleDto } from './dtos/create-schedule.dto';
import { ScheduleResponseDto } from './dtos/schedule-response.dto';
import { UpdateScheduleDto } from './dtos/update-schedule.dto';
import { TeamAccessService } from '../teams/team-access.service';
import { AutoScheduleService } from './auto-schedule/auto-schedule.service';
import { Schedule, ScheduleStatus } from './entities/schedule.entity';
import type { ScheduleStatistics } from './interfaces/schedule-statistics.interface';
import type { ISchedulesService } from './interfaces/schedules-service.interface';
import { toScheduleResponse, toScheduleResponseList } from './mappers/schedule-detail.mapper';
import { toScheduleSummary } from './mappers/schedule.mapper';

@Injectable()
export class SchedulesService implements ISchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    @InjectRepository(Schedule)
    private readonly schedulesRepository: Repository<Schedule>,
    @InjectRepository(TeamRole)
    private readonly teamRolesRepository: Repository<TeamRole>,
    private readonly autoScheduleService: AutoScheduleService,
    private readonly teamAccessService: TeamAccessService,
  ) {}

  async create(
    createScheduleDto: CreateScheduleDto,
    user: JwtUser,
  ): Promise<ScheduleResponseDto> {
    await this.teamAccessService.assertCanManageTeam(createScheduleDto.teamId, user);
    const { eventId, teamId, memberId, teamRoleId } = createScheduleDto;

    await this.assertTeamRoleBelongsToTeam(teamRoleId, teamId);

    const existingSchedule = await this.schedulesRepository.findOne({
      where: { eventId, teamId, memberId },
    });

    if (existingSchedule) {
      throw new DuplicateScheduleException(eventId, teamId, memberId);
    }

    const schedule = this.schedulesRepository.create(createScheduleDto);
    return toScheduleSummary(await this.schedulesRepository.save(schedule));
  }

  async findOne(id: string): Promise<ScheduleResponseDto> {
    return toScheduleResponse(await this.findScheduleEntity(id));
  }

  async findByEvent(eventId: string): Promise<ScheduleResponseDto[]> {
    const schedules = await this.schedulesRepository.find({
      where: { eventId },
      relations: { member: { user: true }, team: true, teamRole: true },
    });

    return toScheduleResponseList(schedules);
  }

  async findByMember(memberId: string): Promise<ScheduleResponseDto[]> {
    const schedules = await this.schedulesRepository.find({
      where: { memberId },
      relations: { event: true, team: true, teamRole: true },
      order: { event: { eventDate: 'ASC' } },
    });

    return toScheduleResponseList(schedules);
  }

  async confirm(id: string, user: JwtUser): Promise<ScheduleResponseDto> {
    const schedule = await this.findScheduleEntity(id);

    schedule.status = ScheduleStatus.CONFIRMED;
    schedule.confirmedAt = new Date();
    schedule.confirmedById = user.id;

    return toScheduleResponse(await this.schedulesRepository.save(schedule));
  }

  async decline(id: string): Promise<ScheduleResponseDto> {
    const schedule = await this.findScheduleEntity(id);
    schedule.status = ScheduleStatus.CANCELLED;

    const saved = await this.schedulesRepository.save(schedule);

    // The leader should not have to notice the hole: the engine fills it with
    // the next fairest person right away. A failure here must not fail the
    // decline — the member said no either way.
    try {
      await this.autoScheduleService.refillEvent(saved.eventId);
    } catch (error) {
      this.logger.warn(
        `Não foi possível repor a vaga do evento ${saved.eventId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return toScheduleResponse(await this.findScheduleEntity(id));
  }

  async update(
    id: string,
    updateData: UpdateScheduleDto,
    user: JwtUser,
  ): Promise<ScheduleResponseDto> {
    const schedule = await this.findScheduleEntity(id);
    await this.teamAccessService.assertCanManageTeam(schedule.teamId, user);

    // Moving a schedule to another team needs rights on the destination too.
    if (updateData.teamId && updateData.teamId !== schedule.teamId) {
      await this.teamAccessService.assertCanManageTeam(updateData.teamId, user);
    }

    // Either side of the pair can move, so the check runs on the resulting pair.
    if (updateData.teamRoleId !== undefined || updateData.teamId !== undefined) {
      await this.assertTeamRoleBelongsToTeam(
        updateData.teamRoleId ?? schedule.teamRoleId,
        updateData.teamId ?? schedule.teamId,
      );
    }

    Object.assign(schedule, updateData);
    // Any change to the assignment invalidates a previous confirmation.
    schedule.confirmedAt = null;
    schedule.confirmedById = null;
    schedule.status = ScheduleStatus.PENDING;

    return toScheduleResponse(await this.schedulesRepository.save(schedule));
  }

  async remove(id: string, user: JwtUser): Promise<void> {
    const schedule = await this.findScheduleEntity(id);
    await this.teamAccessService.assertCanManageTeam(schedule.teamId, user);

    await this.schedulesRepository.delete(schedule.id);
  }

  async getStatistics(eventId: string): Promise<ScheduleStatistics> {
    const schedules = await this.schedulesRepository.find({ where: { eventId } });

    return {
      total: schedules.length,
      confirmed: this.countByStatus(schedules, ScheduleStatus.CONFIRMED),
      pending: this.countByStatus(schedules, ScheduleStatus.PENDING),
      cancelled: this.countByStatus(schedules, ScheduleStatus.CANCELLED),
      noShow: this.countByStatus(schedules, ScheduleStatus.NO_SHOW),
    };
  }

  /** Nothing else stops a Louvor assignment from picking the Mídia "Fotógrafo". */
  private async assertTeamRoleBelongsToTeam(teamRoleId: string, teamId: string): Promise<void> {
    const teamRole = await this.teamRolesRepository.findOne({ where: { id: teamRoleId } });

    if (!teamRole) {
      throw new ResourceNotFoundException(ResourceType.TEAM_ROLE, teamRoleId);
    }

    if (teamRole.teamId !== teamId) {
      throw new TeamRoleNotInTeamException(teamRoleId, teamId);
    }
  }

  private countByStatus(schedules: Schedule[], status: ScheduleStatus): number {
    return schedules.filter((schedule) => schedule.status === status).length;
  }

  private async findScheduleEntity(id: string): Promise<Schedule> {
    const schedule = await this.schedulesRepository.findOne({
      where: { id },
      relations: { event: true, team: true, teamRole: true, member: true, confirmedBy: true },
    });

    if (!schedule) {
      throw new ResourceNotFoundException(ResourceType.SCHEDULE, id);
    }

    return schedule;
  }
}
