import { MigrationInterface, QueryRunner } from "typeorm";

export class OversightRoles1791074036846 implements MigrationInterface {
    name = 'OversightRoles1791074036846'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."users_role_enum" ADD VALUE 'PASTOR'`);
        await queryRunner.query(`ALTER TYPE "public"."users_role_enum" ADD VALUE 'PRESBYTER'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum_old" AS ENUM('SUPER_ADMIN', 'CHURCH_ADMIN', 'LEADER', 'MEMBER')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum_old" USING "role"::"text"::"public"."users_role_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."users_role_enum_old" RENAME TO "users_role_enum"`);
    }

}
