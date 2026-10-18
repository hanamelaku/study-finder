const router = require('express').Router();
const c = require('../controllers/profile.controller');
const { protectAdmin } = require('../middlewares/auth.middleware');

router.post('/', c.createProfile);
router.get('/', c.listProfiles);
router.get('/by-token/:token', c.getProfileByToken); 
router.get('/:id', c.getProfile);
router.patch('/:token', c.updateProfile);
router.delete('/:token', c.deactivateProfile);

module.exports = router;