const express = require('express');
const router = express.Router();
const schoolSurveyController = require('../controllers/schoolSurveyController');
const { protect } = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');

router.use(protect);

router.get('/', schoolSurveyController.getSurveys);
router.post(
  '/',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal']),
  schoolSurveyController.createSurvey
);
router.post('/:id/respond', schoolSurveyController.submitResponse);

module.exports = router;
