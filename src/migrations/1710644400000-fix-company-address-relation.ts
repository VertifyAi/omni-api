import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixCompanyAddressRelation1710644400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Primeiro, remove a foreign key existente
    await queryRunner.query(
      `ALTER TABLE companies DROP FOREIGN KEY FK_companies_address`
    );

    // Remove o índice antigo
    await queryRunner.query(
      `ALTER TABLE companies DROP INDEX FK_companies_address`
    );

    // Recria a foreign key com o nome correto
    await queryRunner.query(
      `ALTER TABLE companies ADD CONSTRAINT FK_companies_address_id FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE SET NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove a nova foreign key
    await queryRunner.query(
      `ALTER TABLE companies DROP FOREIGN KEY FK_companies_address_id`
    );

    // Recria a foreign key antiga
    await queryRunner.query(
      `ALTER TABLE companies ADD CONSTRAINT FK_companies_address FOREIGN KEY (address_id) REFERENCES addresses(id)`
    );
  }
} 