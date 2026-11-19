const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const { protect } = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');

router.use(protect);

router.get('/', timetableController.getTimetable);

router.post(
  '/',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal']),
  timetableController.saveTimetableEntry
);

router.delete(
  '/:id',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal']),
  timetableController.deleteTimetableEntry
);

router.post(
  '/auto-generate',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal']),
  timetableController.autoGenerateTimetable
);

module.exports = router;
