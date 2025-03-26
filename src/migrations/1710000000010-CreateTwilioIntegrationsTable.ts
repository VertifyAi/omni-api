import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTwilioIntegrationsTable1710000000010 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE twilio_integrations (
                id INT NOT NULL AUTO_INCREMENT,
                company_id INT NOT NULL,
                account_sid VARCHAR(255) NOT NULL,
                auth_token VARCHAR(255) NOT NULL,
                whatsapp_number VARCHAR(255) NOT NULL,
                status ENUM('pending', 'active', 'inactive', 'error') NOT NULL DEFAULT 'pending',
                config JSON NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE twilio_integrations`);
    }
} 