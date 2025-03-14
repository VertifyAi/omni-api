import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTimestampsToUsersAndAreas1710000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adiciona timestamps na tabela users
    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'created_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP',
      }),
      new TableColumn({
        name: 'updated_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
      }),
      new TableColumn({
        name: 'deleted_at',
        type: 'timestamp',
        isNullable: true,
      }),
    ]);

    // Adiciona timestamps na tabela areas
    await queryRunner.addColumns('areas', [
      new TableColumn({
        name: 'created_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP',
      }),
      new TableColumn({
        name: 'updated_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
      }),
      new TableColumn({
        name: 'deleted_at',
        type: 'timestamp',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove timestamps da tabela users
    await queryRunner.dropColumns('users', [
      'created_at',
      'updated_at',
      'deleted_at',
    ]);

    // Remove timestamps da tabela areas
    await queryRunner.dropColumns('areas', [
      'created_at',
      'updated_at',
      'deleted_at',
    ]);
  }
} 