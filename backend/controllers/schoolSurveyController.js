const SchoolSurvey = require('../models/SchoolSurvey');

const getTenantFranchise = (req) => {
  if (['super_admin', 'school_owner'].includes(req.user.role) && req.query.franchise) {
    return req.query.franchise;
  }
  return req.user.franchise || req.body.franchise;
};

exports.getSurveys = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = franchiseId ? { franchise: franchiseId } : {};

    if (req.query.status) query.status = req.query.status;
    if (req.query.targetAudience) query.targetAudience = req.query.targetAudience;

    const surveys = await SchoolSurvey.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: surveys.length, data: surveys });
  } catch (error) {
    next(error);
  }
};

exports.createSurvey = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const survey = await SchoolSurvey.create({
      ...req.body,
      franchise: franchiseId
    });
    res.status(201).json({ success: true, message: 'Survey published', data: survey });
  } catch (error) {
    next(error);
  }
};

exports.submitResponse = async (req, res, next) => {
  try {
    const { answers } = req.body;
    const survey = await SchoolSurvey.findById(req.params.id);
    if (!survey) return res.status(404).json({ success: false, message: 'Survey not found' });

    if (survey.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Survey is closed for submissions' });
    }

    survey.responses.push({
      submittedBy: req.user._id,
      userRole: req.user.role,
      answers,
      submittedAt: new Date()
    });
    await survey.save();

    res.status(200).json({ success: true, message: 'Survey response submitted successfully' });
  } catch (error) {
    next(error);
  }
};
