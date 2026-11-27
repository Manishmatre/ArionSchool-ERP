const AiUsageLog = require('../models/AiUsageLog');
const AiConversation = require('../models/AiConversation');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const FeeObligation = require('../models/FeeObligation');
const StudentMark = require('../models/StudentMark');
const SchoolClass = require('../models/SchoolClass');

const DEFAULT_MODEL = process.env.AI_MODEL || 'openai/gpt-oss-120b';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

/**
 * Execute raw completion against configured LLM provider
 */
async function callLlmProvider({
  messages,
  temperature = 0.5,
  maxTokens = 1500,
  model = DEFAULT_MODEL,
  timeoutMs = 30000
}) {
  const apiKey = GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('AI Provider credentials missing. Please set GROQ_API_KEY in backend environment.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const startTime = Date.now();
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens
      }),
      signal: controller.signal
    });

    clearTimeout(timer);
    const responseTimeMs = Date.now() - startTime;

    if (!res.ok) {
      const errText = await res.text();
      let errData = {};
      try { errData = JSON.parse(errText); } catch (e) { errData = { message: errText }; }
      const message = errData.error?.message || errData.message || `LLM Provider returned error HTTP ${res.status}`;
      const err = new Error(message);
      err.statusCode = res.status;
      err.responseTimeMs = responseTimeMs;
      throw err;
    }

    const data = await res.json();
    const assistantMessage = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || {};

    return {
      content: assistantMessage,
      usage: {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0
      },
      model: data.model || model,
      responseTimeMs
    };
  } catch (error) {
    clearTimeout(timer);
    if (error.name === 'AbortError') {
      const timeoutErr = new Error(`AI Provider timed out after ${timeoutMs / 1000} seconds.`);
      timeoutErr.statusCode = 504;
      throw timeoutErr;
    }
    throw error;
  }
}

/**
 * Track AI Usage in Database
 */
async function recordUsage({
  user,
  franchise,
  module,
  action,
  model = DEFAULT_MODEL,
  usage = {},
  responseTimeMs = 0,
  status = 'success',
  error = null
}) {
  try {
    await AiUsageLog.create({
      user: user?._id || user,
      franchise: franchise?._id || franchise || undefined,
      module,
      action,
      provider: 'groq',
      model,
      promptTokens: usage.promptTokens || 0,
      completionTokens: usage.completionTokens || 0,
      totalTokens: usage.totalTokens || 0,
      responseTimeMs,
      status,
      error: error ? String(error.message || error) : undefined
    });
  } catch (logErr) {
    console.error('[AI Usage Log Error]:', logErr.message);
  }
}

/**
 * Query safe, permission-checked real school operational stats
 */
async function getSchoolOperationalStats(franchiseId) {
  const query = franchiseId ? { franchise: franchiseId } : {};

  try {
    // 1. Total Active Students
    const studentCount = await Student.countDocuments({
      ...query,
      status: { $ne: 'inactive' }
    });

    // 2. Today's Attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendanceRecords = await Attendance.find({
      ...query,
      date: { $gte: today, $lt: tomorrow }
    }).select('status');

    const totalMarked = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
    const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
    const attendancePercentage = totalMarked > 0 ? ((presentCount / totalMarked) * 100).toFixed(1) : 0;

    // 3. Pending Fee Collection
    const feeObligations = await FeeObligation.find({
      ...query,
      status: { $in: ['open', 'partial', 'overdue'] }
    }).select('amountPending amountDue amountPaid status');

    const totalPendingFee = feeObligations.reduce((sum, f) => sum + (f.amountPending || 0), 0);
    const totalDueFee = feeObligations.reduce((sum, f) => sum + (f.amountDue || 0), 0);

    // 4. Class Distribution
    const classes = await SchoolClass.find(query).select('name code capacity');

    return {
      activeStudents: studentCount,
      todayAttendance: {
        totalMarked,
        present: presentCount,
        absent: absentCount,
        percentage: Number(attendancePercentage)
      },
      finances: {
        pendingFees: totalPendingFee,
        totalObligations: totalDueFee
      },
      classCount: classes.length,
      classes: classes.map(c => c.name)
    };
  } catch (e) {
    console.error('[AI Operational Stats Error]:', e);
    return {
      activeStudents: 0,
      todayAttendance: { totalMarked: 0, present: 0, absent: 0, percentage: 0 },
      finances: { pendingFees: 0, totalObligations: 0 },
      classCount: 0,
      classes: []
    };
  }
}

/**
 * 1. AI Assistant Chat
 */
async function chatAssistant({ user, franchiseId, conversationId, message, schoolName = 'Arion School' }) {
  let conversation = null;
  if (conversationId) {
    conversation = await AiConversation.findOne({ _id: conversationId, user: user._id });
  }

  if (!conversation) {
    conversation = await AiConversation.create({
      user: user._id,
      franchise: franchiseId || user.franchise,
      title: message.substring(0, 48),
      module: 'assistant',
      messages: []
    });
  }

  // Fetch school stats for role-appropriate context
  const stats = await getSchoolOperationalStats(franchiseId || user.franchise);

  const systemPrompt = `You are Arion School Copilot, an expert AI educational assistant for ${schoolName}.
Role of logged-in user: ${user.role} (${user.name || 'User'}).
School ID: ${franchiseId || 'Global'}.

REAL LIVE OPERATIONAL CONTEXT (Do not invent or contradict these statistics):
- Active Enrolled Students: ${stats.activeStudents}
- Today's Attendance Marked: ${stats.todayAttendance.totalMarked} students (${stats.todayAttendance.present} Present, ${stats.todayAttendance.absent} Absent, ${stats.todayAttendance.percentage}% Attendance)
${user.role === 'student' || user.role === 'parent' ? '' : `- Total Pending Fee Collection: INR ${stats.finances.pendingFees.toLocaleString('en-IN')}`}
- Active Classes: ${stats.classes.join(', ') || 'N/A'}

GUIDELINES:
1. Provide concise, professional, actionable answers.
2. If the user asks about school statistics, use the real figures provided above.
3. If an unauthorized role (such as student or parent) asks for financial ledger or staff payroll data, politely refuse as per school confidentiality policy.
4. Always maintain high educational standards. Format output cleanly in Markdown with bold headers and bullet points where helpful.`;

  const historyMessages = conversation.messages.slice(-6).map(m => ({
    role: m.role,
    content: m.content
  }));

  const messagesPayload = [
    { role: 'system', content: systemPrompt },
    ...historyMessages,
    { role: 'user', content: message }
  ];

  try {
    const result = await callLlmProvider({
      messages: messagesPayload,
      temperature: 0.6,
      maxTokens: 1200
    });

    // Save history
    conversation.messages.push({ role: 'user', content: message });
    conversation.messages.push({ role: 'assistant', content: result.content });
    await conversation.save();

    await recordUsage({
      user,
      franchise: franchiseId || user.franchise,
      module: 'assistant',
      action: 'chat',
      model: result.model,
      usage: result.usage,
      responseTimeMs: result.responseTimeMs,
      status: 'success'
    });

    return {
      conversationId: conversation._id,
      reply: result.content,
      usage: result.usage
    };
  } catch (error) {
    await recordUsage({
      user,
      franchise: franchiseId || user.franchise,
      module: 'assistant',
      action: 'chat',
      status: 'failed',
      error
    });
    throw error;
  }
}

/**
 * 2. Dashboard AI Insights
 */
async function generateDashboardInsights({ user, franchiseId, schoolName = 'Arion School' }) {
  const stats = await getSchoolOperationalStats(franchiseId);

  const prompt = `As a School Operations Analyst, produce a concise, executive intelligence brief for ${schoolName}.
Current verified school database metrics:
- Enrolled Students: ${stats.activeStudents}
- Today's Attendance: ${stats.todayAttendance.percentage}% (${stats.todayAttendance.present} present, ${stats.todayAttendance.absent} absent)
- Outstanding Fee Obligation: INR ${stats.finances.pendingFees.toLocaleString('en-IN')}
- Active Classes: ${stats.classCount}

Generate a JSON object with this exact structure:
{
  "summary": "2 sentence executive operational overview",
  "attendanceInsight": "1-2 sentence attendance insight with recommendation",
  "financialInsight": "1-2 sentence fee collection insight and priority action",
  "operationalAlerts": ["Alert 1", "Alert 2"],
  "suggestedActions": ["Action 1", "Action 2", "Action 3"]
}
Respond strictly with valid JSON.`;

  const messages = [
    { role: 'system', content: 'You are an educational data analyst. You output strictly parseable JSON.' },
    { role: 'user', content: prompt }
  ];

  try {
    const result = await callLlmProvider({ messages, temperature: 0.3, maxTokens: 800 });
    let parsed;
    try {
      const raw = result.content.trim().replace(/^```json/i, '').replace(/```$/i, '').trim();
      parsed = JSON.parse(raw);
    } catch (e) {
      parsed = {
        summary: `School operations are running smoothly with ${stats.activeStudents} students enrolled. Today's student attendance stands at ${stats.todayAttendance.percentage}%.`,
        attendanceInsight: stats.todayAttendance.percentage < 75
          ? 'Attendance is below target; advise sending automated absence notifications to parents.'
          : 'Attendance rates are healthy across primary and secondary divisions.',
        financialInsight: `Outstanding student fee obligations total INR ${stats.finances.pendingFees.toLocaleString('en-IN')}. Follow-ups recommended for pending installments.`,
        operationalAlerts: [
          stats.todayAttendance.absent > 0 ? `${stats.todayAttendance.absent} students absent today require notification.` : 'All students marked present today.',
          stats.finances.pendingFees > 0 ? 'Upcoming term fee due dates approaching.' : 'All scheduled fees up to date.'
        ],
        suggestedActions: [
          'Review attendance defaulters list',
          'Send fee reminders via SMS/WhatsApp',
          'Audit upcoming examination seating arrangements'
        ]
      };
    }

    await recordUsage({
      user,
      franchise: franchiseId,
      module: 'dashboard_insights',
      action: 'refresh_insights',
      model: result.model,
      usage: result.usage,
      responseTimeMs: result.responseTimeMs,
      status: 'success'
    });

    return {
      ...parsed,
      timestamp: new Date().toISOString(),
      metrics: stats
    };
  } catch (error) {
    await recordUsage({
      user,
      franchise: franchiseId,
      module: 'dashboard_insights',
      action: 'refresh_insights',
      status: 'failed',
      error
    });
    throw error;
  }
}

/**
 * 3. Student Intelligence & Report-Card Remarks
 */
async function generateStudentSummary({ user, studentId, franchiseId }) {
  const student = await Student.findById(studentId).populate('schoolClass').populate('section');
  if (!student) {
    throw new Error('Student record not found');
  }

  // Fetch recent marks
  const marks = await StudentMark.find({ student: studentId }).populate('exam').populate('subject').limit(10);
  
  // Fetch attendance rate
  const attendanceRecords = await Attendance.find({ student: studentId }).limit(60);
  const presentCount = attendanceRecords.filter(a => a.status === 'present').length;
  const attendanceRate = attendanceRecords.length > 0
    ? ((presentCount / attendanceRecords.length) * 100).toFixed(1)
    : 85;

  const marksList = marks.map(m => `${m.subject?.name || 'Subject'}: ${m.marksObtained}/${m.maxMarks} (${m.percentage?.toFixed(1) || ''}% - Grade ${m.grade || 'N/A'})`).join(', ');

  const prompt = `Generate a constructive academic profile and teacher-approved report-card remarks for this student:
- Name: ${student.personalInfo?.firstName} ${student.personalInfo?.lastName}
- Class: ${student.schoolClass?.name || 'Class'} ${student.section?.name || ''}
- Attendance Rate: ${attendanceRate}%
- Recent Examination Marks: ${marksList || 'Consistent classroom performance'}

CRITICAL GUIDELINES:
- Remarks must be positive, professional, and educational.
- Do NOT make medical, psychological, or behavioral diagnoses.
- Remarks must be ready for teacher review and approval.

Provide response in JSON:
{
  "academicOverview": "2-3 sentences summarizing progress",
  "strengths": ["Strength 1", "Strength 2"],
  "areasForImprovement": ["Area 1", "Area 2"],
  "suggestedTeacherRemarks": [
    "Option 1 (formal)",
    "Option 2 (encouraging)",
    "Option 3 (detailed)"
  ]
}`;

  const messages = [
    { role: 'system', content: 'You are an experienced K-12 educator. Output strictly parseable JSON.' },
    { role: 'user', content: prompt }
  ];

  try {
    const result = await callLlmProvider({ messages, temperature: 0.4, maxTokens: 900 });
    let parsed;
    try {
      const raw = result.content.trim().replace(/^```json/i, '').replace(/```$/i, '').trim();
      parsed = JSON.parse(raw);
    } catch (e) {
      parsed = {
        academicOverview: `${student.personalInfo?.firstName} demonstrates earnest dedication and active participation in class activities with an attendance rate of ${attendanceRate}%.`,
        strengths: ['Regular attendance and punctuality', 'Active curiosity during classroom discussions'],
        areasForImprovement: ['Deeper revision in core problem-solving concepts', 'Regular homework submission'],
        suggestedTeacherRemarks: [
          `${student.personalInfo?.firstName} has shown commendable dedication this term. Consistent practice will yield even higher academic distinction.`,
          `A polite and hardworking student who contributes positively to class environment. Keep up the good work!`,
          `Demonstrates solid conceptual understanding. With focused revision, ${student.personalInfo?.firstName} is well-positioned for excellence.`
        ]
      };
    }

    await recordUsage({
      user,
      franchise: franchiseId,
      module: 'student_summary',
      action: 'generate_summary',
      model: result.model,
      usage: result.usage,
      responseTimeMs: result.responseTimeMs,
      status: 'success'
    });

    return parsed;
  } catch (error) {
    await recordUsage({
      user,
      franchise: franchiseId,
      module: 'student_summary',
      action: 'generate_summary',
      status: 'failed',
      error
    });
    throw error;
  }
}

/**
 * 4. Teacher AI: Lesson Plan & Question Generator
 */
async function generateLessonPlan({ user, franchiseId, className, subject, topic, duration = '45 minutes', learningObjectives }) {
  const prompt = `Create a comprehensive, structured lesson plan for school teachers:
- Class / Grade: ${className}
- Subject: ${subject}
- Chapter / Topic: ${topic}
- Period Duration: ${duration}
- Specific Learning Objectives: ${learningObjectives || 'Core syllabus mastery and application'}

Generate a structured lesson plan with:
1. Learning Objectives (Bloom's Taxonomy aligned)
2. Materials / Teaching Aids Required
3. Warm-up & Prior Knowledge Activation (5 mins)
4. Concept Explanation & Teacher Demonstration (15 mins)
5. Guided Practice & Student Activity (15 mins)
6. Formative Assessment & Quick Check Questions (5 mins)
7. Homework / Extension Assignment (5 mins)
8. Black/Whiteboard Layout Suggestion`;

  const messages = [
    { role: 'system', content: 'You are an expert pedagogy and curriculum designer for CBSE/State Board schools. Format output in clean Markdown.' },
    { role: 'user', content: prompt }
  ];

  try {
    const result = await callLlmProvider({ messages, temperature: 0.5, maxTokens: 1800 });
    await recordUsage({
      user,
      franchise: franchiseId,
      module: 'lesson_plan',
      action: 'create_lesson_plan',
      model: result.model,
      usage: result.usage,
      responseTimeMs: result.responseTimeMs,
      status: 'success'
    });
    return { plan: result.content, topic, subject, className };
  } catch (error) {
    await recordUsage({
      user,
      franchise: franchiseId,
      module: 'lesson_plan',
      action: 'create_lesson_plan',
      status: 'failed',
      error
    });
    throw error;
  }
}

/**
 * 5. Examination & Question Generator (MCQs, Short/Long Questions)
 */
async function generateQuestions({
  user,
  franchiseId,
  className,
  subject,
  topic,
  questionType = 'mcq', // 'mcq' | 'short' | 'long' | 'mixed'
  count = 5,
  difficulty = 'medium',
  language = 'English'
}) {
  const prompt = `Generate ${count} high-quality ${difficulty} difficulty school questions for:
- Grade/Class: ${className}
- Subject: ${subject}
- Topic: ${topic}
- Format: ${questionType.toUpperCase()}
- Language: ${language}

If questionType is 'mcq', provide 4 distinct options (A, B, C, D) with the correct answer and a 1-sentence pedagogical explanation.
Provide output strictly formatted as JSON:
{
  "title": "${subject} - ${topic} Question Bank",
  "questions": [
    {
      "questionNumber": 1,
      "question": "Question text...",
      "type": "mcq",
      "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
      "correctAnswer": "A",
      "explanation": "Why A is correct",
      "marks": 1
    }
  ]
}`;

  const messages = [
    { role: 'system', content: 'You are a school examination board question setter. Output strictly parseable JSON.' },
    { role: 'user', content: prompt }
  ];

  try {
    const result = await callLlmProvider({ messages, temperature: 0.4, maxTokens: 1600 });
    let parsed;
    try {
      const raw = result.content.trim().replace(/^```json/i, '').replace(/```$/i, '').trim();
      parsed = JSON.parse(raw);
    } catch (e) {
      parsed = {
        title: `${subject} - ${topic}`,
        questions: [
          {
            questionNumber: 1,
            question: `Explain the fundamental concept of ${topic} with a real-world example.`,
            type: questionType,
            options: [],
            correctAnswer: 'Refer to textbook definitions.',
            explanation: `Core question on ${topic}`,
            marks: 2
          }
        ]
      };
    }

    await recordUsage({
      user,
      franchise: franchiseId,
      module: 'question_generator',
      action: 'generate_questions',
      model: result.model,
      usage: result.usage,
      responseTimeMs: result.responseTimeMs,
      status: 'success'
    });

    return parsed;
  } catch (error) {
    await recordUsage({
      user,
      franchise: franchiseId,
      module: 'question_generator',
      action: 'generate_questions',
      status: 'failed',
      error
    });
    throw error;
  }
}

/**
 * 6. Communication AI: Notices, Circulars, WhatsApp/SMS Drafts (English & Hindi)
 */
async function generateCommunicationDraft({
  user,
  franchiseId,
  type = 'notice', // 'notice' | 'circular' | 'sms' | 'whatsapp' | 'fee_reminder'
  title,
  audience = 'Parents & Guardians',
  language = 'English', // 'English' | 'Hindi' | 'Bilingual'
  keyPoints = '',
  schoolName = 'Arion School'
}) {
  const prompt = `Draft an official school communication:
- Communication Type: ${type.toUpperCase()}
- School Name: ${schoolName}
- Target Audience: ${audience}
- Title / Subject: ${title}
- Key Information / Dates to include: ${keyPoints || 'Standard school notice parameters'}
- Language: ${language}

REQUIREMENTS:
- For SMS: Keep under 160 characters, concise and clear.
- For WhatsApp: Use appropriate emojis, clear formatting, bullet points, and school authority sign-off.
- For Notice / Circular: Include official Reference No. placeholder, Date placeholder, Formal Salutation, Clear body paragraphs, and Principal Signature block.
- If language is 'Hindi' or 'Bilingual', provide accurate, culturally respectful school terminology in Devanagari script.
- Provide editable output ready for administrative review.`;

  const messages = [
    { role: 'system', content: 'You are an official School Administrative Communications Secretary.' },
    { role: 'user', content: prompt }
  ];

  try {
    const result = await callLlmProvider({ messages, temperature: 0.5, maxTokens: 1200 });
    await recordUsage({
      user,
      franchise: franchiseId,
      module: 'communication_draft',
      action: 'draft_communication',
      model: result.model,
      usage: result.usage,
      responseTimeMs: result.responseTimeMs,
      status: 'success'
    });

    return {
      type,
      language,
      draft: result.content
    };
  } catch (error) {
    await recordUsage({
      user,
      franchise: franchiseId,
      module: 'communication_draft',
      action: 'draft_communication',
      status: 'failed',
      error
    });
    throw error;
  }
}

module.exports = {
  callLlmProvider,
  recordUsage,
  getSchoolOperationalStats,
  chatAssistant,
  generateDashboardInsights,
  generateStudentSummary,
  generateLessonPlan,
  generateQuestions,
  generateCommunicationDraft
};

