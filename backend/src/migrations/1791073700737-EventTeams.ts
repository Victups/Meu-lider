import { MigrationInterface, QueryRunner } from "typeorm";

export class EventTeams1791073700737 implements MigrationInterface {
    name = 'EventTeams1791073700737'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "event_teams" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "eventId" uuid NOT NULL, "teamId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_62fc2ce6ff160203adabc6e8e64" UNIQUE ("eventId", "teamId"), CONSTRAINT "PK_02a00c33f9aedce303aabb6ba16" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "event_teams" ADD CONSTRAINT "FK_6720f4049d3c12c78077998bb05" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "event_teams" ADD CONSTRAINT "FK_9f378171710c23538b4804cf4ea" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "event_teams" DROP CONSTRAINT "FK_9f378171710c23538b4804cf4ea"`);
        await queryRunner.query(`ALTER TABLE "event_teams" DROP CONSTRAINT "FK_6720f4049d3c12c78077998bb05"`);
        await queryRunner.query(`DROP TABLE "event_teams"`);
    }

}
