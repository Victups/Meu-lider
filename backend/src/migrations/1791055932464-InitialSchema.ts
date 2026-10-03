import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1791055932464 implements MigrationInterface {
    name = 'InitialSchema1791055932464'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "churchId" uuid NOT NULL, "name" character varying(255) NOT NULL, "description" text, "eventType" character varying(100) NOT NULL DEFAULT 'culto', "eventDate" TIMESTAMP WITH TIME ZONE NOT NULL, "location" character varying(255), "endDate" TIMESTAMP WITH TIME ZONE, "active" boolean NOT NULL DEFAULT true, "recurrenceRule" character varying(500), "createdById" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "team_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "teamId" uuid NOT NULL, "memberId" uuid NOT NULL, "role" character varying(100), "startedAt" date NOT NULL DEFAULT ('now'::text)::date, "endedAt" date, "isLeader" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_893ee5058641f987d58ed7a9869" UNIQUE ("teamId", "memberId"), CONSTRAINT "PK_ca3eae89dcf20c9fd95bf7460aa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "teams" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "churchId" uuid NOT NULL, "name" character varying(255) NOT NULL, "slug" character varying(255) NOT NULL, "description" text, "color" character varying(7), "active" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7e5523774a38b08a6236d322403" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."schedules_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'NO_SHOW')`);
        await queryRunner.query(`CREATE TABLE "schedules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "eventId" uuid NOT NULL, "teamId" uuid NOT NULL, "memberId" uuid NOT NULL, "functionName" character varying(255) NOT NULL, "status" "public"."schedules_status_enum" NOT NULL DEFAULT 'PENDING', "confirmedAt" TIMESTAMP WITH TIME ZONE, "confirmedById" uuid, "notes" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_7485a1bf53f6e883bfea3500edc" UNIQUE ("eventId", "teamId", "memberId"), CONSTRAINT "PK_7e33fc2ea755a5765e3564e66dd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('SCHEDULE_ASSIGNED', 'SCHEDULE_CHANGED', 'CONFIRMATION_REQUESTED', 'SCHEDULE_CANCELLED', 'AVAILABILITY_REMINDER')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "title" character varying(255) NOT NULL, "message" text NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "relatedScheduleId" uuid, "isRead" boolean NOT NULL DEFAULT false, "readAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "tokenHash" character varying(255) NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "revokedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('SUPER_ADMIN', 'CHURCH_ADMIN', 'LEADER', 'MEMBER')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "passwordHash" character varying(255) NOT NULL, "name" character varying(255) NOT NULL, "phone" character varying(20), "avatarUrl" character varying(500), "role" "public"."users_role_enum" NOT NULL DEFAULT 'MEMBER', "churchId" uuid NOT NULL, "active" boolean NOT NULL DEFAULT true, "lastLoginAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "churches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "slug" character varying(255) NOT NULL, "description" text, "address" text, "phone" character varying(20), "email" character varying(255), "logoUrl" character varying(500), "website" character varying(255), "active" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_7cf9653e300cedb022d70a7c1a6" UNIQUE ("slug"), CONSTRAINT "PK_6048a6f37c897751d61cbb0347a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "churchId" uuid NOT NULL, "fullName" character varying(255) NOT NULL, "cpf" character varying(14), "birthDate" date, "joinedAt" date NOT NULL DEFAULT ('now'::text)::date, "status" character varying(50) NOT NULL DEFAULT 'active', "notes" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_839756572a2c38eb5a3b563126e" UNIQUE ("userId"), CONSTRAINT "UQ_f05952a65232edc96f5f86b538e" UNIQUE ("cpf"), CONSTRAINT "PK_28b53062261b996d9c99fa12404" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "availability" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "memberId" uuid NOT NULL, "dateFrom" date NOT NULL, "dateTo" date NOT NULL, "isAvailable" boolean NOT NULL DEFAULT true, "reason" character varying(500), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_05a8158cf1112294b1c86e7f1d3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "events" ADD CONSTRAINT "FK_4f499e019fe4ee6771c25573936" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "events" ADD CONSTRAINT "FK_2fb864f37ad210f4295a09b684d" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "team_members" ADD CONSTRAINT "FK_6d1c8c7f705803f0711336a5c33" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "team_members" ADD CONSTRAINT "FK_6f1c89b33f1391d2ffd8d590671" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "teams" ADD CONSTRAINT "FK_c83113ebd9f0ffc88050b8fd22f" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schedules" ADD CONSTRAINT "FK_040ac7fb9e0799a2f4c7d37e9a5" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schedules" ADD CONSTRAINT "FK_1bad651634b9c5f4fe170726519" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schedules" ADD CONSTRAINT "FK_be2a3da0b6695a08ebfd6781512" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schedules" ADD CONSTRAINT "FK_5b6f4c0fbc0e8d47df0f66c6e1d" FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_f6a1b78687f3cec8aeb8fb36adb" FOREIGN KEY ("relatedScheduleId") REFERENCES "schedules"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_3ad405e3bd92680e4792ac50880" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "members" ADD CONSTRAINT "FK_839756572a2c38eb5a3b563126e" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "members" ADD CONSTRAINT "FK_510f1afb45089ca2af12bbc4a19" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "availability" ADD CONSTRAINT "FK_ec30447737d240f0b5182d5c269" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "availability" DROP CONSTRAINT "FK_ec30447737d240f0b5182d5c269"`);
        await queryRunner.query(`ALTER TABLE "members" DROP CONSTRAINT "FK_510f1afb45089ca2af12bbc4a19"`);
        await queryRunner.query(`ALTER TABLE "members" DROP CONSTRAINT "FK_839756572a2c38eb5a3b563126e"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_3ad405e3bd92680e4792ac50880"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_610102b60fea1455310ccd299de"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_f6a1b78687f3cec8aeb8fb36adb"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_692a909ee0fa9383e7859f9b406"`);
        await queryRunner.query(`ALTER TABLE "schedules" DROP CONSTRAINT "FK_5b6f4c0fbc0e8d47df0f66c6e1d"`);
        await queryRunner.query(`ALTER TABLE "schedules" DROP CONSTRAINT "FK_be2a3da0b6695a08ebfd6781512"`);
        await queryRunner.query(`ALTER TABLE "schedules" DROP CONSTRAINT "FK_1bad651634b9c5f4fe170726519"`);
        await queryRunner.query(`ALTER TABLE "schedules" DROP CONSTRAINT "FK_040ac7fb9e0799a2f4c7d37e9a5"`);
        await queryRunner.query(`ALTER TABLE "teams" DROP CONSTRAINT "FK_c83113ebd9f0ffc88050b8fd22f"`);
        await queryRunner.query(`ALTER TABLE "team_members" DROP CONSTRAINT "FK_6f1c89b33f1391d2ffd8d590671"`);
        await queryRunner.query(`ALTER TABLE "team_members" DROP CONSTRAINT "FK_6d1c8c7f705803f0711336a5c33"`);
        await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "FK_2fb864f37ad210f4295a09b684d"`);
        await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "FK_4f499e019fe4ee6771c25573936"`);
        await queryRunner.query(`DROP TABLE "availability"`);
        await queryRunner.query(`DROP TABLE "members"`);
        await queryRunner.query(`DROP TABLE "churches"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "refresh_tokens"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
        await queryRunner.query(`DROP TABLE "schedules"`);
        await queryRunner.query(`DROP TYPE "public"."schedules_status_enum"`);
        await queryRunner.query(`DROP TABLE "teams"`);
        await queryRunner.query(`DROP TABLE "team_members"`);
        await queryRunner.query(`DROP TABLE "events"`);
    }

}
