import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveGeminiApiKeyFromUsers1740000000005 implements MigrationInterface {
  name = 'RemoveGeminiApiKeyFromUsers1740000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "gemini_api_key";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gemini_api_key" TEXT NULL;
    `);
  }
}
