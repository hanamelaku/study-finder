const { nanoid } = require('nanoid');
const Unlock = require('../models/unlock.model');
const Profile = require('../models/profile.model');

// 1. Family clicks "Unlock" and submits their CBE reference
exports.startUnlock = async (req, res) => {
  const profile = await Profile.findById(req.params.profileId);
  if (!profile) return res.status(404).json({ error: 'profile not found' });

  const { payer_email, transaction_ref, payer_name } = req.body;
  
  if (!transaction_ref) {
    return res.status(400).json({ error: 'Please provide the CBE transaction reference number.' });
  }

  const ref = 'PAY-MANUAL-' + nanoid(6).toUpperCase();
  const amount = Number(process.env.AGENT_FEE) || 100;

  // Create the unlock record with status 'pending'
  await Unlock.create(profile.id, payer_email, ref, amount);
  
  // Update the record with the manual payment details
  // You will need to add a function in your model for this, or do it directly here.
  const { pool } = require('../config/db');
  await pool.execute(
    `UPDATE unlocks SET status='pending', payment_method='cbe_manual', transaction_ref=?, payer_name=? WHERE payment_ref=?`,
    [transaction_ref, payer_name || '', ref]
  );

  res.json({ 
    success: true, 
    message: 'Payment submitted for approval. The agent will verify and unlock shortly.',
    payment_ref: ref 
  });
};

// 2. Admin approves the payment
exports.approveUnlock = async (req, res) => {
  const { payment_ref } = req.body;
  if (!payment_ref) return res.status(400).json({ error: 'Missing payment reference' });
  
  await Unlock.markPaid(payment_ref);
  res.json({ success: true, message: 'Payment approved and contact unlocked.' });
};

// 3. (Optional) Admin rejects the payment
exports.rejectUnlock = async (req, res) => {
  const { payment_ref } = req.body;
  if (!payment_ref) return res.status(400).json({ error: 'Missing payment reference' });
  
  const { pool } = require('../config/db');
  await pool.execute(`UPDATE unlocks SET status='rejected' WHERE payment_ref=?`, [payment_ref]);
  res.json({ success: true, message: 'Payment rejected.' });
};

// Keep the webhook for future use
exports.paymentWebhook = async (req, res) => {
  // ... existing code ...
};