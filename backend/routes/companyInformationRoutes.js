const express = require('express');
const {
  getCompanyInformation,
  updateCompanyInformation,
} = require('../controllers/companyInformationController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router
  .route('/')
  .get(protect, authorize('super_admin'), getCompanyInformation)
  .put(protect, authorize('super_admin'), updateCompanyInformation);

module.exports = router;
