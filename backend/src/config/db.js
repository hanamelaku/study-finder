const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'study_finder',
  waitForConnections: true,
  connectionLimit: 10,
});

async function initDb() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS profiles (
      id VARCHAR(10) PRIMARY KEY,
      edit_token VARCHAR(50) UNIQUE,
      full_name VARCHAR(255) NOT NULL,
      age INT,
      city VARCHAR(255),
      subjects TEXT,
      grade_levels VARCHAR(255),
      experience INT,
      rate INT,
      availability VARCHAR(255),
      bio TEXT,
      phone VARCHAR(50) NOT NULL,
      whatsapp VARCHAR(50),
      email VARCHAR(255),
      is_active TINYINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS unlocks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      profile_id VARCHAR(10) NOT NULL,
      payer_email VARCHAR(255),
      payment_ref VARCHAR(100) UNIQUE,
      amount INT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (profile_id) REFERENCES profiles(id)
    )
  `);

  await pool.execute(`
    CREATE INDEX idx_profiles_active ON profiles(is_active)
  `).catch(() => {});

  await pool.execute(`
    CREATE INDEX idx_unlocks_ref ON unlocks(payment_ref)
  `).catch(() => {});
}

module.exports = { pool, initDb };