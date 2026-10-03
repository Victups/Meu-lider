import { MigrationInterface, QueryRunner } from "typeorm";

export class TeamRolesAndSwaps1791059288821 implements MigrationInterface {
    name = 'TeamRolesAndSwaps1791059288821'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Free-text functionName becomes a reference to a team position.
        await queryRunner.query(`ALTER TABLE "schedules" DROP COLUMN "functionName"`);
        await queryRunner.query(`CREATE TABLE "team_roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "teamId" uuid NOT NULL, "name" character varying(100) NOT NULL, "slug" character varying(100) NOT NULL, "color" character varying(7), "defaultSlots" integer NOT NULL DEFAULT '1', "active" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_4f788b9fddebf810d26e790f047" UNIQUE ("teamId", "slug"), CONSTRAINT "PK_4d682873a391d93b0e5fe2f082f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "team_member_roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "teamMemberId" uuid NOT NULL, "teamRoleId" uuid NOT NULL, "isPrimary" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_26bae8661931dbea576075d71e5" UNIQUE ("teamMemberId", "teamRoleId"), CONSTRAINT "PK_461750fce168300cdcd6bfac0a4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."schedule_swaps_status_enum" AS ENUM('OPEN', 'ACCEPTED', 'DECLINED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "schedule_swaps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "scheduleId" uuid NOT NULL, "requestedByMemberId" uuid NOT NULL, "targetMemberId" uuid, "acceptedByMemberId" uuid, "status" "public"."schedule_swaps_status_enum" NOT NULL DEFAULT 'OPEN', "reason" text, "respondedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ee7b517cf56604b742f49add003" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "schedules" ADD "teamRoleId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "team_roles" ADD CONSTRAINT "FK_6fcd658c29d67d82492e351294b" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "team_member_roles" ADD CONSTRAINT "FK_2b66fa10fc39d2c72503490a054" FOREIGN KEY ("teamMemberId") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "team_member_roles" ADD CONSTRAINT "FK_d6ec37f12b769fb18d123387582" FOREIGN KEY ("teamRoleId") REFERENCES "team_roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schedules" ADD CONSTRAINT "FK_fc4d51f9f8a5bef9584e7096cd8" FOREIGN KEY ("teamRoleId") REFERENCES "team_roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schedule_swaps" ADD CONSTRAINT "FK_d9fb0716da1294330d94380523c" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schedule_swaps" ADD CONSTRAINT "FK_7ff6ff98d7a1af46f4702735cf3" FOREIGN KEY ("requestedByMemberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schedule_swaps" ADD CONSTRAINT "FK_2c938047e933f6160f36327ce3b" FOREIGN KEY ("acceptedByMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "schedule_swaps" DROP CONSTRAINT "FK_2c938047e933f6160f36327ce3b"`);
        await queryRunner.query(`ALTER TABLE "schedule_swaps" DROP CONSTRAINT "FK_7ff6ff98d7a1af46f4702735cf3"`);
        await queryRunner.query(`ALTER TABLE "schedule_swaps" DROP CONSTRAINT "FK_d9fb0716da1294330d94380523c"`);
        await queryRunner.query(`ALTER TABLE "schedules" DROP CONSTRAINT "FK_fc4d51f9f8a5bef9584e7096cd8"`);
        await queryRunner.query(`ALTER TABLE "team_member_roles" DROP CONSTRAINT "FK_d6ec37f12b769fb18d123387582"`);
        await queryRunner.query(`ALTER TABLE "team_member_roles" DROP CONSTRAINT "FK_2b66fa10fc39d2c72503490a054"`);
        await queryRunner.query(`ALTER TABLE "team_roles" DROP CONSTRAINT "FK_6fcd658c29d67d82492e351294b"`);
        await queryRunner.query(`ALTER TABLE "schedules" DROP COLUMN "teamRoleId"`);
        await queryRunner.query(`DROP TABLE "schedule_swaps"`);
        await queryRunner.query(`DROP TYPE "public"."schedule_swaps_status_enum"`);
        await queryRunner.query(`DROP TABLE "team_member_roles"`);
        await queryRunner.query(`DROP TABLE "team_roles"`);
        await queryRunner.query(`ALTER TABLE "schedules" ADD "functionName" character varying(255) NOT NULL`);
    }

}
