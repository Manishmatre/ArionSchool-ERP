const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');
const {
  chatWithAssistant,
  getConversations,
  getConversationById,
  deleteConversation,
  clearConversation,
  getDashboardInsights,
  getStudentSummary,
  generateLessonPlan,
  generateQuestions,
  generateCommunicationDraft,
  getUsageStats,
  getAiConfig
} = require('../controllers/aiController');

// All AI routes require authentication
router.use(protect);

// 1. Assistant chat & conversations
router.post('/assistant/chat', chatWithAssistant);
router.get('/assistant/conversations', getConversations);
router.get('/assistant/conversations/:id', getConversationById);
router.delete('/assistant/conversations/:id', deleteConversation);
router.post('/assistant/conversations/:id/clear', clearConversation);

// 2. Dashboard Insights
router.get('/insights/dashboard', getDashboardInsights);

// 3. Student Intelligence
router.get('/student/summary/:studentId', getStudentSummary);
router.post('/student/summary', getStudentSummary);

// 4. Teacher AI: Lesson Plan & Question Generator
router.post('/teacher/lesson-plan', authorize('super_admin', 'school_admin', 'franchise_admin', 'principal', 'teacher', 'staff'), generateLessonPlan);
router.post('/teacher/questions', authorize('super_admin', 'school_admin', 'franchise_admin', 'principal', 'teacher', 'staff'), generateQuestions);

// 5. Communications Assistant
router.post('/communication/draft', authorize('super_admin', 'school_admin', 'franchise_admin', 'principal', 'teacher', 'staff'), generateCommunicationDraft);

// 6. Usage & Configuration (Admins)
router.get('/usage/stats', authorize('super_admin', 'school_admin', 'franchise_admin', 'principal'), getUsageStats);
router.get('/config', authorize('super_admin', 'school_admin', 'franchise_admin', 'principal'), getAiConfig);

module.exports = router;
