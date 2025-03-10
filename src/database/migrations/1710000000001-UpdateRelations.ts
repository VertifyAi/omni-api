import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateRelations1710000000001 implements MigrationInterface {
    name = 'UpdateRelations1710000000001'

    async up(queryRunner) {
        // Verificar e remover foreign keys da tabela companies
        const foreignKeys = await queryRunner.query(`
            SELECT CONSTRAINT_NAME
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'companies'
            AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        `);

        for (const fk of foreignKeys) {
            await queryRunner.query(`
                ALTER TABLE companies
                DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}
            `);
        }

        // Verificar e remover colunas phone_id e address_id da tabela companies
        const columns = await queryRunner.query(`
            SELECT COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'companies'
            AND COLUMN_NAME IN ('phone_id', 'address_id')
        `);

        if (columns.length > 0) {
            await queryRunner.query(`
                ALTER TABLE companies
                DROP COLUMN ${columns.map(col => col.COLUMN_NAME).join(', DROP COLUMN ')}
            `);
        }

        // Verificar se a foreign key já existe em phones
        const phoneFk = await queryRunner.query(`
            SELECT CONSTRAINT_NAME
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'phones'
            AND CONSTRAINT_NAME = 'FK_phones_company'
        `);

        if (phoneFk.length === 0) {
            await queryRunner.query(`
                ALTER TABLE phones
                ADD CONSTRAINT FK_phones_company
                FOREIGN KEY (company_id) REFERENCES companies(id)
            `);
        }

        // Verificar se a coluna description já existe em areas
        const descriptionColumn = await queryRunner.query(`
            SELECT COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'areas'
            AND COLUMN_NAME = 'description'
        `);

        if (descriptionColumn.length === 0) {
            await queryRunner.query(`
                ALTER TABLE areas
                ADD COLUMN description TEXT NOT NULL
            `);
        }

        // Verificar se a coluna customer_phone_id já existe em tickets
        const customerPhoneColumn = await queryRunner.query(`
            SELECT COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'tickets'
            AND COLUMN_NAME = 'customer_phone_id'
        `);

        if (customerPhoneColumn.length === 0) {
            await queryRunner.query(`
                ALTER TABLE tickets
                ADD COLUMN customer_phone_id INT NOT NULL,
                ADD CONSTRAINT FK_tickets_customer_phone
                FOREIGN KEY (customer_phone_id) REFERENCES phones(id)
            `);
        }

        // Verificar se a coluna closed_at já existe em tickets
        const closedAtColumn = await queryRunner.query(`
            SELECT COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'tickets'
            AND COLUMN_NAME = 'closed_at'
        `);

        if (closedAtColumn.length === 0) {
            await queryRunner.query(`
                ALTER TABLE tickets
                ADD COLUMN closed_at TIMESTAMP NULL
            `);
        }
    }

    async down(queryRunner) {
        // Verificar e remover coluna closed_at de tickets
        const closedAtColumn = await queryRunner.query(`
            SELECT COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'tickets'
            AND COLUMN_NAME = 'closed_at'
        `);

        if (closedAtColumn.length > 0) {
            await queryRunner.query(`
                ALTER TABLE tickets
                DROP COLUMN closed_at
            `);
        }

        // Verificar e remover foreign key e coluna customer_phone_id de tickets
        const customerPhoneFk = await queryRunner.query(`
            SELECT CONSTRAINT_NAME
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'tickets'
            AND CONSTRAINT_NAME = 'FK_tickets_customer_phone'
        `);

        if (customerPhoneFk.length > 0) {
            await queryRunner.query(`
                ALTER TABLE tickets
                DROP FOREIGN KEY FK_tickets_customer_phone
            `);
        }

        const customerPhoneColumn = await queryRunner.query(`
            SELECT COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'tickets'
            AND COLUMN_NAME = 'customer_phone_id'
        `);

        if (customerPhoneColumn.length > 0) {
            await queryRunner.query(`
                ALTER TABLE tickets
                DROP COLUMN customer_phone_id
            `);
        }

        // Verificar e remover coluna description de areas
        const descriptionColumn = await queryRunner.query(`
            SELECT COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'areas'
            AND COLUMN_NAME = 'description'
        `);

        if (descriptionColumn.length > 0) {
            await queryRunner.query(`
                ALTER TABLE areas
                DROP COLUMN description
            `);
        }

        // Verificar e remover foreign key de phones
        const phoneFk = await queryRunner.query(`
            SELECT CONSTRAINT_NAME
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'phones'
            AND CONSTRAINT_NAME = 'FK_phones_company'
        `);

        if (phoneFk.length > 0) {
            await queryRunner.query(`
                ALTER TABLE phones
                DROP FOREIGN KEY FK_phones_company
            `);
        }

        // Verificar e adicionar colunas phone_id e address_id na tabela companies
        const columns = await queryRunner.query(`
            SELECT COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'companies'
            AND COLUMN_NAME IN ('phone_id', 'address_id')
        `);

        if (columns.length === 0) {
            await queryRunner.query(`
                ALTER TABLE companies
                ADD COLUMN phone_id INT NOT NULL,
                ADD COLUMN address_id INT NOT NULL
            `);
        }

        // Verificar e adicionar foreign keys na tabela companies
        const foreignKeys = await queryRunner.query(`
            SELECT CONSTRAINT_NAME
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'companies'
            AND CONSTRAINT_NAME IN ('companies_ibfk_1', 'companies_ibfk_2')
        `);

        if (foreignKeys.length === 0) {
            await queryRunner.query(`
                ALTER TABLE companies
                ADD CONSTRAINT companies_ibfk_1
                FOREIGN KEY (phone_id) REFERENCES phones(id),
                ADD CONSTRAINT companies_ibfk_2
                FOREIGN KEY (address_id) REFERENCES addresses(id)
            `);
        }
    }
} 