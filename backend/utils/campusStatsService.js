const Student = require('../models/Student');
const StudentCertificate = require('../models/StudentCertificate');
const Certificate = require('../models/Certificate');
const FeeObligation = require('../models/FeeObligation');
const { getFranchiseFinancialSummary, normalizeFranchiseId } = require('./transactionService');

const OPEN_OBLIGATION_STATUSES = ['open', 'partial', 'overdue'];

/**
 * Unified campus metrics — used by campus details, dashboard, and reports.
 */
const getCampusStats = async (campusId) => {
  const campusObjectId = normalizeFranchiseId(campusId);
  if (!campusObjectId) {
    return null;
  }

  const studentIds = await Student.find({ franchise: campusObjectId }).distinct('_id');
  const userIds = await Student.find({ franchise: campusObjectId }).distinct('user');

  const [
    totalStudents,
    activeStudents,
    verifiedCertificates,
    studentCertificates,
    legacyCertificates,
    openFeeObligations,
    financialSummary,
  ] = await Promise.all([
    Student.countDocuments({ franchise: campusObjectId }),
    Student.countDocuments({ franchise: campusObjectId, status: 'active' }),
    StudentCertificate.countDocuments({ franchise: campusObjectId, isVerified: true }),
    StudentCertificate.countDocuments({ franchise: campusObjectId }),
    Certificate.countDocuments({ student: { $in: userIds } }),
    FeeObligation.countDocuments({
      franchise: campusObjectId,
      status: { $in: OPEN_OBLIGATION_STATUSES },
    }),
    getFranchiseFinancialSummary(campusObjectId),
  ]);

  const totalCertificates = studentCertificates + legacyCertificates;

  return {
    studentCount: totalStudents,
    activeStudents,
    certificateCount: totalCertificates,
    verifiedCertificates,
    openFeeObligations,
    financialSummary,
  };
};

module.exports = {
  getCampusStats,
  getFranchiseStats: getCampusStats
};
