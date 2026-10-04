import { MigrationInterface, QueryRunner } from "typeorm";

export class ScheduleReleaseFlow1791075392533 implements MigrationInterface {
    name = 'ScheduleReleaseFlow1791075392533'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "schedules" ADD "releaseReason" text`);
        await queryRunner.query(`ALTER TABLE "schedules" ADD "releaseRequestedAt" TIMESTAMP WITH TIME ZONE`);
        // PENDING no longer exists: an assignment now counts as SCHEDULED
        // from the start, with no acceptance step. Done while the old enum is
        // still in place, otherwise the cast below fails on those rows.
        await queryRunner.query(
            `ALTER TABLE "schedules" ALTER COLUMN "status" TYPE text USING "status"::text`,
        );
        await queryRunner.query(
            `UPDATE "schedules" SET "status" = 'SCHEDULED' WHERE "status" = 'PENDING'`,
        );
        await queryRunner.query(`ALTER TYPE "public"."schedules_status_enum" RENAME TO "schedules_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."schedules_status_enum" AS ENUM('SCHEDULED', 'RELEASE_REQUESTED', 'CONFIRMED', 'CANCELLED', 'NO_SHOW')`);
        await queryRunner.query(`ALTER TABLE "schedules" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "schedules" ALTER COLUMN "status" TYPE "public"."schedules_status_enum" USING "status"::"text"::"public"."schedules_status_enum"`);
        await queryRunner.query(`ALTER TABLE "schedules" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED'`);
        await queryRunner.query(`DROP TYPE "public"."schedules_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."schedules_status_enum_old" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'NO_SHOW')`);
        await queryRunner.query(
            `ALTER TABLE "schedules" ALTER COLUMN "status" TYPE text USING "status"::text`,
        );
        await queryRunner.query(
            `UPDATE "schedules" SET "status" = 'PENDING' WHERE "status" IN ('SCHEDULED', 'RELEASE_REQUESTED')`,
        );
        await queryRunner.query(`ALTER TABLE "schedules" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "schedules" ALTER COLUMN "status" TYPE "public"."schedules_status_enum_old" USING "status"::"text"::"public"."schedules_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "schedules" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP TYPE "public"."schedules_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."schedules_status_enum_old" RENAME TO "schedules_status_enum"`);
        await queryRunner.query(`ALTER TABLE "schedules" DROP COLUMN "releaseRequestedAt"`);
        await queryRunner.query(`ALTER TABLE "schedules" DROP COLUMN "releaseReason"`);
    }

}
