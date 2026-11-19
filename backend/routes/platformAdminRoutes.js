const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const {
  // Public
  checkSubdomainAvailability,
  getPublicPlatformConfig,
  createPublicLead,
  // Analytics
  getPlatformOverview,
  // Schools CRUD & Lifecycle
  getAllSchools,
  getSchoolById,
  provisionSchool,
  updateSchool,
  updateSchoolStatus,
  updateSchoolFeatures,
  resetSchoolAdminPassword,
  impersonateSchoolAdmin,
  deleteSchool,
  // Plans CRUD
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  // Subscriptions & Billing
  getAllSubscriptions,
  updateSchoolSubscription,
  recordSubscriptionInvoice,
  getAllInvoices,
  // Domains
  getDomainsRegistry,
  updateSchoolDomain,
  // Leads CRM
  getLeads,
  createLead,
  updateLead,
  deleteLead,
  convertLeadToSchool,
  // Global Users
  getAllUsers,
  createPlatformUser,
  updatePlatformUser,
  deletePlatformUser,
  // Broadcasts & Config
  getBroadcasts,
  broadcastAnnouncement,
  deleteBroadcast,
  getPlatformConfig,
  updatePlatformConfig,
  // Audit & AI Telemetry
  getAuditLogs,
  getAiTelemetry
} = require('../controllers/platformAdminController');

// Public routes for standalone Marketing Landing Page
router.get('/public/check-subdomain/:subdomain', checkSubdomainAvailability);
router.get('/public/config', getPublicPlatformConfig);
router.post('/public/leads', createPublicLead);

// All Company Platform Control Plane routes strictly require super_admin authorization
router.use(protect);
router.use(authorize('super_admin'));

// 1. Overview & Analytics
router.get('/overview', getPlatformOverview);

// 2. Schools / Tenants Full CRUD & Lifecycle
router.route('/schools')
  .get(getAllSchools)
  .post(provisionSchool);

router.route('/schools/:id')
  .get(getSchoolById)
  .put(updateSchool)
  .delete(deleteSchool);

router.patch('/schools/:id/status', updateSchoolStatus);
router.patch('/schools/:id/features', updateSchoolFeatures);
router.post('/schools/:id/reset-password', resetSchoolAdminPassword);
router.post('/schools/:id/impersonate', impersonateSchoolAdmin);

// 3. Subscription Plans Full CRUD
router.route('/plans')
  .get(getPlans)
  .post(createPlan);

router.route('/plans/:id')
  .put(updatePlan)
  .delete(deletePlan);

// 4. Subscriptions & Invoices
router.get('/subscriptions', getAllSubscriptions);
router.put('/subscriptions/:schoolId', updateSchoolSubscription);
router.post('/subscriptions/:schoolId/invoices', recordSubscriptionInvoice);
router.get('/invoices', getAllInvoices);

// 5. Subdomains & Custom Domains Registry
router.get('/domains', getDomainsRegistry);
router.put('/domains/:schoolId', updateSchoolDomain);

// 6. Leads CRM & Founder's Offer Claims
router.route('/leads')
  .get(getLeads)
  .post(createLead);

router.route('/leads/:id')
  .put(updateLead)
  .delete(deleteLead);

router.post('/leads/:id/convert', convertLeadToSchool);

// 7. Global Users & Platform Team RBAC
router.route('/users')
  .get(getAllUsers)
  .post(createPlatformUser);

router.route('/users/:id')
  .put(updatePlatformUser)
  .delete(deletePlatformUser);

// 8. Broadcasts & System Settings
router.get('/broadcasts', getBroadcasts);
router.post('/broadcast', broadcastAnnouncement);
router.delete('/broadcasts/:id', deleteBroadcast);

router.route('/config')
  .get(getPlatformConfig)
  .put(updatePlatformConfig);

// 9. Audit Logs & AI Telemetry
router.get('/audit-logs', getAuditLogs);
router.get('/ai-usage', getAiTelemetry);

module.exports = router;
