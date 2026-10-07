import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, MoreThan, Repository } from 'typeorm';
import { CHURCH_MANAGER_ROLES, ResourceType } from '../../common/constants';
import {
  InsufficientPermissionException,
  InvalidInvitationException,
  ResourceNotFoundException,
} from '../../common/exceptions';
import type { JwtUser } from '../../common/interfaces';
import { formatShortDate } from '../../common/utils';
import { Church } from '../churches/entities/church.entity';
import { Team } from '../teams/entities/team.entity';
import { TeamAccessService } from '../teams/team-access.service';
import { CreateInvitationDto, INVITATION_DEFAULT_DAYS } from './dtos/create-invitation.dto';
import { InvitationPreviewDto, InvitationResponseDto } from './dtos/invitation-response.dto';
import { Invitation } from './entities/invitation.entity';
import { generateInviteCode, normalizeInviteCode } from './invitation-code.util';

const DAY_MS = 24 * 60 * 60 * 1000;
const CODE_ATTEMPTS = 8;

/**
 * Short codes a leader hands to newcomers, in place of a 36-character church id.
 * A code names the church and, optionally, a team to join on sign-up. Admins may
 * invite into any team (or none); a leader only into teams they lead.
 */
@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private readonly invitationsRepository: Repository<Invitation>,
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    @InjectRepository(Church)
    private readonly churchesRepository: Repository<Church>,
    private readonly teamAccessService: TeamAccessService,
  ) {}

  async create(
    churchId: string,
    dto: CreateInvitationDto,
    user: JwtUser,
  ): Promise<InvitationResponseDto> {
    const isAdmin = CHURCH_MANAGER_ROLES.includes(user.role);

    if (!isAdmin && !dto.teamId) {
      throw new InsufficientPermissionException(
        'Líderes convidam para a própria equipe: escolha a equipe do convite',
      );
    }

    if (dto.teamId) {
      await this.teamAccessService.assertCanManageTeam(dto.teamId, user);

      const team = await this.teamsRepository.findOne({
        where: { id: dto.teamId, churchId, active: true },
      });
      if (!team) throw new ResourceNotFoundException(ResourceType.TEAM, dto.teamId);
    }

    const expiresAt = new Date(
      Date.now() + (dto.expiresInDays ?? INVITATION_DEFAULT_DAYS) * DAY_MS,
    );

    const saved = await this.saveWithUniqueCode({
      churchId,
      teamId: dto.teamId ?? null,
      createdById: user.id,
      expiresAt,
      maxUses: dto.maxUses ?? null,
    });

    return (await this.toResponses([saved], churchId))[0];
  }

  async findByChurch(churchId: string, user: JwtUser): Promise<InvitationResponseDto[]> {
    const mine = CHURCH_MANAGER_ROLES.includes(user.role) ? {} : { createdById: user.id };

    const invitations = await this.invitationsRepository.find({
      where: { churchId, active: true, expiresAt: MoreThan(new Date()), ...mine },
      order: { createdAt: 'DESC' },
    });

    const open = invitations.filter(
      (invitation) => invitation.maxUses === null || invitation.usedCount < invitation.maxUses,
    );

    return this.toResponses(open, churchId);
  }

  async revoke(churchId: string, id: string, user: JwtUser): Promise<void> {
    const invitation = await this.invitationsRepository.findOne({ where: { id, churchId } });
    if (!invitation) throw new ResourceNotFoundException(ResourceType.INVITATION, id);

    const isAdmin = CHURCH_MANAGER_ROLES.includes(user.role);
    if (!isAdmin && invitation.createdById !== user.id) {
      throw new InsufficientPermissionException('Você só pode cancelar convites que você criou');
    }

    invitation.active = false;
    await this.invitationsRepository.save(invitation);
  }

  /** Public: lets the sign-up screen confirm where the code leads before asking for a password. */
  async preview(rawCode: string): Promise<InvitationPreviewDto> {
    const invitation = await this.invitationsRepository.findOne({
      where: { code: normalizeInviteCode(rawCode) },
      relations: { church: true, team: true },
    });

    if (!invitation || !this.isUsable(invitation)) throw new InvalidInvitationException();

    return {
      code: invitation.code,
      churchName: invitation.church.name,
      teamName: invitation.team?.name ?? null,
    };
  }

  /**
   * Spends one use of the code inside the caller's transaction, so a sign-up that
   * fails later never burns an invitation and two sign-ups can never share the
   * last use.
   */
  async consume(manager: EntityManager, rawCode: string): Promise<Invitation> {
    const invitation = await manager.findOne(Invitation, {
      where: { code: normalizeInviteCode(rawCode) },
      lock: { mode: 'pessimistic_write' },
    });

    if (!invitation || !this.isUsable(invitation)) throw new InvalidInvitationException();

    invitation.usedCount += 1;
    return manager.save(invitation);
  }

  private isUsable(invitation: Invitation): boolean {
    return (
      invitation.active &&
      invitation.expiresAt.getTime() > Date.now() &&
      (invitation.maxUses === null || invitation.usedCount < invitation.maxUses)
    );
  }

  private async saveWithUniqueCode(data: Partial<Invitation>): Promise<Invitation> {
    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
      const code = generateInviteCode();

      if (await this.invitationsRepository.exists({ where: { code } })) continue;

      return this.invitationsRepository.save(this.invitationsRepository.create({ ...data, code }));
    }

    throw new Error('Não foi possível gerar um código de convite único');
  }

  private async toResponses(
    invitations: Invitation[],
    churchId: string,
  ): Promise<InvitationResponseDto[]> {
    const church = await this.churchesRepository.findOne({ where: { id: churchId } });
    const teamIds = [
      ...new Set(invitations.map((i) => i.teamId).filter((id): id is string => id !== null)),
    ];
    const teams = teamIds.length
      ? await this.teamsRepository.find({ where: { id: In(teamIds) } })
      : [];
    const teamName = new Map(teams.map((team) => [team.id, team.name]));

    return invitations.map((invitation) => {
      const team = invitation.teamId ? (teamName.get(invitation.teamId) ?? null) : null;

      return {
        id: invitation.id,
        code: invitation.code,
        churchId: invitation.churchId,
        teamId: invitation.teamId,
        teamName: team,
        expiresAt: invitation.expiresAt,
        maxUses: invitation.maxUses,
        usedCount: invitation.usedCount,
        active: invitation.active,
        createdAt: invitation.createdAt,
        shareText: this.buildShareText(church?.name ?? 'nossa igreja', team, invitation),
      };
    });
  }

  private buildShareText(
    churchName: string,
    teamName: string | null,
    invitation: Invitation,
  ): string {
    const where = teamName ? `na equipe *${teamName}* da ${churchName}` : `na ${churchName}`;

    return [
      `Você foi convidado(a) para servir ${where}! 🙌`,
      '',
      'Baixe o app *Igreja Escala*, toque em *Criar conta* e use o código:',
      `*${invitation.code}*`,
      '',
      `Vale até ${formatShortDate(invitation.expiresAt)}.`,
    ].join('\n');
  }
}
