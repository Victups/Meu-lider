import { MigrationInterface, QueryRunner } from "typeorm";

export class PushInvitesPasswordReset1791373898857 implements MigrationInterface {
    name = 'PushInvitesPasswordReset1791373898857'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "invitations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(12) NOT NULL, "churchId" uuid NOT NULL, "teamId" uuid, "createdById" uuid, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "maxUses" integer, "usedCount" integer NOT NULL DEFAULT '0', "active" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5dec98cfdfd562e4ad3648bbb07" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_dfcfae6af22931048ef7307841" ON "invitations"  ("code") `);
        await queryRunner.query(`CREATE TABLE "password_reset_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "codeHash" character varying(64) NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "usedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d16bebd73e844c48bca50ff8d3d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d6a19d4b4f6c62dcd29daa497e" ON "password_reset_tokens"  ("userId") `);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "relatedEventId" uuid`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "relatedSwapId" uuid`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "reminderHours" smallint`);
        // IF NOT EXISTS: the push token column and SCHEDULE_REMINDER were first
        // applied by hand on the dev database, before this migration existed.
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "expoPushToken" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "schedule_swaps" ADD "counterScheduleId" uuid`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'SCHEDULE_REMINDER'`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'EVENT_CREATED'`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'RELEASE_REQUESTED'`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'SWAP_REQUESTED'`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'SWAP_RESPONDED'`);
        await queryRunner.query(`ALTER TABLE "invitations" ADD CONSTRAINT "FK_9604510d55382959ec04238b345" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invitations" ADD CONSTRAINT "FK_113cb1411bac0e764b922699d4b" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invitations" ADD CONSTRAINT "FK_d5bc6e2af606d5aaaa4ef4e6be5" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schedule_swaps" ADD CONSTRAINT "FK_d282f7fe303177d7f2855647181" FOREIGN KEY ("counterScheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "FK_d6a19d4b4f6c62dcd29daa497e2" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "FK_d6a19d4b4f6c62dcd29daa497e2"`);
        await queryRunner.query(`ALTER TABLE "schedule_swaps" DROP CONSTRAINT "FK_d282f7fe303177d7f2855647181"`);
        await queryRunner.query(`ALTER TABLE "invitations" DROP CONSTRAINT "FK_d5bc6e2af606d5aaaa4ef4e6be5"`);
        await queryRunner.query(`ALTER TABLE "invitations" DROP CONSTRAINT "FK_113cb1411bac0e764b922699d4b"`);
        await queryRunner.query(`ALTER TABLE "invitations" DROP CONSTRAINT "FK_9604510d55382959ec04238b345"`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum_old" AS ENUM('SCHEDULE_ASSIGNED', 'SCHEDULE_CHANGED', 'CONFIRMATION_REQUESTED', 'SCHEDULE_CANCELLED', 'AVAILABILITY_REMINDER')`);
        await queryRunner.query(`DELETE FROM "notifications" WHERE "type" IN ('SCHEDULE_REMINDER', 'EVENT_CREATED', 'RELEASE_REQUESTED', 'SWAP_REQUESTED', 'SWAP_RESPONDED')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum_old" USING "type"::"text"::"public"."notifications_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum_old" RENAME TO "notifications_type_enum"`);
        await queryRunner.query(`ALTER TABLE "schedule_swaps" DROP COLUMN "counterScheduleId"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "expoPushToken"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "reminderHours"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "relatedSwapId"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "relatedEventId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d6a19d4b4f6c62dcd29daa497e"`);
        await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dfcfae6af22931048ef7307841"`);
        await queryRunner.query(`DROP TABLE "invitations"`);
    }

}
