const express = require('express');
const router = express.Router();
const visitorPassController = require('../controllers/visitorPassController');
const { protect } = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');

router.use(protect);

router.get('/', visitorPassController.getPasses);
router.post(
  '/',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'security_staff', 'principal']),
  visitorPassController.createPass
);
router.put(
  '/:id/checkout',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'security_staff', 'principal']),
  visitorPassController.checkoutPass
);

module.exports = router;
