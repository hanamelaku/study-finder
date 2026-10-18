const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin.model');

// Login
exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const admin = await Admin.findByUsername(username);
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

  // Create Token (valid for 1 day)
  const token = jwt.sign({ id: admin.id, username: admin.username }, process.env.JWT_SECRET, { expiresIn: '1d' });
  
  res.json({ token });
};

// Script to create the first admin (Run once)
exports.register = async (req, res) => {
  const { username, password, secretKey } = req.body;
  
  // Security check so random people can't make themselves admin
  if (secretKey !== process.env.ADMIN_REGISTER_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await Admin.createAdmin(username, hashedPassword);
  res.json({ success: true, message: 'Admin created' });
};