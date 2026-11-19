const express = require('express');
const router = express.Router();
const schoolCertificateController = require('../controllers/schoolCertificateController');
const { protect } = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');

router.use(protect);

router.get('/', schoolCertificateController.getCertificates);
router.post(
  '/issue',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal']),
  schoolCertificateController.issueCertificate
);
router.get('/:id', schoolCertificateController.getCertificateById);

module.exports = router;
