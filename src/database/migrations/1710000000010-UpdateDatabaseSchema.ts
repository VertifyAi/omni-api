import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class UpdateDatabaseSchema1710000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Altera as colunas para permitir valores nulos
    await queryRunner.changeColumn(
      'tickets',
      'customer_phone_id',
      new TableColumn({
        name: 'customer_phone_id',
        type: 'int',
        isNullable: true,
      }),
    );

    await queryRunner.changeColumn(
      'tickets',
      'company_id',
      new TableColumn({
        name: 'company_id',
        type: 'int',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restaura as colunas para não permitir valores nulos
    await queryRunner.changeColumn(
      'tickets',
      'customer_phone_id',
      new TableColumn({
        name: 'customer_phone_id',
        type: 'int',
        isNullable: false,
      }),
    );

    await queryRunner.changeColumn(
      'tickets',
      'company_id',
      new TableColumn({
        name: 'company_id',
        type: 'int',
        isNullable: false,
      }),
    );
  }
} 