const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const FeeObligation = require('../models/FeeObligation');
const whatsappService = require('./whatsappService');

class AutomationEngine {
  /**
   * Scan today's attendance and dispatch WhatsApp/SMS alerts for absent students
   */
  async triggerDailyAbsenteeAlerts(franchiseId) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const query = {
      date: { $gte: startOfDay, $lte: endOfDay },
      status: 'absent'
    };
    if (franchiseId) query.franchise = franchiseId;

    const absentees = await Attendance.find(query)
      .populate('student', 'personalInfo schoolClass')
      .populate('schoolClass', 'name');

    let alertedCount = 0;
    for (const record of absentees) {
      const student = record.student;
      if (!student) continue;

      const parentPhone = student.personalInfo?.fatherMobile || student.personalInfo?.motherMobile || student.personalInfo?.phone;
      if (parentPhone) {
        const studentName = `${student.personalInfo?.firstName || ''} ${student.personalInfo?.lastName || ''}`.trim();
        const msg = `Dear Parent, this is an automated alert from Arion School School. Your ward ${studentName} (${record.schoolClass?.name || 'Class'}) has been marked ABSENT today (${new Date().toLocaleDateString()}). Please contact the school office if this was unexpected.`;
        await whatsappService.sendMessage(parentPhone, msg);
        alertedCount++;
      }
    }

    return {
      triggeredAt: new Date(),
      absentStudentsFound: absentees.length,
      alertsDispatched: alertedCount
    };
  }

  /**
   * Scan overdue fee obligations and dispatch payment reminders
   */
  async triggerFeeDueReminders(franchiseId) {
    const query = {
      status: { $in: ['pending', 'overdue'] },
      amountPending: { $gt: 0 }
    };
    if (franchiseId) query.franchise = franchiseId;

    const obligations = await FeeObligation.find(query)
      .populate('student', 'personalInfo')
      .limit(50); // Batch in chunks

    let remindersSent = 0;
    for (const ob of obligations) {
      const student = ob.student;
      if (!student) continue;

      const parentPhone = student.personalInfo?.fatherMobile || student.personalInfo?.phone;
      if (parentPhone) {
        const studentName = `${student.personalInfo?.firstName || ''} ${student.personalInfo?.lastName || ''}`.trim();
        const msg = `Fee Reminder - Arion School:\nDear Parent, kindly note that ${ob.component.toUpperCase()} fee of ₹${ob.amountPending} for ${studentName} is due. Please pay online to avoid late penalties: https://parents.seseducare.com/pay/${student._id}`;
        await whatsappService.sendMessage(parentPhone, msg);
        remindersSent++;
      }
    }

    return {
      triggeredAt: new Date(),
      remindersSent
    };
  }

  /**
   * Scan today's birthdays and dispatch celebratory messages
   */
  async triggerBirthdayGreetings(franchiseId) {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const query = { status: 'active' };
    if (franchiseId) query.franchise = franchiseId;

    const students = await Student.find(query).select('personalInfo');
    const birthdayKids = students.filter(s => {
      if (!s.personalInfo?.dateOfBirth) return false;
      const dob = new Date(s.personalInfo.dateOfBirth);
      return dob.getMonth() + 1 === month && dob.getDate() === day;
    });

    let sent = 0;
    for (const s of birthdayKids) {
      const phone = s.personalInfo?.phone || s.personalInfo?.fatherMobile;
      if (phone) {
        const name = `${s.personalInfo.firstName} ${s.personalInfo.lastName}`.trim();
        const msg = `🎂 Happy Birthday ${name}! 🎉 The management, teachers, and staff of Arion School wish you a fantastic year filled with learning, joy, and grand success!`;
        await whatsappService.sendMessage(phone, msg);
        sent++;
      }
    }

    return {
      triggeredAt: new Date(),
      birthdaysFound: birthdayKids.length,
      greetingsSent: sent
    };
  }
}

module.exports = new AutomationEngine();

