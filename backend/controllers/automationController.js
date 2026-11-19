const automationEngine = require('../services/automationEngine');

const getTenantFranchise = (req) => {
  if (['super_admin', 'school_owner'].includes(req.user.role) && req.query.franchise) {
    return req.query.franchise;
  }
  return req.user.franchise || req.body.franchise;
};

exports.runAbsenteeTrigger = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const result = await automationEngine.triggerDailyAbsenteeAlerts(franchiseId);
    res.status(200).json({ success: true, message: 'Absentee alert workflow executed', data: result });
  } catch (error) {
    next(error);
  }
};

exports.runFeeReminderTrigger = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const result = await automationEngine.triggerFeeDueReminders(franchiseId);
    res.status(200).json({ success: true, message: 'Fee reminder workflow executed', data: result });
  } catch (error) {
    next(error);
  }
};

exports.runBirthdayTrigger = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const result = await automationEngine.triggerBirthdayGreetings(franchiseId);
    res.status(200).json({ success: true, message: 'Birthday greeting workflow executed', data: result });
  } catch (error) {
    next(error);
  }
};
