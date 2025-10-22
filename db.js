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
        image_url TEXT,
        image_public_id TEXT,
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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_calculations (
      id SERIAL PRIMARY KEY,
      userId INTEGER NOT NULL,
      title TEXT NOT NULL,
      calculator JSONB NOT NULL,  
      input_values JSONB NOT NULL, 
      image_url TEXT,
      image_public_id TEXT,
      result TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_commercialoffer (
      id SERIAL PRIMARY KEY,
      userId INTEGER NOT NULL,
      title TEXT NOT NULL,
      rows JSONB NOT NULL,  
      taxRate INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_commercialofferformone (
      id SERIAL PRIMARY KEY,
      userId INTEGER NOT NULL,
      title TEXT NOT NULL,
      rows JSONB NOT NULL,  
      taxRate INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_pendingcommercialoffer (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      title TEXT NOT NULL,
      rows JSONB NOT NULL,  
      taxRate INTEGER NOT NULL,
      type TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reference_data (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      text TEXT NOT NULL,
      text_images JSONB NOT NULL DEFAULT '[]',
      table_images JSONB NOT NULL DEFAULT '[]',
      updated_at TIMESTAMP DEFAULT NOW()
     );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_billofquantities (
      id SERIAL PRIMARY KEY,
      userid INTEGER NOT NULL,
      title TEXT NOT NULL,
      rows JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
     );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS objects (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      address TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
    );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pending_works (
      id            SERIAL PRIMARY KEY,
      worker_id     INT NOT NULL REFERENCES users(id),
      title         TEXT NOT NULL,
      unit          VARCHAR(50) NOT NULL,
      quantity      DECIMAL(10,2) NOT NULL,
      created_at    TIMESTAMP DEFAULT NOW(),
      updated_at    TIMESTAMP DEFAULT NOW()
    );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS send_works (
      id              SERIAL PRIMARY KEY,
      worker_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title           TEXT NOT NULL,
      unit            VARCHAR(50) NOT NULL,
      quantity        DECIMAL(10,2) NOT NULL,
      created_at      TIMESTAMP DEFAULT NOW(),
      updated_at      TIMESTAMP DEFAULT NOW()
    );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recipients (
      id SERIAL PRIMARY KEY,
      worker_id INT NOT NULL REFERENCES users(id),
      recipient_id INT NOT NULL REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    );
    `);
    } catch (err) {
    console.error('Ошибка создания таблицы:', err);
  }
}

createTable();

export default pool;

  