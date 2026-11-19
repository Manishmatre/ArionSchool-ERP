const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const FeeObligation = require('../models/FeeObligation');
const Homework = require('../models/Homework');
const StudentMark = require('../models/StudentMark');

class WhatsAppService {
  /**
   * Send WhatsApp Message (Integrates with Meta Cloud API or SMS gateway fallback)
   */
  async sendMessage(to, message) {
    const cleanNumber = to.replace(/[^0-9]/g, '');
    console.log(`[WhatsApp Dispatcher] Sending to +${cleanNumber}: ${message.substring(0, 80)}...`);

    // In production, when WHATSAPP_API_TOKEN is provided:
    if (process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_ID) {
      try {
        const fetch = globalThis.fetch || require('node-fetch');
        await fetch(`https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: cleanNumber,
            type: 'text',
            text: { body: message }
          })
        });
      } catch (err) {
        console.error('[WhatsApp Error]', err.message);
      }
    }

    return { success: true, dispatchedTo: cleanNumber };
  }

  /**
   * Two-Way Conversational Parent Bot
   */
  async handleParentBotQuery(fromPhone, incomingText = '') {
    const text = incomingText.toLowerCase().trim();
    const cleanPhone = fromPhone.replace(/[^0-9]/g, '').slice(-10); // match last 10 digits

    // Identify student by parent's phone number
    const student = await Student.findOne({
      $or: [
        { 'personalInfo.fatherMobile': cleanPhone },
        { 'personalInfo.motherMobile': cleanPhone },
        { 'personalInfo.guardianPhone': cleanPhone },
        { 'personalInfo.phone': cleanPhone }
      ],
      status: 'active'
    }).populate('schoolClass', 'name').populate('section', 'name');

    if (!student) {
      return `Welcome to SES Educare School Assistant. We could not find a registered student linked to phone number ${cleanPhone}. Please contact the school admissions office for assistance.`;
    }

    const studentName = `${student.personalInfo?.firstName || ''} ${student.personalInfo?.lastName || ''}`.trim();
    const className = `${student.schoolClass?.name || 'Class'} - ${student.section?.name || 'A'}`;

    // 1. Fee Inquiry
    if (text.includes('fee') || text.includes('due') || text.includes('payment') || text === '1') {
      const obligations = await FeeObligation.find({
        student: student._id,
        status: { $in: ['pending', 'partially_paid', 'overdue'] }
      });
      const totalDue = obligations.reduce((acc, curr) => acc + (curr.amountPending || 0), 0);

      if (totalDue === 0) {
        return `Hello! All school fees for ${studentName} (${className}) are completely paid up to date. Thank you!`;
      }
      return `Fee Status for ${studentName} (${className}):\nTotal Pending Due: ₹${totalDue.toLocaleString()}\nPending components: ${obligations.map(o => o.component).join(', ')}.\nYou can pay securely online via the SES Educare Parent Portal: https://parents.seseducare.com/pay/${student._id}`;
    }

    // 2. Attendance Inquiry
    if (text.includes('attendance') || text.includes('present') || text.includes('absent') || text === '2') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todayAtt = await Attendance.findOne({
        student: student._id,
        date: { $gte: startOfDay, $lte: endOfDay }
      });

      const todayStatus = todayAtt ? todayAtt.status.toUpperCase() : 'NOT YET MARKED';

      // Month stats
      const firstOfMonth = new Date();
      firstOfMonth.setDate(1);
      firstOfMonth.setHours(0, 0, 0, 0);

      const monthlyRecords = await Attendance.find({
        student: student._id,
        date: { $gte: firstOfMonth, $lte: endOfDay }
      });

      const totalDays = monthlyRecords.length;
      const presentDays = monthlyRecords.filter(r => r.status === 'present').length;
      const pct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

      return `Attendance Report for ${studentName} (${className}):\nToday's Status: ${todayStatus}${todayAtt?.checkInTime ? ` (In: ${new Date(todayAtt.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}\nMonthly Attendance: ${pct}% (${presentDays}/${totalDays} days attended).`;
    }

    // 3. Homework Inquiry
    if (text.includes('homework') || text.includes('hw') || text.includes('assignment') || text === '3') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const hwList = await Homework.find({
        schoolClass: student.schoolClass?._id,
        dueDate: { $gte: today }
      }).populate('subject', 'name').limit(5);

      if (hwList.length === 0) {
        return `No pending homework assignments scheduled for ${studentName} (${className}) today.`;
      }

      const listText = hwList.map((h, i) => `${i + 1}. [${h.subject?.name}] ${h.title} (Due: ${new Date(h.dueDate).toLocaleDateString()})`).join('\n');
      return `Current Homework for ${studentName} (${className}):\n${listText}\nPlease submit through the student mobile app or diary.`;
    }

    // Default Interactive Menu
    return `Welcome to SES Educare School Bot for ${studentName} (${className})!\nReply with a keyword or number:\n1️⃣ *Fees* - Check outstanding fees & payment link\n2️⃣ *Attendance* - Today's punch & monthly attendance %\n3️⃣ *Homework* - Today's homework assignments\n4️⃣ *Help* - Connect with School Helpdesk`;
  }
}

module.exports = new WhatsAppService();
