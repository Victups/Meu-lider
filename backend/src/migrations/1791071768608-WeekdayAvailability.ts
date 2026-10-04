import { MigrationInterface, QueryRunner } from "typeorm";

export class WeekdayAvailability1791071768608 implements MigrationInterface {
    name = 'WeekdayAvailability1791071768608'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "member_weekday_availability" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "memberId" uuid NOT NULL, "weekday" smallint NOT NULL, "isAvailable" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_2e655b3c73e10f46611d7f8e4fa" UNIQUE ("memberId", "weekday"), CONSTRAINT "PK_e6c03cd10296798a59a32b7fecd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "member_weekday_availability" ADD CONSTRAINT "FK_745b6920ba6b831778bc8e6b3f6" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "member_weekday_availability" DROP CONSTRAINT "FK_745b6920ba6b831778bc8e6b3f6"`);
        await queryRunner.query(`DROP TABLE "member_weekday_availability"`);
    }

}
