const SchoolEvent = require('../models/SchoolEvent');

const getTenantFranchise = (req) => {
  if (['super_admin', 'school_owner'].includes(req.user.role) && req.query.franchise) {
    return req.query.franchise;
  }
  return req.user.franchise || req.body.franchise;
};

exports.getEvents = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = franchiseId ? { franchise: franchiseId } : {};

    if (req.query.eventType) query.eventType = req.query.eventType;
    if (req.query.isHoliday === 'true') query.isHoliday = true;

    if (req.query.month && req.query.year) {
      const start = new Date(Number(req.query.year), Number(req.query.month) - 1, 1);
      const end = new Date(Number(req.query.year), Number(req.query.month), 0, 23, 59, 59);
      query.startDate = { $lte: end };
      query.endDate = { $gte: start };
    }

    const events = await SchoolEvent.find(query)
      .populate('schoolClasses', 'name code')
      .populate('createdBy', 'name email')
      .sort({ startDate: 1 });

    res.status(200).json({ success: true, count: events.length, data: events });
  } catch (error) {
    next(error);
  }
};

exports.createEvent = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const event = await SchoolEvent.create({
      ...req.body,
      franchise: franchiseId,
      createdBy: req.user._id
    });
    res.status(201).json({ success: true, message: 'Event added to school calendar', data: event });
  } catch (error) {
    next(error);
  }
};

exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await SchoolEvent.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.status(200).json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    next(error);
  }
};
