const { DataSource } = require('typeorm');
require('dotenv').config();

const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306;

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: port,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_DATABASE || 'omni',
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
});

module.exports = dataSource; 