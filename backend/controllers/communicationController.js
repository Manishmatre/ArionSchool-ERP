const whatsappService = require('../services/whatsappService');
const PTMSlot = require('../models/PTMSlot');
const Student = require('../models/Student');

const getTenantFranchise = (req) => {
  if (['super_admin', 'school_owner'].includes(req.user.role) && req.query.franchise) {
    return req.query.franchise;
  }
  return req.user.franchise || req.body.franchise;
};

// ==========================================
// 1. WHATSAPP WEBHOOK & BOT
// ==========================================
exports.whatsappWebhookVerify = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === (process.env.WHATSAPP_VERIFY_TOKEN || 'ses_educare_bot_token')) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

exports.handleWhatsAppIncoming = async (req, res, next) => {
  try {
    const { from, message } = req.body;
    if (!from || !message) {
      return res.status(400).json({ success: false, message: 'from and message required' });
    }

    const reply = await whatsappService.handleParentBotQuery(from, message);
    await whatsappService.sendMessage(from, reply);

    res.status(200).json({
      success: true,
      reply
    });
  } catch (error) {
    next(error);
  }
};

exports.broadcastNotification = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const { schoolClass, targetAudience = 'parents', title, message } = req.body;

    const query = { status: 'active' };
    if (franchiseId) query.franchise = franchiseId;
    if (schoolClass) query.schoolClass = schoolClass;

    const students = await Student.find(query).select('personalInfo');
    let dispatchedCount = 0;

    for (const stud of students) {
      const parentPhone = stud.personalInfo?.fatherMobile || stud.personalInfo?.motherMobile || stud.personalInfo?.phone;
      if (parentPhone) {
        await whatsappService.sendMessage(parentPhone, `*[SES EDUCARE NOTICE]*\n${title}\n\n${message}`);
        dispatchedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Broadcast message sent to ${dispatchedCount} recipients`,
      dispatchedCount
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. PTM SCHEDULER
// ==========================================
exports.getPTMSlots = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = franchiseId ? { franchise: franchiseId } : {};

    if (req.query.schoolClass) query.schoolClass = req.query.schoolClass;
    if (req.query.teacher) query.teacher = req.query.teacher;
    if (req.query.status) query.status = req.query.status;

    const slots = await PTMSlot.find(query)
      .populate('teacher', 'personalInfo.firstName personalInfo.lastName staffId')
      .populate('schoolClass', 'name')
      .populate('section', 'name')
      .populate('bookedByStudent', 'personalInfo.firstName personalInfo.lastName studentId rollNumber')
      .sort({ date: 1, startTime: 1 });

    res.status(200).json({ success: true, count: slots.length, data: slots });
  } catch (error) {
    next(error);
  }
};

exports.createPTMSlot = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const slot = await PTMSlot.create({
      ...req.body,
      franchise: franchiseId
    });
    res.status(201).json({ success: true, message: 'PTM slot scheduled', data: slot });
  } catch (error) {
    next(error);
  }
};

exports.bookPTMSlot = async (req, res, next) => {
  try {
    const { studentId, parentNotes } = req.body;
    const slot = await PTMSlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ success: false, message: 'PTM slot not found' });

    if (slot.status !== 'available') {
      return res.status(400).json({ success: false, message: 'This PTM slot has already been booked' });
    }

    slot.status = 'booked';
    slot.bookedByStudent = studentId;
    if (parentNotes) slot.parentNotes = parentNotes;
    await slot.save();

    res.status(200).json({ success: true, message: 'PTM appointment confirmed', data: slot });
  } catch (error) {
    next(error);
  }
};
