import { MigrationInterface, QueryRunner } from 'typeorm';
import { TicketPriority } from '../../tickets/enums/ticket-priority.enum';

export class AddTicketTriageFields1710000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove a coluna priority existente
    await queryRunner.query(`
      ALTER TABLE tickets
      DROP COLUMN priority;
    `);

    // Adiciona as novas colunas
    await queryRunner.query(`
      ALTER TABLE tickets
      ADD COLUMN priority ENUM('${TicketPriority.LOW}', '${TicketPriority.MEDIUM}', '${TicketPriority.HIGH}') NULL,
      ADD COLUMN summary TEXT NULL,
      ADD COLUMN triaged BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN customer_phone_id INT,
      ADD COLUMN company_id INT,
      ADD FOREIGN KEY (customer_phone_id) REFERENCES phones(id),
      ADD FOREIGN KEY (company_id) REFERENCES companies(id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove as novas colunas
    await queryRunner.query(`
      ALTER TABLE tickets
      DROP FOREIGN KEY tickets_ibfk_3,
      DROP FOREIGN KEY tickets_ibfk_4,
      DROP COLUMN customer_phone_id,
      DROP COLUMN company_id,
      DROP COLUMN priority,
      DROP COLUMN summary,
      DROP COLUMN triaged;
    `);

    // Restaura a coluna priority original
    await queryRunner.query(`
      ALTER TABLE tickets
      ADD COLUMN priority VARCHAR(255) NOT NULL DEFAULT 'low';
    `);
  }
} 