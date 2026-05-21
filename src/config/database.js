import 'dotenv/config';
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    dialect: 'postgres',

    logging: (msg) => console.log(`[DB] ${msg}`),

    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },

    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },

    define: {
      timestamps: true,
      underscored: true,
    },
  }
);

export const connectDB = async () => {
  try {
    await sequelize.authenticate();

    console.log('[DB] PostgreSQL connected successfully.');

    await sequelize.sync({
      alter: process.env.NODE_ENV === 'development',
    });

    console.log('[DB] Models synchronized.');
  } catch (error) {
    console.error('[DB] Database connection failed:', error);
    process.exit(1);
  }
};

export default sequelize;