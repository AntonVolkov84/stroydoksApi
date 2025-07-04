import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
  connectionString: 'postgres://antvolkov:6101ahil@localhost:5432/dbstroydoks',
});

async function createTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        emailConfirmed BOOLEAN NOT NULL DEFAULT FALSE,
        forgotPasswordToken VARCHAR(255),
        forgotPasswordTokenExpires TIMESTAMP,
        emailConfirmToken VARCHAR(255),
        isAdmin BOOLEAN DEFAULT FALSE
      );
    `);
    } catch (err) {
    console.error('Ошибка создания таблицы:', err);
  }
}

createTable();

export default pool;

  