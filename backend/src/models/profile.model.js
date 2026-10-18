const { pool } = require('../config/db');

const PUBLIC_COLS = `id, full_name, age, city, subjects, grade_levels,
                     experience, rate, availability, created_at`;

exports.create = async (data) => {
  await pool.execute(
    `INSERT INTO profiles
      (id, edit_token, full_name, age, city, subjects, grade_levels,
       experience, rate, availability, bio, phone, email)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      data.id, data.edit_token, data.full_name, data.age || null,
      data.city || '', data.subjects || '', data.grade_levels || '',
      data.experience || 0, data.rate || 0, data.availability || '',
      data.bio || '', data.phone, data.email || ''
    ]
  );
  return data.id;
};

exports.list = async ({ subject, city, maxRate }) => {
  let sql = `SELECT ${PUBLIC_COLS} FROM profiles WHERE is_active = 1`;
  const args = [];
  if (subject) { sql += ' AND subjects LIKE ?'; args.push(`%${subject}%`); }
  if (city)    { sql += ' AND city LIKE ?';     args.push(`%${city}%`); }
  if (maxRate) { sql += ' AND rate <= ?';       args.push(Number(maxRate)); }
  sql += ' ORDER BY created_at DESC';
  const [rows] = await pool.execute(sql, args);
  return rows;
};

exports.findById = async (id) => {
  const [rows] = await pool.execute(
    'SELECT * FROM profiles WHERE id = ? AND is_active = 1', [id]
  );
  return rows[0] || null;
};

exports.findByToken = async (token) => {
  const [rows] = await pool.execute(
    'SELECT * FROM profiles WHERE edit_token = ?', [token]
  );
  return rows[0] || null;
};

exports.updateByToken = async (token, fields) => {
  const cur = await exports.findByToken(token);
  if (!cur) return null;
  await pool.execute(
    `UPDATE profiles SET
       full_name=?, age=?, city=?, subjects=?, grade_levels=?,
       experience=?, rate=?, availability=?, bio=?,
       phone=?, email=?
     WHERE edit_token=?`,
    [
      fields.full_name ?? cur.full_name,
      fields.age ?? cur.age,
      fields.city ?? cur.city,
      fields.subjects ?? cur.subjects,
      fields.grade_levels ?? cur.grade_levels,
      fields.experience ?? cur.experience,
      fields.rate ?? cur.rate,
      fields.availability ?? cur.availability,
      fields.bio ?? cur.bio,
      fields.phone ?? cur.phone,
      fields.email ?? cur.email,
      token
    ]
  );
  return true;
};

exports.deactivate = async (token) => {
  await pool.execute(
    'UPDATE profiles SET is_active = 0 WHERE edit_token = ?', [token]
  );
};