import { MigrationInterface, QueryRunner } from "typeorm";

export class MemberUserCascade1791070949929 implements MigrationInterface {
    name = 'MemberUserCascade1791070949929'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "members" DROP CONSTRAINT "FK_839756572a2c38eb5a3b563126e"`);
        await queryRunner.query(`ALTER TABLE "members" ADD CONSTRAINT "FK_839756572a2c38eb5a3b563126e" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "members" DROP CONSTRAINT "FK_839756572a2c38eb5a3b563126e"`);
        await queryRunner.query(`ALTER TABLE "members" ADD CONSTRAINT "FK_839756572a2c38eb5a3b563126e" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
