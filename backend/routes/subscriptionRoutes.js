const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const { resolveTenant } = require('../middlewares/tenantMiddleware');
const {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getMySchoolSubscription,
  assignPlanToSchool
} = require('../controllers/subscriptionController');

// Public or authenticated plan listing
router.get('/plans', getPlans);

// Protected routes
router.use(protect);
router.use(resolveTenant());

router.get('/my-subscription', getMySchoolSubscription);

// Super Admin plan management
router.post('/plans', authorize('super_admin'), createPlan);
router.put('/plans/:id', authorize('super_admin'), updatePlan);
router.delete('/plans/:id', authorize('super_admin'), deletePlan);
router.post('/assign', authorize('super_admin'), assignPlanToSchool);

module.exports = router;
