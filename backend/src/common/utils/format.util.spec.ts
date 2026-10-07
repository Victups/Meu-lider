import { describe, expect, it } from '@jest/globals';
import { generateInviteCode, normalizeInviteCode } from '../../modules/invitations/invitation-code.util';
import { formatEventWhen, formatShortDate, formatTime, formatWeekday } from './format.util';

describe('format.util (fuso de São Paulo, independente do relógio do servidor)', () => {
  // 2026-10-10 20:00 UTC = sábado 17:00 em São Paulo (UTC-3).
  const saturday = new Date(Date.UTC(2026, 9, 10, 20, 0));

  it('formata dia, hora e dia da semana no fuso do app', () => {
    expect(formatWeekday(saturday)).toBe('Sábado');
    expect(formatShortDate(saturday)).toBe('10/10');
    expect(formatTime(saturday)).toBe('17:00');
    expect(formatEventWhen(saturday)).toBe('Sábado, 10/10 às 17:00');
  });

  it('o dia vira conforme o fuso, não conforme UTC (01:30 UTC ainda é a noite anterior)', () => {
    expect(formatEventWhen(new Date(Date.UTC(2026, 9, 11, 1, 30)))).toBe('Sábado, 10/10 às 22:30');
  });
});

describe('código de convite', () => {
  it('tem 6 caracteres legíveis (sem I, O, 0, 1)', () => {
    for (let i = 0; i < 200; i += 1) expect(generateInviteCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });

  it('perdoa caixa, espaço e hífen ao digitar', () => {
    expect(normalizeInviteCode(' k7m-4qx ')).toBe('K7M4QX');
  });
});
