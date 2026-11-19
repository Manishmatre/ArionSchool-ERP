const express = require('express');
const router = express.Router();
const {
  getAcademicSessions,
  createAcademicSession,
  updateAcademicSession,
  deleteAcademicSession,
  getSchoolClasses,
  createSchoolClass,
  updateSchoolClass,
  deleteSchoolClass,
  getSections,
  createSection,
  updateSection,
  deleteSection,
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getHouses,
  createHouse,
  updateHouse,
  deleteHouse,
  seedSchoolDefaults
} = require('../controllers/academicMasterController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');

router.use(protect);

const readRoles = [
  'super_admin',
  'school_admin',
  'franchise_admin',
  'principal',
  'vice_principal',
  'teacher',
  'class_teacher',
  'accountant',
  'admission_officer'
];

const writeRoles = [
  'super_admin',
  'school_admin',
  'franchise_admin',
  'principal',
  'vice_principal'
];

// Academic Sessions
router.route('/sessions')
  .get(authorize(...readRoles), getAcademicSessions)
  .post(authorize(...writeRoles), createAcademicSession);

router.route('/sessions/:id')
  .put(authorize(...writeRoles), updateAcademicSession)
  .delete(authorize(...writeRoles), deleteAcademicSession);

// School Classes
router.route('/classes')
  .get(authorize(...readRoles), getSchoolClasses)
  .post(authorize(...writeRoles), createSchoolClass);

router.route('/classes/:id')
  .put(authorize(...writeRoles), updateSchoolClass)
  .delete(authorize(...writeRoles), deleteSchoolClass);

// Sections
router.route('/sections')
  .get(authorize(...readRoles), getSections)
  .post(authorize(...writeRoles), createSection);

router.route('/sections/:id')
  .put(authorize(...writeRoles), updateSection)
  .delete(authorize(...writeRoles), deleteSection);

// Subjects
router.route('/subjects')
  .get(authorize(...readRoles), getSubjects)
  .post(authorize(...writeRoles), createSubject);

router.route('/subjects/:id')
  .put(authorize(...writeRoles), updateSubject)
  .delete(authorize(...writeRoles), deleteSubject);

// Houses
router.route('/houses')
  .get(authorize(...readRoles), getHouses)
  .post(authorize(...writeRoles), createHouse);

router.route('/houses/:id')
  .put(authorize(...writeRoles), updateHouse)
  .delete(authorize(...writeRoles), deleteHouse);

// One-click default seeding
router.post('/seed-defaults', authorize('super_admin', 'school_admin', 'franchise_admin'), seedSchoolDefaults);

module.exports = router;
