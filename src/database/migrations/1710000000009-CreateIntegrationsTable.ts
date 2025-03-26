import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateIntegrationsTable1710000000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tabela integrations
    await queryRunner.createTable(
      new Table({
        name: 'integrations',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['whatsapp'],
            default: "'whatsapp'",
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'company_id',
            type: 'int',
          },
          {
            name: 'config',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Criar foreign key
    await queryRunner.createForeignKey(
      'integrations',
      new TableForeignKey({
        name: 'FK_integrations_company',
        columnNames: ['company_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'companies',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover foreign key
    await queryRunner.dropForeignKey('integrations', 'FK_integrations_company');

    // Remover tabela
    await queryRunner.dropTable('integrations');
  }
} 