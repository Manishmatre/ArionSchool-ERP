const express = require('express');
const router = express.Router();
const {
  getAllCertificates,
  getCertificate,
  generateCertificate,
  downloadCertificate,
  revokeCertificate,
  deleteCertificate,
  getStudentCertificates,
  getMyCertificates,
  verifyCertificate
} = require('../controllers/certificateController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');

// Public route
router.get('/verify/:code', verifyCertificate);

// Protected routes
router.use(protect);

// Student route
router.get('/mine', authorize('student'), getMyCertificates);

// Admin routes
router.route('/')
  .get(authorize('super_admin', 'franchise_admin'), getAllCertificates);

router.post('/generate', authorize('super_admin', 'franchise_admin'), generateCertificate);
router.get('/student/:studentId', authorize('super_admin', 'franchise_admin'), getStudentCertificates);

router.route('/:id')
  .get(authorize('super_admin', 'franchise_admin'), getCertificate)
  .delete(authorize('super_admin'), deleteCertificate);

router.get('/:id/download', authorize('super_admin', 'franchise_admin'), downloadCertificate);
router.put('/:id/revoke', authorize('super_admin', 'franchise_admin'), revokeCertificate);

module.exports = router;

