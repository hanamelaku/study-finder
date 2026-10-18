const router = require('express').Router();
const c = require('../controllers/unlock.controller');
const { protectAdmin } = require('../middlewares/auth.middleware');

router.post('/webhook/payment', c.paymentWebhook);
router.post('/:profileId', c.startUnlock);

// PROTECTED ADMIN ROUTES:
router.post('/admin/approve', protectAdmin, c.approveUnlock);
router.post('/admin/reject', protectAdmin, c.rejectUnlock);

module.exports = router;