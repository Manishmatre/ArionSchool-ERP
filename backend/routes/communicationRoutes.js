const express = require('express');
const router = express.Router();
const communicationController = require('../controllers/communicationController');
const { protect } = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');

// Webhook endpoints (no JWT required for incoming webhook)
router.get('/whatsapp-webhook', communicationController.whatsappWebhookVerify);
router.post('/whatsapp-webhook', communicationController.handleWhatsAppIncoming);

// Protected routes
router.use(protect);

router.post(
  '/broadcast',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal']),
  communicationController.broadcastNotification
);

router.get('/ptm-slots', communicationController.getPTMSlots);
router.post(
  '/ptm-slots',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal', 'teacher']),
  communicationController.createPTMSlot
);
router.put('/ptm-slots/:id/book', communicationController.bookPTMSlot);

module.exports = router;
