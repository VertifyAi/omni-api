import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixRelations1710000000002 implements MigrationInterface {
    name = 'FixRelations1710000000002'

    async up(queryRunner) {
        // Verificar e remover foreign keys da tabela phones
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

        // Verificar e remover foreign keys da tabela users
        const userFks = await queryRunner.query(`
            SELECT CONSTRAINT_NAME
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'users'
            AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        `);

        for (const fk of userFks) {
            await queryRunner.query(`
                ALTER TABLE users
                DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}
            `);
        }

        // Verificar e remover foreign keys da tabela areas
        const areaFk = await queryRunner.query(`
            SELECT CONSTRAINT_NAME
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'areas'
            AND CONSTRAINT_NAME = 'FK_areas_company'
        `);

        if (areaFk.length > 0) {
            await queryRunner.query(`
                ALTER TABLE areas
                DROP FOREIGN KEY FK_areas_company
            `);
        }

        // Verificar e remover foreign keys da tabela tickets
        const ticketFks = await queryRunner.query(`
            SELECT CONSTRAINT_NAME
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'tickets'
            AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        `);

        for (const fk of ticketFks) {
            await queryRunner.query(`
                ALTER TABLE tickets
                DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}
            `);
        }

        // Verificar e remover foreign keys da tabela ticket_messages
        const ticketMessageFks = await queryRunner.query(`
            SELECT CONSTRAINT_NAME
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'ticket_messages'
            AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        `);

        for (const fk of ticketMessageFks) {
            await queryRunner.query(`
                ALTER TABLE ticket_messages
                DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}
            `);
        }
    }

    async down(queryRunner) {
        // Adicionar foreign key em phones
        await queryRunner.query(`
            ALTER TABLE phones
            ADD CONSTRAINT FK_phones_company
            FOREIGN KEY (company_id) REFERENCES companies(id)
        `);

        // Adicionar foreign keys em users
        await queryRunner.query(`
            ALTER TABLE users
            ADD CONSTRAINT FK_users_phone
            FOREIGN KEY (phone_id) REFERENCES phones(id),
            ADD CONSTRAINT FK_users_address
            FOREIGN KEY (address_id) REFERENCES addresses(id),
            ADD CONSTRAINT FK_users_area
            FOREIGN KEY (area_id) REFERENCES areas(id)
        `);

        // Adicionar foreign key em areas
        await queryRunner.query(`
            ALTER TABLE areas
            ADD CONSTRAINT FK_areas_company
            FOREIGN KEY (company_id) REFERENCES companies(id)
        `);

        // Adicionar foreign keys em tickets
        await queryRunner.query(`
            ALTER TABLE tickets
            ADD CONSTRAINT FK_tickets_area
            FOREIGN KEY (area_id) REFERENCES areas(id),
            ADD CONSTRAINT FK_tickets_company
            FOREIGN KEY (company_id) REFERENCES companies(id),
            ADD CONSTRAINT FK_tickets_user
            FOREIGN KEY (user_id) REFERENCES users(id)
        `);

        // Adicionar foreign key em ticket_messages
        await queryRunner.query(`
            ALTER TABLE ticket_messages
            ADD CONSTRAINT FK_ticket_messages_ticket
            FOREIGN KEY (ticket_id) REFERENCES tickets(id)
        `);
    }
} 