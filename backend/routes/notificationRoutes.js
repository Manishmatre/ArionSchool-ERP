const express = require('express');
const router = express.Router();
const {
  getAllNotifications,
  getMyNotifications,
  getNotification,
  createNotification,
  sendNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  getNotificationStats
} = require('../controllers/notificationController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');

// Protect all routes
router.use(protect);

router.get('/my', getMyNotifications);
router.get('/unread/count', getUnreadCount);
router.put('/read-all', markAllAsRead);

router.route('/')
  .get(authorize('super_admin', 'franchise_admin'), getAllNotifications)
  .post(authorize('super_admin', 'franchise_admin'), createNotification);

router.get('/stats', authorize('super_admin', 'franchise_admin'), getNotificationStats);

router.route('/:id')
  .get(getNotification)
  .delete(authorize('super_admin'), deleteNotification);

router.post('/:id/send', authorize('super_admin', 'franchise_admin'), sendNotification);
router.put('/:id/read', markAsRead);

module.exports = router;
