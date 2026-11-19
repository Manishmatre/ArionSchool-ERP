const express = require('express');
const router = express.Router();
const schoolEventController = require('../controllers/schoolEventController');
const { protect } = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');

router.use(protect);

router.get('/', schoolEventController.getEvents);
router.post(
  '/',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal']),
  schoolEventController.createEvent
);
router.delete(
  '/:id',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal']),
  schoolEventController.deleteEvent
);

module.exports = router;
