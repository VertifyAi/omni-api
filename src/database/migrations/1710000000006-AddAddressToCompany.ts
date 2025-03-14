import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddAddressToCompany1710000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adiciona a coluna address_id
    await queryRunner.addColumn(
      'companies',
      new TableColumn({
        name: 'address_id',
        type: 'int',
        isNullable: true,
      }),
    );

    // Cria a foreign key
    await queryRunner.createForeignKey(
      'companies',
      new TableForeignKey({
        name: 'FK_companies_address',
        columnNames: ['address_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'addresses',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove a foreign key
    await queryRunner.dropForeignKey('companies', 'FK_companies_address');

    // Remove a coluna
    await queryRunner.dropColumn('companies', 'address_id');
  }
} 