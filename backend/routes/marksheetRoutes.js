const express = require('express');
const router = express.Router();
const {
  getMarksheetTemplates,
  getMarksheetTemplate,
  createMarksheetTemplate,
  updateMarksheetTemplate,
  deleteMarksheetTemplate,
  generateMarksheet,
  getGeneratedMarksheets,
  downloadMarksheet,
  deleteMarksheet,
  getMarksheetBlobUrl,
  getMyMarksheets,
  renderMarksheetPreview
} = require('../controllers/marksheetController');
const { protect, authorize } = require('../middlewares/auth');

router.route('/templates')
  .get(protect, authorize('super_admin', 'school_admin', 'principal', 'vice_principal', 'franchise_admin'), getMarksheetTemplates)
  .post(protect, authorize('super_admin', 'school_admin', 'principal', 'vice_principal', 'franchise_admin'), createMarksheetTemplate);

router.route('/templates/:id')
  .get(protect, authorize('super_admin', 'school_admin', 'principal', 'vice_principal', 'franchise_admin'), getMarksheetTemplate)
  .put(protect, authorize('super_admin', 'school_admin', 'principal', 'vice_principal', 'franchise_admin'), updateMarksheetTemplate)
  .delete(protect, authorize('super_admin', 'school_admin', 'principal', 'vice_principal', 'franchise_admin'), deleteMarksheetTemplate);

router.post('/generate/:studentId', protect, authorize('super_admin', 'franchise_admin'), generateMarksheet);
router.post('/render-preview', protect, authorize('super_admin', 'franchise_admin'), renderMarksheetPreview);

router.get('/generated', protect, authorize('super_admin', 'franchise_admin'), getGeneratedMarksheets);
router.get('/my', protect, authorize('student'), getMyMarksheets);
router.get('/download/:id', protect, authorize('super_admin', 'franchise_admin', 'student'), downloadMarksheet);
router.get('/preview/:id', protect, authorize('super_admin', 'franchise_admin', 'student'), getMarksheetBlobUrl);
router.delete('/:id', protect, authorize('super_admin', 'franchise_admin'), deleteMarksheet);

module.exports = router;
