const express = require('express');
const {
  uploadCompanyDocument,
  deleteCompanyDocument,
} = require('../controllers/companyDocumentsController');
const { protect, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

const router = express.Router();

router
  .route('/')
  .post(protect, authorize('super_admin'), upload.single('document'), uploadCompanyDocument);

router
    .route('/:docId')
    .delete(protect, authorize('super_admin'), deleteCompanyDocument);

module.exports = router;
