const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboardingController');
const { protect } = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');

router.use(protect);

router.post(
  '/preview',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal']),
  onboardingController.previewImport
);

router.post(
  '/commit',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal']),
  onboardingController.commitImport
);

module.exports = router;
