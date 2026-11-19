const express = require('express');
const router = express.Router();
const {
  getAllFranchises,
  getFranchise,
  createFranchise,
  updateFranchise,
  deleteFranchise,
  getFranchisePerformance,
  updateFranchiseStatus,
  assignCourses
} = require('../controllers/campusController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');
const checkCampusStatus = require('../middlewares/checkCampusStatus');
const upload = require('../middlewares/upload');
const { optionalUpload } = require('../middlewares/upload');

// Protect all routes
router.use(protect);

router.route('/')
  .get(authorize('super_admin', 'franchise_admin', 'school_admin', 'principal'), checkCampusStatus, getAllFranchises)
  .post(authorize('super_admin'), upload.fields([
    { name: 'aadhaarFileFront', maxCount: 1 },
    { name: 'aadhaarFileBack', maxCount: 1 },
    { name: 'panFile', maxCount: 1 },
    { name: 'qualificationFile', maxCount: 1 },
    { name: 'centerPhoto', maxCount: 1 },
    { name: 'ownerSignature', maxCount: 1 }
  ]), createFranchise);

router.route('/:id')
  .get(authorize('super_admin', 'franchise_admin', 'school_admin', 'principal'), checkCampusStatus, getFranchise)
  .put(authorize('super_admin', 'franchise_admin', 'school_admin', 'principal'), checkCampusStatus, optionalUpload([
    { name: 'aadhaarFileFront', maxCount: 1 },
    { name: 'aadhaarFileBack', maxCount: 1 },
    { name: 'panFile', maxCount: 1 },
    { name: 'qualificationFile', maxCount: 1 },
    { name: 'centerPhoto', maxCount: 1 },
    { name: 'ownerSignature', maxCount: 1 }
  ]), updateFranchise)
  .delete(authorize('super_admin'), deleteFranchise);

router.get('/:id/performance', authorize('super_admin', 'franchise_admin', 'school_admin', 'principal'), checkCampusStatus, getFranchisePerformance);
router.put('/:id/status', authorize('super_admin'), updateFranchiseStatus);
router.put('/:id/assign-courses', authorize('super_admin'), assignCourses);

module.exports = router;
