const { pool } = require('../config/db');

exports.findByUsername = async (username) => {
  const [rows] = await pool.execute('SELECT * FROM admins WHERE username = ?', [username]);
  return rows[0] || null;
};

exports.createAdmin = async (username, hashedPassword) => {
  await pool.execute('INSERT INTO admins (username, password) VALUES (?, ?)', [username, hashedPassword]);
};