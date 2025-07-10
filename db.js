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
        isAdmin BOOLEAN DEFAULT FALSE,
        name VARCHAR(100) NOT NULL,
        surname VARCHAR(100) NOT NULL
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calculators (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        formula TEXT NOT NULL,
        variables JSONB NOT NULL,
        author_email TEXT NOT NULL,
        result_unit TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS news (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      text TEXT NOT NULL,
      imageUrl TEXT,
      imagePublicId VARCHAR(255),
      author_email VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    `);
    } catch (err) {
    console.error('Ошибка создания таблицы:', err);
  }
}

createTable();

export default pool;

  