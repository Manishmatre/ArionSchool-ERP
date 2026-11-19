const express = require('express');
const router = express.Router();
const disciplineController = require('../controllers/disciplineController');
const { protect } = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');

router.use(protect);

router.get('/', disciplineController.getRecords);
router.post(
  '/',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal', 'teacher', 'class_teacher']),
  disciplineController.createRecord
);
router.put('/:id/acknowledge', disciplineController.acknowledgeParent);

module.exports = router;
