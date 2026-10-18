const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('express-async-errors');

const express = require('express');
// Point to the src folder:
const { initDb } = require('./src/config/db'); 
const { notFound, errorHandler } = require('./src/middlewares/error.middleware');
const { protectAdmin } = require('./src/middlewares/auth.middleware');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Routes
app.use('/api/auth', require('./src/routes/auth.routes')); // <-- New Auth Route
app.use('/api/profiles', require('./src/routes/profile.routes'));
app.use('/api/unlock', require('./src/routes/unlock.routes'));

app.get('/api/config', (req, res) => {
  res.json({
    cbe_name: process.env.CBE_ACCOUNT_NAME,
    cbe_number: process.env.CBE_ACCOUNT_NUMBER,
    agent_fee: Number(process.env.AGENT_FEE) || 100
  });
});

// Admin Dashboard Route (Now Protected by JWT Middleware)
app.get('/api/admin', protectAdmin, async (req, res) => {
  const Unlock = require('./src/models/unlock.model');
  const Profile = require('./src/models/profile.model');
  
  res.json({
    total_earned: await Unlock.totalEarned(),
    unlocks: await Unlock.listAll(),
    active_profiles: (await Profile.list({})).length,
    pending_unlocks: await Unlock.listPending(),
  });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
initDb().then(() => {
  app.listen(PORT, () => console.log(`✅  http://localhost:${PORT}`));
}).catch((err) => {
  console.error('❌ DB init failed:', err);
});