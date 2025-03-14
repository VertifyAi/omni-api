import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSetup1710000000001 implements MigrationInterface {
    name = 'InitialSetup1710000000001'

    async up(queryRunner: QueryRunner): Promise<void> {
        // Desabilitar verificação de chaves estrangeiras durante a migração
        await queryRunner.query('SET FOREIGN_KEY_CHECKS=0');

        // Criar tabela companies
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS companies (
                id INT NOT NULL AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            );
        `);

        // Criar tabela addresses
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS addresses (
                id INT NOT NULL AUTO_INCREMENT,
                street VARCHAR(255) NOT NULL,
                number VARCHAR(255) NOT NULL,
                complement VARCHAR(255),
                neighborhood VARCHAR(255) NOT NULL,
                city VARCHAR(255) NOT NULL,
                state VARCHAR(255) NOT NULL,
                zip_code VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            );
        `);

        // Criar tabela phones
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS phones (
                id INT NOT NULL AUTO_INCREMENT,
                number VARCHAR(255) NOT NULL,
                company_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                FOREIGN KEY (company_id) REFERENCES companies(id)
            );
        `);

        // Criar tabela areas
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS areas (
                id INT NOT NULL AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                company_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                FOREIGN KEY (company_id) REFERENCES companies(id)
            );
        `);

        // Criar tabela users
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT NOT NULL AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(255) NOT NULL DEFAULT 'admin',
                phone_id INT,
                address_id INT,
                area_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                FOREIGN KEY (phone_id) REFERENCES phones(id),
                FOREIGN KEY (address_id) REFERENCES addresses(id),
                FOREIGN KEY (area_id) REFERENCES areas(id)
            );
        `);

        // Criar tabela tickets
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS tickets (
                id INT NOT NULL AUTO_INCREMENT,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                status VARCHAR(255) NOT NULL DEFAULT 'open',
                priority VARCHAR(255) NOT NULL DEFAULT 'low',
                user_id INT,
                area_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (area_id) REFERENCES areas(id)
            );
        `);

        // Criar tabela ticket_messages
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS ticket_messages (
                id INT NOT NULL AUTO_INCREMENT,
                message TEXT NOT NULL,
                ticket_id INT,
                user_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                FOREIGN KEY (ticket_id) REFERENCES tickets(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
        `);

        // Reabilitar verificação de chaves estrangeiras
        await queryRunner.query('SET FOREIGN_KEY_CHECKS=1');
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        // Desabilitar verificação de chaves estrangeiras durante o rollback
        await queryRunner.query('SET FOREIGN_KEY_CHECKS=0');

        // Remover todas as tabelas na ordem inversa
        await queryRunner.query('DROP TABLE IF EXISTS ticket_messages');
        await queryRunner.query('DROP TABLE IF EXISTS tickets');
        await queryRunner.query('DROP TABLE IF EXISTS users');
        await queryRunner.query('DROP TABLE IF EXISTS areas');
        await queryRunner.query('DROP TABLE IF EXISTS phones');
        await queryRunner.query('DROP TABLE IF EXISTS addresses');
        await queryRunner.query('DROP TABLE IF EXISTS companies');

        // Reabilitar verificação de chaves estrangeiras
        await queryRunner.query('SET FOREIGN_KEY_CHECKS=1');
    }
} 