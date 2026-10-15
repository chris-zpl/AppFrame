import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSecurityAuditLogsTable1740000000003 implements MigrationInterface {
  name = 'CreateSecurityAuditLogsTable1740000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "security_audit_logs" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NULL,
        "action" VARCHAR(60) NOT NULL,
        "ip_address" VARCHAR(45) NULL,
        "user_agent" TEXT NULL,
        "metadata" JSONB NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "fk_security_audit_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_security_audit_logs_user_id" ON "security_audit_logs" ("user_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_security_audit_logs_action" ON "security_audit_logs" ("action");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_security_audit_logs_created_at" ON "security_audit_logs" ("created_at" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "security_audit_logs";`);
  }
}
