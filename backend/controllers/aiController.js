const AiConversation = require('../models/AiConversation');
const AiUsageLog = require('../models/AiUsageLog');
const aiService = require('../services/aiService');
const Franchise = require('../models/SchoolCampus');

// Helper to resolve active campus / school ID
const resolveFranchiseId = async (req) => {
  if (req.user.franchise) return req.user.franchise;
  if (req.query.franchiseId || req.body.franchiseId) return req.query.franchiseId || req.body.franchiseId;
  const firstCampus = await Franchise.findOne({ status: 'active' }).select('_id');
  return firstCampus ? firstCampus._id : null;
};

// 1. Interactive Assistant Chat
exports.chatWithAssistant = async (req, res) => {
  try {
    const { message, conversationId, schoolName } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const franchiseId = await resolveFranchiseId(req);
    const result = await aiService.chatAssistant({
      user: req.user,
      franchiseId,
      conversationId,
      message: message.trim(),
      schoolName: schoolName || 'SES Educare'
    });

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[AI Assistant Chat Error]:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'AI Assistant encountered an error processing your request'
    });
  }
};

// 2. Conversation Management
exports.getConversations = async (req, res) => {
  try {
    const conversations = await AiConversation.find({ user: req.user._id, active: true })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select('title module messages updatedAt createdAt');

    res.status(200).json({
      success: true,
      data: conversations
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
  }
};

exports.getConversationById = async (req, res) => {
  try {
    const conversation = await AiConversation.findOne({ _id: req.params.id, user: req.user._id });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load conversation' });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const result = await AiConversation.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!result) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    res.status(200).json({ success: true, message: 'Conversation deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete conversation' });
  }
};

exports.clearConversation = async (req, res) => {
  try {
    const conversation = await AiConversation.findOne({ _id: req.params.id, user: req.user._id });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    conversation.messages = [];
    await conversation.save();
    res.status(200).json({ success: true, message: 'Conversation history cleared', data: conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to clear conversation' });
  }
};

// 3. Dashboard Insights
exports.getDashboardInsights = async (req, res) => {
  try {
    const franchiseId = await resolveFranchiseId(req);
    const insights = await aiService.generateDashboardInsights({
      user: req.user,
      franchiseId,
      schoolName: req.query.schoolName || 'SES Educare'
    });

    res.status(200).json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('[AI Dashboard Insights Error]:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to generate AI dashboard insights'
    });
  }
};

// 4. Student Academic Profile & Teacher Remarks
exports.getStudentSummary = async (req, res) => {
  try {
    const studentId = req.params.studentId || req.query.studentId || req.body.studentId;
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required' });
    }

    const franchiseId = await resolveFranchiseId(req);
    const summary = await aiService.generateStudentSummary({
      user: req.user,
      studentId,
      franchiseId
    });

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('[AI Student Summary Error]:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to generate student intelligence summary'
    });
  }
};

// 5. Teacher AI: Lesson Plan
exports.generateLessonPlan = async (req, res) => {
  try {
    const { className, subject, topic, duration, learningObjectives } = req.body;
    if (!className || !subject || !topic) {
      return res.status(400).json({ success: false, message: 'Class, Subject, and Topic are required' });
    }

    const franchiseId = await resolveFranchiseId(req);
    const plan = await aiService.generateLessonPlan({
      user: req.user,
      franchiseId,
      className,
      subject,
      topic,
      duration,
      learningObjectives
    });

    res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('[AI Lesson Plan Error]:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to generate lesson plan'
    });
  }
};

// 6. Teacher / Exam AI: Question Generator
exports.generateQuestions = async (req, res) => {
  try {
    const { className, subject, topic, questionType, count, difficulty, language } = req.body;
    if (!className || !subject || !topic) {
      return res.status(400).json({ success: false, message: 'Class, Subject, and Topic are required' });
    }

    const franchiseId = await resolveFranchiseId(req);
    const questions = await aiService.generateQuestions({
      user: req.user,
      franchiseId,
      className,
      subject,
      topic,
      questionType: questionType || 'mcq',
      count: count ? Number(count) : 5,
      difficulty: difficulty || 'medium',
      language: language || 'English'
    });

    res.status(200).json({
      success: true,
      data: questions
    });
  } catch (error) {
    console.error('[AI Question Generator Error]:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to generate questions'
    });
  }
};

// 7. Communication AI (Notices, Circulars, SMS/WhatsApp)
exports.generateCommunicationDraft = async (req, res) => {
  try {
    const { type, title, audience, language, keyPoints, schoolName } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Title / Subject is required' });
    }

    const franchiseId = await resolveFranchiseId(req);
    const draft = await aiService.generateCommunicationDraft({
      user: req.user,
      franchiseId,
      type: type || 'notice',
      title,
      audience,
      language: language || 'English',
      keyPoints,
      schoolName: schoolName || 'SES Educare'
    });

    res.status(200).json({
      success: true,
      data: draft
    });
  } catch (error) {
    console.error('[AI Communication Draft Error]:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to generate communication draft'
    });
  }
};

// 8. AI Usage Statistics
exports.getUsageStats = async (req, res) => {
  try {
    const franchiseId = await resolveFranchiseId(req);
    const match = franchiseId && !['super_admin', 'school_owner'].includes(req.user.role) ? { franchise: franchiseId } : {};

    const totalRequests = await AiUsageLog.countDocuments(match);
    const successRequests = await AiUsageLog.countDocuments({ ...match, status: 'success' });
    const failedRequests = await AiUsageLog.countDocuments({ ...match, status: 'failed' });

    // Module breakdown
    const moduleStats = await AiUsageLog.aggregate([
      { $match: match },
      { $group: { _id: '$module', count: { $sum: 1 }, totalTokens: { $sum: '$totalTokens' } } },
      { $sort: { count: -1 } }
    ]);

    // Total tokens
    const tokenAggregate = await AiUsageLog.aggregate([
      { $match: match },
      { $group: { _id: null, totalTokens: { $sum: '$totalTokens' }, avgResponseTime: { $avg: '$responseTimeMs' } } }
    ]);

    const totalTokens = tokenAggregate[0]?.totalTokens || 0;
    const avgResponseTime = Math.round(tokenAggregate[0]?.avgResponseTime || 0);

    // Recent logs
    const recentLogs = await AiUsageLog.find(match)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name email role');

    res.status(200).json({
      success: true,
      data: {
        totalRequests,
        successRequests,
        failedRequests,
        totalTokens,
        avgResponseTimeMs: avgResponseTime,
        moduleStats,
        recentLogs,
        provider: process.env.AI_PROVIDER || 'groq',
        model: process.env.AI_MODEL || 'openai/gpt-oss-120b',
        monthlyQuota: 100000,
        quotaRemaining: Math.max(0, 100000 - totalRequests)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve AI usage statistics' });
  }
};

// 9. AI Admin Configuration
exports.getAiConfig = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        provider: process.env.AI_PROVIDER || 'groq',
        model: process.env.AI_MODEL || 'openai/gpt-oss-120b',
        hasApiKey: Boolean(process.env.GROQ_API_KEY),
        supportedModels: [
          'openai/gpt-oss-120b',
          'openai/gpt-oss-20b',
          'qwen/qwen3.8-27b'
        ],
        status: process.env.GROQ_API_KEY ? 'connected' : 'unconfigured'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch AI configuration' });
  }
};
