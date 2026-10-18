const { pool } = require('../config/db');

exports.create = async (profileId, payerEmail, paymentRef, amount) => {
  await pool.execute(
    `INSERT INTO unlocks (profile_id, payer_email, payment_ref, amount, status)
     VALUES (?,?,?,?, 'pending')`,
    [profileId, payerEmail || '', paymentRef, amount]
  );
};

exports.markPaid = async (paymentRef) => {
  await pool.execute(
    `UPDATE unlocks SET status='paid' WHERE payment_ref=?`, [paymentRef]
  );
};

exports.hasPaid = async (profileId, paymentRef) => {
  const [rows] = await pool.execute(
    `SELECT 1 FROM unlocks WHERE profile_id=? AND payment_ref=? AND status='paid'`,
    [profileId, paymentRef]
  );
  return rows.length > 0;
};

exports.listAll = async () => {
  const [rows] = await pool.execute(
    `SELECT * FROM unlocks ORDER BY created_at DESC`
  );
  return rows;
};

exports.totalEarned = async () => {
  const [rows] = await pool.execute(
    `SELECT COALESCE(SUM(amount),0) AS total FROM unlocks WHERE status='paid'`
  );
  return rows[0].total;
};

// ... existing code ...

// Add this new function
exports.listPending = async () => {
  const { pool } = require('../config/db');
  const [rows] = await pool.execute(
    `SELECT u.*, p.full_name as seeker_name, p.id as profile_id 
     FROM unlocks u 
     JOIN profiles p ON u.profile_id = p.id 
     WHERE u.status = 'pending' 
     ORDER BY u.created_at DESC`
  );
  return rows;
};