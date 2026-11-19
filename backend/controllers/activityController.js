const LoginActivity = require('../models/LoginActivity');
const User = require('../models/User');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.getPlatformActivity = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(10, Number.parseInt(req.query.limit, 10) || 20));
    const clauses = [];

    if (['sign_in', 'action'].includes(req.query.eventType)) {
      clauses.push(req.query.eventType === 'sign_in'
        ? { $or: [{ eventType: 'sign_in' }, { eventType: { $exists: false } }] }
        : { eventType: req.query.eventType });
    }
    if (['student', 'franchise_admin', 'super_admin'].includes(req.query.role)) {
      clauses.push({ role: req.query.role });
    }

    const dateRange = {};
    if (req.query.startDate && !Number.isNaN(Date.parse(req.query.startDate))) {
      dateRange.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate && !Number.isNaN(Date.parse(req.query.endDate))) {
      const end = new Date(req.query.endDate);
      end.setHours(23, 59, 59, 999);
      dateRange.$lte = end;
    }
    if (Object.keys(dateRange).length) clauses.push({ occurredAt: dateRange });

    const search = String(req.query.search || '').trim().slice(0, 100);
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      const matchingUsers = await User.find({ $or: [{ name: regex }, { email: regex }] }).select('_id').lean();
      clauses.push({
        $or: [
          { action: regex },
          { resource: regex },
          { path: regex },
          { ipAddress: regex },
          { user: { $in: matchingUsers.map((user) => user._id) } },
        ],
      });
    }

    const query = clauses.length ? { $and: clauses } : {};
    const [activities, total] = await Promise.all([
      LoginActivity.find(query)
        .populate({ path: 'user', select: 'name email role franchise', populate: { path: 'franchise', select: 'name code' } })
        .populate('franchise', 'name code')
        .sort({ occurredAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      LoginActivity.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: activities,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Platform activity query failed:', error);
    res.status(500).json({ success: false, message: 'Could not load platform activity.' });
  }
};
