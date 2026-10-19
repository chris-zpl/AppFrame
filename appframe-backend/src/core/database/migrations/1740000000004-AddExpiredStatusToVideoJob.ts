import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExpiredStatusToVideoJob1740000000004 implements MigrationInterface {
  name = 'AddExpiredStatusToVideoJob1740000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "video_job_status_enum" ADD VALUE IF NOT EXISTS 'expired';
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No PostgreSQL, a remoção de valores de ENUM nativo não é suportada diretamente via DROP VALUE
  }
}
