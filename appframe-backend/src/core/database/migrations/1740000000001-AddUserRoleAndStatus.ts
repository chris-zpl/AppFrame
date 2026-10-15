import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRoleAndStatus1740000000001 implements MigrationInterface {
  name = 'AddUserRoleAndStatus1740000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "users_role_enum" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "users_role_enum" NOT NULL DEFAULT 'USER';
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
    `);

    await queryRunner.query(`
      UPDATE "users" SET "role" = 'SUPER_ADMIN' WHERE LOWER("email") = 'christian.zimpel@gmail.com';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "role";`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "is_active";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum";`);
  }
}
