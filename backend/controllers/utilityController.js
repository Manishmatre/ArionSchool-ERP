const Student = require('../models/Student');
const Payment = require('../models/Payment');

exports.recalculateFees = async (req, res, next) => {
  try {
    const students = await Student.find({});
    let updatedCount = 0;

    for (const student of students) {
      const payments = await Payment.find({ student: student._id, paymentStatus: 'completed' });
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

      student.fees.paidAmount = totalPaid;
      student.fees.pendingAmount = student.fees.totalFees - totalPaid;
      
      await student.save();
      updatedCount++;
    }

    res.status(200).json({
      success: true,
      message: `Successfully recalculated fees for ${updatedCount} students.`,
    });
  } catch (error) {
    next(error);
  }
};
