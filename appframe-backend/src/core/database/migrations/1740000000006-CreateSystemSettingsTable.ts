import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSystemSettingsTable1740000000006 implements MigrationInterface {
  name = 'CreateSystemSettingsTable1740000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "key" character varying(100) NOT NULL,
        "value" text NOT NULL,
        "is_encrypted" boolean NOT NULL DEFAULT false,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_system_settings_key" PRIMARY KEY ("key")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "video_jobs"
        ADD COLUMN IF NOT EXISTS "aspect_ratio" VARCHAR(20) NOT NULL DEFAULT '9:16',
        ADD COLUMN IF NOT EXISTS "watermark_position" VARCHAR(50) NULL,
        ADD COLUMN IF NOT EXISTS "watermark_scale" INTEGER NULL DEFAULT 100,
        ADD COLUMN IF NOT EXISTS "watermark_opacity" INTEGER NULL DEFAULT 85;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "video_jobs"
        DROP COLUMN IF EXISTS "watermark_opacity",
        DROP COLUMN IF EXISTS "watermark_scale",
        DROP COLUMN IF EXISTS "watermark_position",
        DROP COLUMN IF EXISTS "aspect_ratio";
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "system_settings"`);
  }
}
