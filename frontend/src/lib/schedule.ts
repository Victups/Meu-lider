import { SCHEDULE_STATUS_LABEL, type Schedule } from '@/types';

/** Status that still means "this person holds the slot". */
export function holdsSlot(schedule: Pick<Schedule, 'status'>): boolean {
  return schedule.status === 'SCHEDULED' || schedule.status === 'CONFIRMED';
}

export function hasStarted(schedule: Pick<Schedule, 'event'>): boolean {
  return schedule.event ? new Date(schedule.event.eventDate).getTime() <= Date.now() : false;
}

/**
 * Nobody confirms attendance: once the event happened, everyone who held a slot
 * counts as present unless a leader recorded an absence.
 */
export function statusLabel(schedule: Schedule): string {
  return holdsSlot(schedule) && hasStarted(schedule)
    ? 'Presente'
    : SCHEDULE_STATUS_LABEL[schedule.status];
}
