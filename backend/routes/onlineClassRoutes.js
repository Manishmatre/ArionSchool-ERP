const express = require('express');
const router = express.Router();
const {
  getAllOnlineClasses,
  getOnlineClass,
  createOnlineClass,
  updateOnlineClass,
  deleteOnlineClass,
  joinOnlineClass,
  leaveOnlineClass,
  startOnlineClass,
  endOnlineClass,
  getMyOnlineClasses,
  addMaterial
} = require('../controllers/onlineClassController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');
const upload = require('../middlewares/upload');

// Protected routes
router.use(protect);

// Student routes
router.get('/my', authorize('student'), getMyOnlineClasses);
router.post('/:id/join', authorize('student'), joinOnlineClass);
router.post('/:id/leave', authorize('student'), leaveOnlineClass);

// Instructor/Admin routes
router.put('/:id/start', authorize('super_admin', 'admin', 'franchise_admin', 'staff', 'teacher', 'class_teacher'), startOnlineClass);
router.put('/:id/end', authorize('super_admin', 'admin', 'franchise_admin', 'staff', 'teacher', 'class_teacher'), endOnlineClass);

// Admin/School Admin routes
router.route('/')
  .get(authorize('super_admin', 'admin', 'franchise_admin', 'teacher', 'class_teacher'), getAllOnlineClasses)
  .post(authorize('super_admin', 'admin', 'franchise_admin', 'staff'), createOnlineClass);

router.route('/:id')
  .get(authorize('super_admin', 'admin', 'franchise_admin', 'staff', 'teacher', 'class_teacher', 'student'), getOnlineClass)
  .put(authorize('super_admin', 'admin', 'franchise_admin', 'staff'), updateOnlineClass)
  .delete(authorize('super_admin', 'admin', 'franchise_admin'), deleteOnlineClass);

// Route for adding materials
router.post('/:id/materials', authorize('super_admin', 'admin', 'franchise_admin', 'staff', 'teacher', 'class_teacher'), upload.single('material'), addMaterial);

module.exports = router;
