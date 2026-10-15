import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleEmailAndEmailChangedAt1740000000002 implements MigrationInterface {
  name = 'AddGoogleEmailAndEmailChangedAt1740000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_email" VARCHAR(255) NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_changed_at" TIMESTAMPTZ NULL;
    `);

    // Para usuários que já possuem google_id vinculado, inicializa google_email com o email atual se for nulo
    await queryRunner.query(`
      UPDATE "users" SET "google_email" = "email" WHERE "google_id" IS NOT NULL AND "google_email" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "google_email";`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "email_changed_at";`);
  }
}
