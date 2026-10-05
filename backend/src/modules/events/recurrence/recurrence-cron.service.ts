import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { JwtUser } from '../../../common/interfaces';
import { Church } from '../../churches/entities/church.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { RecurrenceService } from './recurrence.service';

@Injectable()
export class RecurrenceCronService {
  private readonly logger = new Logger(RecurrenceCronService.name);

  constructor(
    private readonly recurrenceService: RecurrenceService,
    @InjectRepository(Church)
    private readonly churchesRepository: Repository<Church>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /** Runs on the 1st of every month at 02:00 AM. */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT, { name: 'materialize-month' })
  async handleMonthlyMaterialization(): Promise<void> {
    this.logger.log('Starting monthly materialization for all churches');

    const churches = await this.churchesRepository.find({ select: { id: true } });

    for (const church of churches) {
      try {
        const admin = await this.usersRepository.findOne({
          where: { churchId: church.id, role: UserRole.CHURCH_ADMIN },
        });

        if (!admin) {
          this.logger.warn(`No admin found for church ${church.id}, skipping`);
          continue;
        }

        const systemUser: JwtUser = {
          id: admin.id,
          email: admin.email,
          role: admin.role,
          churchId: church.id,
        };

        const results = await this.recurrenceService.materializeMonth(church.id, systemUser);
        const totalCreated = results.reduce((sum, r) => sum + r.createdCount, 0);

        this.logger.log(`Church ${church.id}: ${totalCreated} occurrences created from ${results.length} templates`);
      } catch (error) {
        this.logger.error(`Failed to materialize for church ${church.id}`, error);
      }
    }

    this.logger.log('Monthly materialization complete');
  }
}
