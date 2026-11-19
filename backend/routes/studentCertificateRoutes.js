const express = require('express');
const {
  generateStudentCertificate,
  getStudentCertificateTemplates,
  createStudentCertificateTemplate,
  updateStudentCertificateTemplate,
  deleteStudentCertificateTemplate,
  batchGenerateStudentCertificates,
  getGeneratedStudentCertificates,
  downloadStudentCertificate,
  getStudentCertificateBlobUrl,
  deleteStudentCertificate
} = require('../controllers/studentCertificateController');

const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/my', authorize('student'), (req, res, next) => require('../controllers/studentCertificateController').getMyCertificates(req, res, next));

// @route   POST /api/student-certificates/generate/:studentId
// @desc    Generate student certificate
// @access  Private/Admin/FranchiseAdmin
router.post('/generate/:studentId', authorize('super_admin', 'franchise_admin'), generateStudentCertificate);

// @route   POST /api/student-certificates/batch-generate
// @desc    Batch generate student certificates
// @access  Private/Admin/FranchiseAdmin
router.post('/batch-generate', authorize('super_admin', 'franchise_admin'), batchGenerateStudentCertificates);

// @route   GET /api/student-certificates/templates
// @desc    Get all student certificate templates
// @access  Private/Admin/FranchiseAdmin
router.get('/templates', authorize('super_admin', 'franchise_admin'), getStudentCertificateTemplates);

// @route   POST /api/student-certificates/templates
// @desc    Create student certificate template
// @access  Private/Admin
router.post('/templates', authorize('super_admin'), createStudentCertificateTemplate);

// @route   PUT /api/student-certificates/templates/:id
// @desc    Update student certificate template
// @access  Private/Admin
router.put('/templates/:id', authorize('super_admin'), updateStudentCertificateTemplate);

// @route   DELETE /api/student-certificates/templates/:id
// @desc    Delete student certificate template
// @access  Private/Admin
router.delete('/templates/:id', authorize('super_admin'), deleteStudentCertificateTemplate);

// @route   GET /api/student-certificates/generated
// @desc    Get all generated student certificates
// @access  Private/Admin/FranchiseAdmin
router.get('/generated', authorize('super_admin', 'franchise_admin'), getGeneratedStudentCertificates);

// @route   GET /api/student-certificates/download/:id
// @desc    Download a generated student certificate
// @access  Private/Admin/FranchiseAdmin
router.get('/download/:id', authorize('super_admin', 'franchise_admin', 'student'), downloadStudentCertificate);

// @route   GET /api/student-certificates/preview/:id
// @desc    Get a student certificate as a blob for preview
// @access  Private/Admin/FranchiseAdmin
router.get('/preview/:id', authorize('super_admin', 'franchise_admin', 'student'), getStudentCertificateBlobUrl);

// @route   DELETE /api/student-certificates/:id
// @desc    Delete a student certificate
// @access  Private/Admin/FranchiseAdmin
router.delete('/:id', authorize('super_admin', 'franchise_admin'), deleteStudentCertificate);

module.exports = router;
