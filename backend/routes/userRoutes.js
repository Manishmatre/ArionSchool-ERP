const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  updateProfile,
  changePassword,
  uploadProfilePicture,
  deleteProfilePicture
} = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Profile routes (accessible by all authenticated users)
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/profile/photo', protect, upload.single('photo'), uploadProfilePicture);
router.delete('/profile/photo', protect, deleteProfilePicture);

// Admin only routes
router.use(protect);
router.use(authorize('super_admin'));

router.route('/')
  .get(getAllUsers);

router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

module.exports = router;
