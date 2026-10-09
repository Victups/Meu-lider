import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../common/filters';
import { Church } from '../modules/churches/entities/church.entity';
import { MailService } from '../modules/auth/mail.service';
import { Member } from '../modules/members/entities/member.entity';
import { NotificationCronService } from '../modules/notifications/notification-cron.service';
import { User, UserRole } from '../modules/users/entities/user.entity';

try {
  process.loadEnvFile('.env');
} catch {
  // CI injects the variables directly.
}

const E2E_DB = 'igreja_escala_e2e';
process.env.DB_NAME = E2E_DB;
process.env.JWT_SECRET ??= 'e2e-secret';
process.env.REFRESH_TOKEN_SECRET ??= 'e2e-refresh-secret';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

interface Res<T = any> {
  status: number;
  body: T;
}

describe('Igreja Escala — fluxos de ponta a ponta (banco descartável)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let base: string;
  const mails: { to: string; text: string }[] = [];

  const api = async <T = any>(
    method: string,
    path: string,
    token?: string,
    body?: unknown,
  ): Promise<Res<T>> => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: (text ? JSON.parse(text) : null) as T };
  };

  // Shared state, filled in by the scenarios in order.
  let churchId: string;
  let admin: string;
  let teamA: string;
  let teamB: string;
  let dsRole: string;
  let liveRole: string;
  let vocalRole: string;
  const u: Record<'m1' | 'm2' | 'm3', { token: string; refresh: string; userId: string; memberId: string; email: string }> =
    {} as never;

  const login = async (email: string, password = 'senha-forte-1') =>
    (await api('POST', '/auth/login', undefined, { email, password })).body;

  const inbox = async (who: 'm1' | 'm2' | 'm3') =>
    (await api<any[]>('GET', '/notifications', u[who].token)).body;

  const createEvent = (name: string, at: Date, teamIds?: string[]) =>
    api('POST', `/churches/${churchId}/events`, admin, {
      name,
      eventDate: at.toISOString(),
      ...(teamIds ? { teamIds } : {}),
    });

  const schedulesOf = async (eventId: string) =>
    (await api<any[]>('GET', `/churches/${churchId}/schedules/events/${eventId}`, admin)).body;

  const manual = (eventId: string, teamId: string, memberId: string, teamRoleId: string) =>
    api('POST', `/churches/${churchId}/schedules`, admin, { eventId, teamId, memberId, teamRoleId });

  beforeAll(async () => {
    const root = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: 'postgres',
    });
    await root.initialize();
    await root.query(`DROP DATABASE IF EXISTS ${E2E_DB} WITH (FORCE)`);
    await root.query(`CREATE DATABASE ${E2E_DB}`);
    await root.destroy();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService)
      .useValue({
        send: async (to: string, _subject: string, text: string) => {
          mails.push({ to, text });
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.listen(0);
    base = await app.getUrl();
    base = base.replace('[::1]', 'localhost');
    ds = app.get(DataSource);

    const church = await ds.getRepository(Church).save(ds.getRepository(Church).create({ name: 'Igreja E2E', slug: 'e2e' }));
    churchId = church.id;
    const adminUser = await ds.getRepository(User).save(
      ds.getRepository(User).create({
        email: 'admin@e2e.test',
        passwordHash: await bcrypt.hash('admin-senha-1', 10),
        name: 'Admin',
        role: UserRole.CHURCH_ADMIN,
        churchId,
      }),
    );
    await ds.getRepository(Member).save(
      ds.getRepository(Member).create({ userId: adminUser.id, churchId, fullName: 'Admin' }),
    );
    admin = (await login('admin@e2e.test', 'admin-senha-1')).accessToken;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('migrations rodam do zero e o admin entra', () => {
    expect(admin).toBeTruthy();
  });

  describe('equipes, convite por código curto e liderança', () => {
    it('cria duas equipes e as funções', async () => {
      const a = await api('POST', `/churches/${churchId}/teams`, admin, { name: 'Mídia', slug: 'midia' });
      const b = await api('POST', `/churches/${churchId}/teams`, admin, { name: 'Louvor', slug: 'louvor' });
      expect([a.status, b.status]).toEqual([201, 201]);
      teamA = a.body.id;
      teamB = b.body.id;

      const mk = async (team: string, name: string) =>
        (await api('POST', `/churches/${churchId}/teams/${team}/roles`, admin, { name, defaultSlots: 1 })).body.id;
      dsRole = await mk(teamA, 'Data Show');
      liveRole = await mk(teamA, 'Live');
      vocalRole = await mk(teamB, 'Vocal');
      expect([dsRole, liveRole, vocalRole].every(Boolean)).toBe(true);
    });

    it('convite curto: prévia pública, uso por código digitado "à mão", limite de usos', async () => {
      const inv = await api('POST', `/churches/${churchId}/invitations`, admin, { teamId: teamA, maxUses: 3 });
      expect(inv.status).toBe(201);
      expect(inv.body.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
      expect(inv.body.shareText).toContain(inv.body.code);

      const preview = await api('GET', `/invitations/${inv.body.code.toLowerCase()}`);
      expect(preview.body).toMatchObject({ churchName: 'Igreja E2E', teamName: 'Mídia' });

      const typed = `${inv.body.code.slice(0, 3)}-${inv.body.code.slice(3)}`.toLowerCase();
      for (const key of ['m1', 'm2', 'm3'] as const) {
        const email = `${key}@e2e.test`;
        const res = await api('POST', '/auth/register', undefined, {
          email,
          password: 'senha-forte-1',
          name: `Pessoa ${key}`,
          inviteCode: typed,
        });
        expect(res.status).toBe(201);
        expect(res.body.user.churchId).toBe(churchId);
        u[key] = { token: res.body.accessToken, refresh: res.body.refreshToken, userId: res.body.user.id, memberId: '', email };
      }

      const fourth = await api('POST', '/auth/register', undefined, {
        email: 'm4@e2e.test', password: 'senha-forte-1', name: 'Quarta Pessoa', inviteCode: inv.body.code,
      });
      expect(fourth.status).toBe(400);
      expect(fourth.body.errorCode).toBe('INVALID_INVITATION');

      expect((await api('GET', '/invitations/ZZZZZZ')).status).toBe(400);
    });

    it('quem entra pelo convite já está na equipe do convite', async () => {
      const members = (await api<any[]>('GET', `/churches/${churchId}/members`, admin)).body;
      for (const key of ['m1', 'm2', 'm3'] as const) {
        u[key].memberId = members.find((m) => m.userId === u[key].userId).id;
      }
      const roster = (await api<any[]>('GET', `/churches/${churchId}/teams/${teamA}/members`, admin)).body;
      expect(roster.map((r) => r.memberId).sort()).toEqual(
        [u.m1.memberId, u.m2.memberId, u.m3.memberId].sort(),
      );
    });

    it('funções por pessoa; m1 também é membro da equipe B; líderes: m2 lidera A, m1 lidera B (multi-equipe)', async () => {
      const give = (team: string, who: 'm1' | 'm2' | 'm3', role: string) =>
        api('POST', `/churches/${churchId}/teams/${team}/members/${u[who].memberId}/roles/${role}`, admin, {});

      await give(teamA, 'm1', dsRole);
      await give(teamA, 'm2', dsRole);
      await give(teamA, 'm2', liveRole);
      await give(teamA, 'm3', liveRole);

      expect((await api('POST', `/churches/${churchId}/teams/${teamB}/members/${u.m1.memberId}`, admin, {})).status).toBe(201);
      await give(teamB, 'm1', vocalRole);

      expect((await api('PUT', `/churches/${churchId}/teams/${teamA}/members/${u.m2.memberId}/leader`, admin, { isLeader: true })).status).toBe(200);
      expect((await api('PUT', `/churches/${churchId}/teams/${teamB}/members/${u.m1.memberId}/leader`, admin, { isLeader: true })).status).toBe(200);

      // Only admins appoint leaders.
      expect((await api('PUT', `/churches/${churchId}/teams/${teamA}/members/${u.m3.memberId}/leader`, u.m2.token, { isLeader: true })).status).toBe(403);

      for (const key of ['m1', 'm2'] as const) {
        const session = await login(u[key].email);
        expect(session.user.role).toBe('LEADER');
        u[key].token = session.accessToken;
      }
      u.m3.token = (await login(u.m3.email)).accessToken;

      // The manual roster form: only people who cover the chosen position are offered.
      const covering = async (role: string) =>
        (await api<any[]>('GET', `/churches/${churchId}/teams/${teamA}/roles/${role}/members`, u.m2.token)).body.map((t) => t.memberId).sort();
      expect(await covering(dsRole)).toEqual([u.m1.memberId, u.m2.memberId].sort());
      expect(await covering(liveRole)).toEqual([u.m2.memberId, u.m3.memberId].sort());

      const led = async (token: string) =>
        (await api<any[]>('GET', `/churches/${churchId}/teams/led`, token)).body.map((t) => t.id).sort();
      expect(await led(u.m2.token)).toEqual([teamA]);
      expect(await led(u.m1.token)).toEqual([teamB]);
      expect(await led(u.m3.token)).toEqual([]);
      expect(await led(admin)).toEqual([teamA, teamB].sort());
    });

    it('a equipe do convite não pode ser de outra igreja nem alheia ao líder', async () => {
      // m1 leads B, not A: cannot invite into A, nor without a team.
      expect((await api('POST', `/churches/${churchId}/invitations`, u.m1.token, { teamId: teamA })).status).toBe(403);
      expect((await api('POST', `/churches/${churchId}/invitations`, u.m1.token, {})).status).toBe(403);
      expect((await api('POST', `/churches/${churchId}/invitations`, u.m1.token, { teamId: teamB })).status).toBe(201);
    });
  });

  describe('evento -> avisa líderes -> líder vincula a equipe -> escala', () => {
    let e1: string;
    let e1Date: Date;

    it('evento sem equipe avisa todos os líderes (e não o criador)', async () => {
      e1Date = new Date(Date.now() + 3 * DAY);
      e1Date.setMinutes(0, 0, 0);
      const res = await createEvent('Culto de Domingo', e1Date);
      expect(res.status).toBe(201);
      e1 = res.body.id;

      for (const key of ['m1', 'm2'] as const) {
        const n = (await inbox(key)).filter((x) => x.type === 'EVENT_CREATED');
        expect(n).toHaveLength(1);
        expect(n[0].relatedEventId).toBe(e1);
      }
      expect((await inbox('m3')).filter((x) => x.type === 'EVENT_CREATED')).toHaveLength(0);
    });

    it('líder só vincula a própria equipe', async () => {
      expect((await api('POST', `/churches/${churchId}/events/${e1}/teams/${teamB}`, u.m2.token, {})).status).toBe(403);
      expect((await api('POST', `/churches/${churchId}/events/${e1}/teams/${teamA}`, u.m1.token, {})).status).toBe(403);
    });

    it('m2 vincula A: a escala de A se monta e cada escalado recebe UM aviso', async () => {
      const res = await api('POST', `/churches/${churchId}/events/${e1}/teams/${teamA}`, u.m2.token, {});
      expect(res.status).toBe(201);

      const sch = await schedulesOf(e1);
      expect(sch).toHaveLength(2);
      expect(sch.every((s) => s.teamId === teamA)).toBe(true);

      for (const s of sch) {
        const key = (['m1', 'm2', 'm3'] as const).find((k) => u[k].memberId === s.memberId)!;
        expect((await inbox(key)).filter((x) => x.type === 'SCHEDULE_ASSIGNED' && x.relatedEventId === e1)).toHaveLength(1);
      }
    });

    it('multi-equipe: ao vincular B ninguém fica escalado duas vezes no mesmo evento', async () => {
      expect((await api('POST', `/churches/${churchId}/events/${e1}/teams/${teamB}`, u.m1.token, {})).status).toBe(201);
      const ids = (await schedulesOf(e1)).filter((s) => s.status !== 'CANCELLED').map((s) => s.memberId);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('um líder gerando só mexe nas equipes que lidera', async () => {
      const before = (await schedulesOf(e1)).filter((s) => s.teamId === teamB).length;
      const res = await api('POST', `/churches/${churchId}/events/${e1}/auto-schedule`, u.m2.token, {});
      expect(res.status).toBe(201);
      expect((await schedulesOf(e1)).filter((s) => s.teamId === teamB)).toHaveLength(before);
    });

    it('eventos sobrepostos: quem já serve naquele horário não é escalado de novo', async () => {
      const res = await createEvent('Reunião no mesmo horário', e1Date, [teamA]);
      expect(res.status).toBe(201);
      const inE1 = new Set((await schedulesOf(e1)).filter((s) => s.status !== 'CANCELLED').map((s) => s.memberId));
      const inE2 = (await schedulesOf(res.body.id)).map((s) => s.memberId);
      expect(inE2.some((id) => inE1.has(id))).toBe(false);
    });

    it('regra fixa de dias da semana vale: quem não serve em dia nenhum fica de fora', async () => {
      expect((await api('PUT', `/members/${u.m3.memberId}/availability/weekdays`, u.m3.token, { weekdays: [] })).status).toBe(200);
      const at = new Date(Date.now() + 5 * DAY);
      const res = await createEvent('Culto sem m3', at, [teamA]);
      const sch = await schedulesOf(res.body.id);
      expect(sch.some((s) => s.memberId === u.m3.memberId)).toBe(false);
    });
  });

  describe('trocas entre membros', () => {
    let s1: any;
    let s2: any;

    it('troca de dias: candidatos, pedido, aviso, aceite e as duas escalas trocam de dono', async () => {
      const at1 = new Date(Date.now() + 10 * DAY); at1.setHours(10, 0, 0, 0);
      const at2 = new Date(Date.now() + 11 * DAY); at2.setHours(10, 0, 0, 0);
      const ev1 = (await createEvent('Ensaio 1', at1)).body.id;
      const ev2 = (await createEvent('Ensaio 2', at2)).body.id;
      s1 = (await manual(ev1, teamA, u.m1.memberId, dsRole)).body;
      s2 = (await manual(ev2, teamA, u.m2.memberId, dsRole)).body;

      const cands = (await api<any[]>('GET', `/churches/${churchId}/swaps/exchange-candidates?scheduleId=${s1.id}`, u.m1.token)).body;
      expect(cands.map((c) => c.id)).toContain(s2.id);

      // Only the owner (or a manager) sees the options.
      expect((await api('GET', `/churches/${churchId}/swaps/exchange-candidates?scheduleId=${s1.id}`, u.m3.token)).status).toBe(403);

      const req = await api('POST', `/churches/${churchId}/swaps`, u.m1.token, { scheduleId: s1.id, counterScheduleId: s2.id });
      expect(req.status).toBe(201);
      expect((await inbox('m2')).filter((x) => x.type === 'SWAP_REQUESTED')).toHaveLength(1);

      // Same slot cannot be offered twice while the request is open.
      expect((await api('POST', `/churches/${churchId}/swaps`, u.m1.token, { scheduleId: s1.id, counterScheduleId: s2.id })).status).toBe(409);

      const mine = (await api<any>('GET', `/churches/${churchId}/swaps/mine`, u.m2.token)).body;
      expect(mine.incoming).toHaveLength(1);
      expect((await api<any>('GET', `/churches/${churchId}/swaps/mine`, u.m1.token)).body.outgoing).toHaveLength(1);

      // m1 cannot accept their own request; m3 is not the target.
      expect((await api('POST', `/churches/${churchId}/swaps/${req.body.id}/accept`, u.m3.token)).status).toBeGreaterThanOrEqual(400);

      const ok = await api('POST', `/churches/${churchId}/swaps/${req.body.id}/accept`, u.m2.token);
      expect(ok.status).toBe(201);
      expect(ok.body.status).toBe('ACCEPTED');

      const after1 = (await api('GET', `/churches/${churchId}/schedules/${s1.id}`, admin)).body;
      const after2 = (await api('GET', `/churches/${churchId}/schedules/${s2.id}`, admin)).body;
      expect(after1.memberId).toBe(u.m2.memberId);
      expect(after2.memberId).toBe(u.m1.memberId);
      expect((await inbox('m1')).filter((x) => x.type === 'SWAP_RESPONDED')).toHaveLength(1);
    });

    it('passar a vaga: recusa quem não cobre a função ou não serve naquele dia da semana', async () => {
      // m3 has no Data Show yet.
      let res = await api('POST', `/churches/${churchId}/swaps`, u.m2.token, { scheduleId: s1.id, targetMemberId: u.m3.memberId });
      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/função/);

      // Give m3 the role: still blocked by the standing "no weekday" rule.
      await api('POST', `/churches/${churchId}/teams/${teamA}/members/${u.m3.memberId}/roles/${dsRole}`, admin, {});
      res = await api('POST', `/churches/${churchId}/swaps`, u.m2.token, { scheduleId: s1.id, targetMemberId: u.m3.memberId });
      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/indisponível/);

      const open = await api<any[]>('GET', `/churches/${churchId}/swaps/handover-candidates?scheduleId=${s1.id}`, u.m2.token);
      expect(open.body.map((c) => c.memberId)).not.toContain(u.m3.memberId);
    });
  });

  describe('presença: todos presentes, líder só ajusta a falta', () => {
    it('marca falta e desfaz; evento futuro não aceita', async () => {
      const past = (await createEvent('Culto passado', new Date(Date.now() - 2 * HOUR))).body.id;
      const sch = (await manual(past, teamA, u.m1.memberId, dsRole)).body;

      const miss = await api('POST', `/churches/${churchId}/schedules/${sch.id}/no-show`, u.m2.token);
      expect(miss.body.status).toBe('NO_SHOW');
      expect((await api('POST', `/churches/${churchId}/schedules/${sch.id}/attended`, u.m2.token)).body.status).toBe('SCHEDULED');

      const future = (await createEvent('Culto futuro', new Date(Date.now() + 40 * DAY))).body.id;
      const fsch = (await manual(future, teamA, u.m1.memberId, dsRole)).body;
      const early = await api('POST', `/churches/${churchId}/schedules/${fsch.id}/no-show`, u.m2.token);
      expect(early.status).toBe(409);
      expect(early.body.errorCode).toBe('EVENT_NOT_STARTED');

      // A plain member cannot rule on attendance.
      expect((await api('POST', `/churches/${churchId}/schedules/${sch.id}/no-show`, u.m3.token)).status).toBe(403);
    });
  });

  describe('lembretes 24h / 12h / 1h', () => {
    it('envia na janela, uma única vez, e não repete', async () => {
      const at = new Date(Date.now() + 30 * HOUR);
      const ev = (await createEvent('Culto de lembrete', at)).body.id;
      await manual(ev, teamA, u.m1.memberId, dsRole);

      const cron = app.get(NotificationCronService);
      const day = new Date(at.getTime() - 24 * HOUR + 5 * 60 * 1000);

      expect(await cron.sendScheduleReminders(day)).toBe(1);
      expect(await cron.sendScheduleReminders(day)).toBe(0);
      expect(await cron.sendScheduleReminders(new Date(day.getTime() + 10 * 60 * 1000))).toBe(0);

      const hour = new Date(at.getTime() - HOUR + 5 * 60 * 1000);
      expect(await cron.sendScheduleReminders(hour)).toBe(1);

      const reminders = (await inbox('m1')).filter((x) => x.type === 'SCHEDULE_REMINDER');
      expect(reminders.map((r) => r.title).sort()).toEqual(
        expect.arrayContaining([expect.stringContaining('24 horas'), expect.stringContaining('1 hora')]),
      );
    });
  });

  describe('texto do WhatsApp e relatório', () => {
    it('gera a escala do mês com nomes e funções', async () => {
      const month = new Date(Date.now() + 10 * DAY)
        .toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
        .slice(0, 7);
      const res = await api<any>('GET', `/churches/${churchId}/schedule-share?month=${month}&teamId=${teamA}`, u.m3.token);
      expect(res.status).toBe(200);
      expect(res.body.text).toContain('*ESCALA');
      expect(res.body.text).toContain('Equipe Mídia');
      expect(res.body.text).toContain('📌 Ensaio 1');
      expect(res.body.text).toMatch(/▸ Data Show: Pessoa m\d/);
      expect((await api('GET', `/churches/${churchId}/schedule-share?month=2026-13`, u.m3.token)).status).toBe(400);
    });

    it('relatório de participação: só líderes/admin/pastores', async () => {
      const from = new Date(Date.now() - 30 * DAY).toISOString();
      const to = new Date(Date.now() + 60 * DAY).toISOString();
      const res = await api<any[]>('GET', `/churches/${churchId}/reports/participation?from=${from}&to=${to}`, admin);
      expect(res.status).toBe(200);
      const m1 = res.body.find((r) => r.memberId === u.m1.memberId);
      expect(m1.upcoming).toBeGreaterThan(0);
      expect(m1.noShow).toBe(0);
      expect((await api('GET', `/churches/${churchId}/reports/participation?from=${from}&to=${to}`, u.m3.token)).status).toBe(403);
    });
  });

  describe('conta: notificações, perfil e senha', () => {
    it('ninguém lê a caixa de entrada de outra pessoa', async () => {
      const mine = (await inbox('m1'))[0];
      expect((await api('GET', `/notifications/${mine.id}`, u.m3.token)).status).toBe(404);
      expect((await api('PUT', `/notifications/${mine.id}/read`, u.m3.token)).status).toBe(404);
      expect((await api('PUT', `/notifications/${mine.id}/read`, u.m1.token)).body.isRead).toBe(true);

      const count = await api<any>('GET', '/notifications/unread-count', u.m1.token);
      expect(count.body.count).toBeGreaterThanOrEqual(0);
      expect((await api('POST', '/notifications/read-all', u.m1.token)).status).toBe(201);
      expect((await api<any>('GET', '/notifications/unread-count', u.m1.token)).body.count).toBe(0);
    });

    it('token de push: formato inválido é ignorado e o aparelho passa de conta', async () => {
      const bad = await api<any>('POST', '/notifications/register-token', u.m1.token, { token: 'lixo' });
      expect(bad.body.message).toMatch(/inválido/);

      const token = 'ExponentPushToken[abcdefghijklmnopqrstuv]';
      await api('POST', '/notifications/register-token', u.m1.token, { token });
      await api('POST', '/notifications/register-token', u.m3.token, { token });

      const users = ds.getRepository(User);
      expect((await users.findOneByOrFail({ id: u.m1.userId })).expoPushToken).toBeNull();
      expect((await users.findOneByOrFail({ id: u.m3.userId })).expoPushToken).toBe(token);

      await api('POST', '/notifications/remove-token', u.m3.token);
      expect((await users.findOneByOrFail({ id: u.m3.userId })).expoPushToken).toBeNull();
    });

    it('perfil: nome e telefone (o nome acompanha o membro)', async () => {
      const res = await api<any>('PATCH', '/auth/me', u.m3.token, { name: 'Novo Nome', phone: '11999990000' });
      expect(res.body).toMatchObject({ name: 'Novo Nome', phone: '11999990000' });
      const member = (await api<any[]>('GET', `/churches/${churchId}/members`, admin)).body.find((m) => m.id === u.m3.memberId);
      expect(member.fullName).toBe('Novo Nome');
      expect((await api<any>('GET', '/auth/me', u.m3.token)).body.name).toBe('Novo Nome');
    });

    it('trocar senha: exige a atual, encerra as outras sessões e devolve tokens novos', async () => {
      const wrong = await api<any>('POST', '/auth/change-password', u.m3.token, { currentPassword: 'errada-123', newPassword: 'outra-senha-9' });
      expect(wrong.status).toBe(400);
      expect(wrong.body.errorCode).toBe('WRONG_PASSWORD');

      const ok = await api<any>('POST', '/auth/change-password', u.m3.token, { currentPassword: 'senha-forte-1', newPassword: 'outra-senha-9' });
      expect(ok.status).toBe(200);
      expect(ok.body.accessToken).toBeTruthy();
      expect((await api('POST', '/auth/refresh', undefined, { refreshToken: u.m3.refresh })).status).toBe(401);
      expect((await api('POST', '/auth/login', undefined, { email: u.m3.email, password: 'outra-senha-9' })).status).toBe(200);
    });

    it('esqueci a senha: código por e-mail, tentativa errada, código certo, sessões antigas caem', async () => {
      expect((await api('POST', '/auth/forgot-password', undefined, { email: 'ninguem@e2e.test' })).status).toBe(200);
      expect(mails).toHaveLength(0);

      expect((await api('POST', '/auth/forgot-password', undefined, { email: u.m2.email })).status).toBe(200);
      expect(mails).toHaveLength(1);
      const code = mails[0].text.match(/\b(\d{6})\b/)![1];

      const wrong = await api<any>('POST', '/auth/reset-password', undefined, { email: u.m2.email, code: code === '000000' ? '111111' : '000000', newPassword: 'nova-senha-77' });
      expect(wrong.status).toBe(400);
      expect(wrong.body.errorCode).toBe('INVALID_RESET_CODE');

      expect((await api('POST', '/auth/reset-password', undefined, { email: u.m2.email, code, newPassword: 'nova-senha-77' })).status).toBe(200);
      expect((await api('POST', '/auth/login', undefined, { email: u.m2.email, password: 'nova-senha-77' })).status).toBe(200);
      expect((await api('POST', '/auth/login', undefined, { email: u.m2.email, password: 'senha-forte-1' })).status).toBe(401);
      expect((await api('POST', '/auth/refresh', undefined, { refreshToken: u.m2.refresh })).status).toBe(401);

      // A code works once.
      expect((await api('POST', '/auth/reset-password', undefined, { email: u.m2.email, code, newPassword: 'outra-vez-88' })).status).toBe(400);
    });
  });
});
