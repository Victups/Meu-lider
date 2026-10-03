import * as bcrypt from 'bcryptjs';
import { BCRYPT_SALT_ROUNDS } from '../common/constants';
import dataSource from '../config/data-source';
import { Church } from '../modules/churches/entities/church.entity';
import { Member } from '../modules/members/entities/member.entity';
import { Team } from '../modules/teams/entities/team.entity';
import { TeamRole } from '../modules/teams/entities/team-role.entity';
import { User, UserRole } from '../modules/users/entities/user.entity';

const SEED = {
  churchName: process.env.SEED_CHURCH_NAME ?? 'Igreja Local',
  churchSlug: process.env.SEED_CHURCH_SLUG ?? 'igreja-local',
  adminName: process.env.SEED_ADMIN_NAME ?? 'Administrador',
  adminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@igrejaescala.local',
  adminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'admin1234',
};

const SEED_TEAMS = [
  {
    name: 'Louvor',
    slug: 'louvor',
    color: '#7C3AED',
    roles: [
      { name: 'Vocal', slug: 'vocal', defaultSlots: 3 },
      { name: 'Teclado', slug: 'teclado', defaultSlots: 1 },
      { name: 'Baixo', slug: 'baixo', defaultSlots: 1 },
      { name: 'Violino', slug: 'violino', defaultSlots: 1 },
    ],
  },
  {
    name: 'Mídia',
    slug: 'midia',
    color: '#0EA5E9',
    roles: [
      { name: 'Fotógrafo', slug: 'fotografo', defaultSlots: 1 },
      { name: 'Videomaker', slug: 'videomaker', defaultSlots: 1 },
    ],
  },
];

async function seedTeamsAndRoles(churchId: string): Promise<void> {
  const teams = dataSource.getRepository(Team);
  const teamRoles = dataSource.getRepository(TeamRole);

  for (const seedTeam of SEED_TEAMS) {
    let team = await teams.findOne({ where: { churchId, slug: seedTeam.slug } });
    if (!team) {
      team = await teams.save(
        teams.create({
          churchId,
          name: seedTeam.name,
          slug: seedTeam.slug,
          color: seedTeam.color,
        }),
      );
      console.log(`equipe criada: ${team.name}`);
    }

    for (const seedRole of seedTeam.roles) {
      const existingRole = await teamRoles.findOne({
        where: { teamId: team.id, slug: seedRole.slug },
      });

      if (!existingRole) {
        await teamRoles.save(teamRoles.create({ ...seedRole, teamId: team.id }));
        console.log(`função criada: ${seedTeam.name} / ${seedRole.name}`);
      }
    }
  }
}

async function seed(): Promise<void> {
  await dataSource.initialize();

  try {
    const churches = dataSource.getRepository(Church);
    const users = dataSource.getRepository(User);

    let church = await churches.findOne({ where: { slug: SEED.churchSlug } });
    if (!church) {
      church = await churches.save(
        churches.create({ name: SEED.churchName, slug: SEED.churchSlug }),
      );
      console.log(`igreja criada: ${church.name} (${church.slug})`);
    } else {
      console.log(`igreja já existia: ${church.slug}`);
    }

    // Before the admin check below, which returns early on a second run.
    await seedTeamsAndRoles(church.id);

    const existingAdmin = await users.findOne({ where: { email: SEED.adminEmail } });
    if (existingAdmin) {
      console.log(`admin já existia: ${existingAdmin.email} (${existingAdmin.role})`);
      return;
    }

    const admin = await users.save(
      users.create({
        email: SEED.adminEmail,
        passwordHash: await bcrypt.hash(SEED.adminPassword, BCRYPT_SALT_ROUNDS),
        name: SEED.adminName,
        role: UserRole.SUPER_ADMIN,
        churchId: church.id,
      }),
    );

    // members.userId is NOT NULL UNIQUE — an account without its member row
    // cannot be scheduled for anything.
    const members = dataSource.getRepository(Member);
    await members.save(
      members.create({ userId: admin.id, churchId: church.id, fullName: admin.name }),
    );

    console.log(`admin criado: ${admin.email} / ${SEED.adminPassword}`);
    console.log(`código da igreja: ${church.id}`);
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error: unknown) => {
  console.error('seed falhou:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
