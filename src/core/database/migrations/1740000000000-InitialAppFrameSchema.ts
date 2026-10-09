import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialAppFrameSchema1740000000000 implements MigrationInterface {
  name = 'InitialAppFrameSchema1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Garantir suporte a geração de UUIDs no PostgreSQL
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // 2. Criação de Tipos ENUM nativos
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "auth_provider_enum" AS ENUM ('local', 'google');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "video_platform_enum" AS ENUM ('youtube', 'tiktok', 'instagram', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "video_job_status_enum" AS ENUM ('pending', 'downloading', 'rendering', 'completed', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 3. Tabela: users
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "name" VARCHAR(255) NOT NULL,
        "email" VARCHAR(255) NOT NULL,
        "password_hash" VARCHAR(255) NULL,
        "google_id" VARCHAR(255) NULL,
        "auth_provider" "auth_provider_enum" NOT NULL DEFAULT 'local',
        "is_two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
        "totp_secret" TEXT NULL,
        "recovery_codes" JSONB NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "pk_users" PRIMARY KEY ("id"),
        CONSTRAINT "uq_users_email" UNIQUE ("email")
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_users_email" ON "users" ("email");
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_users_google_id" ON "users" ("google_id") WHERE "google_id" IS NOT NULL;
    `);

    // 4. Tabela: user_sessions
    await queryRunner.query(`
      CREATE TABLE "user_sessions" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL,
        "refresh_token_hash" VARCHAR(255) NOT NULL,
        "ip_address" VARCHAR(45) NULL,
        "user_agent" TEXT NULL,
        "device_name" VARCHAR(150) NULL,
        "is_revoked" BOOLEAN NOT NULL DEFAULT false,
        "last_active_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expires_at" TIMESTAMPTZ NOT NULL,
        CONSTRAINT "pk_user_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_user_sessions_user" FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_user_sessions_user_id" ON "user_sessions" ("user_id");
    `);

    // 5. Tabela: watermarks
    await queryRunner.query(`
      CREATE TABLE "watermarks" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL,
        "original_name" VARCHAR(255) NOT NULL,
        "storage_path" VARCHAR(500) NOT NULL,
        "mime_type" VARCHAR(100) NOT NULL,
        "file_size" BIGINT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "pk_watermarks" PRIMARY KEY ("id"),
        CONSTRAINT "fk_watermarks_user" FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_watermarks_user_id" ON "watermarks" ("user_id");
    `);

    // 6. Tabela: video_jobs
    await queryRunner.query(`
      CREATE TABLE "video_jobs" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL,
        "source_url" VARCHAR(1000) NOT NULL,
        "platform" "video_platform_enum" NOT NULL DEFAULT 'other',
        "original_title" VARCHAR(255) NULL,
        "duration_seconds" INTEGER NULL,
        "status" "video_job_status_enum" NOT NULL DEFAULT 'pending',
        "trim_start" NUMERIC(10,2) NULL,
        "trim_end" NUMERIC(10,2) NULL,
        "subtitle_config" JSONB NULL,
        "watermark_id" UUID NULL,
        "final_video_path" VARCHAR(1000) NULL,
        "error_log" TEXT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "pk_video_jobs" PRIMARY KEY ("id"),
        CONSTRAINT "fk_video_jobs_user" FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_video_jobs_watermark" FOREIGN KEY ("watermark_id") 
          REFERENCES "watermarks"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_video_jobs_user_id" ON "video_jobs" ("user_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_video_jobs_watermark_id" ON "video_jobs" ("watermark_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_video_jobs_status" ON "video_jobs" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remoção reversa em ordem estrita de integridade referencial
    await queryRunner.query(`DROP TABLE IF EXISTS "video_jobs" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "watermarks" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_sessions" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE;`);

    // Remoção dos tipos ENUM
    await queryRunner.query(`DROP TYPE IF EXISTS "video_job_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "video_platform_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "auth_provider_enum";`);
  }
}
