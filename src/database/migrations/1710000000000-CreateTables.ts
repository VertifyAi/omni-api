const { MigrationInterface, QueryRunner } = require("typeorm");

class CreateTables1710000000000 {
    name = 'CreateTables1710000000000'

    async up(queryRunner) {
        // Criar tabela de endereços
        await queryRunner.query(`
            CREATE TABLE addresses (
                id INT NOT NULL AUTO_INCREMENT,
                street VARCHAR(255) NOT NULL,
                city VARCHAR(255) NOT NULL,
                state VARCHAR(255) NOT NULL,
                zip_code VARCHAR(255) NOT NULL,
                country VARCHAR(255) NOT NULL,
                complement VARCHAR(255) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            )
        `);

        // Criar tabela de telefones
        await queryRunner.query(`
            CREATE TABLE phones (
                id INT NOT NULL AUTO_INCREMENT,
                number VARCHAR(255) NOT NULL,
                state_code VARCHAR(2) NOT NULL,
                country_code VARCHAR(3) NOT NULL,
                company_id INT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            )
        `);

        // Criar tabela de empresas
        await queryRunner.query(`
            CREATE TABLE companies (
                id INT NOT NULL AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                cnpj VARCHAR(255) NOT NULL UNIQUE,
                phone_id INT NOT NULL,
                address_id INT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP NULL,
                PRIMARY KEY (id),
                FOREIGN KEY (phone_id) REFERENCES phones(id),
                FOREIGN KEY (address_id) REFERENCES addresses(id)
            )
        `);

        // Adicionar foreign key em phones para company_id
        await queryRunner.query(`
            ALTER TABLE phones
            ADD CONSTRAINT FK_phones_company
            FOREIGN KEY (company_id) REFERENCES companies(id)
        `);

        // Criar tabela de áreas
        await queryRunner.query(`
            CREATE TABLE areas (
                id INT NOT NULL AUTO_INCREMENT,
                company_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                FOREIGN KEY (company_id) REFERENCES companies(id)
            )
        `);

        // Criar tabela de usuários
        await queryRunner.query(`
            CREATE TABLE users (
                id INT NOT NULL AUTO_INCREMENT,
                first_name VARCHAR(255) NOT NULL,
                last_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                phone_id INT NOT NULL,
                address_id INT NOT NULL,
                area_id INT NOT NULL,
                role ENUM('admin', 'attendant', 'supervisor') NOT NULL DEFAULT 'attendant',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP NULL,
                PRIMARY KEY (id),
                FOREIGN KEY (phone_id) REFERENCES phones(id),
                FOREIGN KEY (address_id) REFERENCES addresses(id),
                FOREIGN KEY (area_id) REFERENCES areas(id)
            )
        `);

        // Criar tabela de relacionamento company_users
        await queryRunner.query(`
            CREATE TABLE company_users (
                company_id INT NOT NULL,
                user_id INT NOT NULL,
                PRIMARY KEY (company_id, user_id),
                FOREIGN KEY (company_id) REFERENCES companies(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Criar tabela de tickets
        await queryRunner.query(`
            CREATE TABLE tickets (
                id INT NOT NULL AUTO_INCREMENT,
                status ENUM('open', 'in_progress', 'closed') NOT NULL DEFAULT 'open',
                subject VARCHAR(255) NOT NULL,
                customer_phone_id INT NOT NULL,
                area_id INT NOT NULL,
                company_id INT NOT NULL,
                user_id INT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                closed_at TIMESTAMP NULL,
                PRIMARY KEY (id),
                FOREIGN KEY (customer_phone_id) REFERENCES phones(id),
                FOREIGN KEY (area_id) REFERENCES areas(id),
                FOREIGN KEY (company_id) REFERENCES companies(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Criar tabela de mensagens de tickets
        await queryRunner.query(`
            CREATE TABLE ticket_messages (
                id INT NOT NULL AUTO_INCREMENT,
                ticket_id INT NOT NULL,
                sender ENUM('customer', 'agent') NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                FOREIGN KEY (ticket_id) REFERENCES tickets(id)
            )
        `);
    }

    async down(queryRunner) {
        // Remover tabelas na ordem inversa
        await queryRunner.query(`DROP TABLE ticket_messages`);
        await queryRunner.query(`DROP TABLE tickets`);
        await queryRunner.query(`DROP TABLE company_users`);
        await queryRunner.query(`DROP TABLE users`);
        await queryRunner.query(`DROP TABLE areas`);
        await queryRunner.query(`DROP TABLE companies`);
        await queryRunner.query(`DROP TABLE phones`);
        await queryRunner.query(`DROP TABLE addresses`);
    }
}

module.exports = CreateTables1710000000000; 