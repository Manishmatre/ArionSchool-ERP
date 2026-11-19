const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendEmail } = require('../utils/emailService');

const SCHOOL_ADMIN_ROLES = ['school_owner', 'school_admin', 'principal', 'vice_principal', 'franchise_admin'];
const audienceForUser = (user) => user.role === 'student' ? 'students' : 'school_admins';

// @desc    Get all notifications
// @route   GET /api/notifications
// @access  Private (Super Admin / School Admin)
exports.getAllNotifications = async (req, res, next) => {
  try {
    let query = {};

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by type
    if (req.query.type) {
      query.type = req.query.type;
    }

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    const notifications = await Notification.find(query)
      .populate('createdBy', 'name email')
      .populate('specificUsers', 'name email role')
      .populate('specificFranchise', 'name code')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user notifications
// @route   GET /api/notifications/my
// @access  Private
exports.getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { recipients: 'all' },
        { recipients: { $in: [audienceForUser(req.user), ...(audienceForUser(req.user) === 'school_admins' ? ['franchise_admins'] : [])] } },
        { specificUsers: req.user._id },
        { specificFranchise: req.user.franchise }
      ],
      status: 'sent'
    })
      .populate('createdBy', 'name')
      .sort('-createdAt')
      .limit(50);

    // Mark which ones user has read
    const notificationsWithReadStatus = notifications.map(notification => {
      const isRead = notification.readBy.some(
        read => read.user.toString() === req.user._id.toString()
      );
      return {
        ...notification.toObject(),
        isRead
      };
    });

    res.status(200).json({
      success: true,
      count: notificationsWithReadStatus.length,
      data: notificationsWithReadStatus
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single notification
// @route   GET /api/notifications/:id
// @access  Private
exports.getNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('specificUsers', 'name email')
      .populate('specificFranchise', 'name code')
      .populate('readBy.user', 'name email');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create notification
// @route   POST /api/notifications
// @access  Private (Super Admin / School Admin)
exports.createNotification = async (req, res, next) => {
  try {
    const {
      title,
      message,
      type,
      category,
      recipients,
      specificUsers,
      specificFranchise,
      sendVia,
      link,
      priority,
      scheduledFor
    } = req.body;

    const notification = await Notification.create({
      title,
      message,
      type,
      category,
      recipients,
      specificUsers,
      specificFranchise,
      sendVia,
      link,
      priority,
      scheduledFor,
      createdBy: req.user._id,
      status: scheduledFor ? 'scheduled' : 'draft'
    });

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send notification
// @route   POST /api/notifications/:id/send
// @access  Private (Super Admin / School Admin)
exports.sendNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.status === 'sent') {
      return res.status(400).json({
        success: false,
        message: 'Notification already sent'
      });
    }

    // Get recipient users
    let users = [];
    
    if (notification.recipients === 'all') {
      users = await User.find({ isActive: true });
    } else if (notification.recipients === 'students') {
      users = await User.find({ role: 'student', isActive: true });
    } else if (notification.recipients === 'franchise_admins') {
      users = await User.find({ role: { $in: SCHOOL_ADMIN_ROLES }, isActive: true });
    } else if (notification.recipients === 'school_admins') {
      users = await User.find({ role: { $in: SCHOOL_ADMIN_ROLES }, isActive: true });
    } else if (notification.recipients === 'specific_users') {
      users = await User.find({ _id: { $in: notification.specificUsers } });
    } else if (notification.recipients === 'specific_franchise') {
      users = await User.find({ franchise: notification.specificFranchise, isActive: true });
    }

    // Send via email if enabled
    if (notification.sendVia.email) {
      const emailPromises = users.map(user => {
        return sendEmail({
          email: user.email,
          subject: notification.title,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">${notification.title}</h2>
              <p>${notification.message}</p>
              ${notification.link ? `
                <a href="${notification.link}" 
                   style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                  View Details
                </a>
              ` : ''}
              <p style="color: #666; font-size: 12px; margin-top: 20px;">
                This is an automated notification from SES Educare.
              </p>
            </div>
          `
        }).catch(err => console.error(`Failed to send email to ${user.email}:`, err));
      });

      await Promise.all(emailPromises);
    }

    // Update notification status
    notification.status = 'sent';
    notification.sentAt = new Date();
    await notification.save();

    res.status(200).json({
      success: true,
      message: `Notification sent to ${users.length} users`,
      data: {
        notification,
        recipientCount: users.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if already read
    const alreadyRead = notification.readBy.some(
      read => read.user.toString() === req.user._id.toString()
    );

    if (!alreadyRead) {
      notification.readBy.push({
        user: req.user._id,
        readAt: new Date()
      });
      await notification.save();
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { recipients: 'all' },
        { recipients: { $in: [audienceForUser(req.user), ...(audienceForUser(req.user) === 'school_admins' ? ['franchise_admins'] : [])] } },
        { specificUsers: req.user._id },
        { specificFranchise: req.user.franchise }
      ],
      status: 'sent'
    });

    const updatePromises = notifications.map(notification => {
      const alreadyRead = notification.readBy.some(
        read => read.user.toString() === req.user._id.toString()
      );

      if (!alreadyRead) {
        notification.readBy.push({
          user: req.user._id,
          readAt: new Date()
        });
        return notification.save();
      }
      return Promise.resolve();
    });

    await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private (Super Admin)
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread count
// @route   GET /api/notifications/unread/count
// @access  Private
exports.getUnreadCount = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { recipients: 'all' },
        { recipients: { $in: [audienceForUser(req.user), ...(audienceForUser(req.user) === 'school_admins' ? ['franchise_admins'] : [])] } },
        { specificUsers: req.user._id },
        { specificFranchise: req.user.franchise }
      ],
      status: 'sent'
    });

    const unreadCount = notifications.filter(notification => {
      return !notification.readBy.some(
        read => read.user.toString() === req.user._id.toString()
      );
    }).length;

    res.status(200).json({
      success: true,
      data: {
        unreadCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get notification statistics
// @route   GET /api/notifications/stats
// @access  Private (Super Admin / School Admin)
exports.getNotificationStats = async (req, res, next) => {
  try {
    const totalNotifications = await Notification.countDocuments();
    const sentNotifications = await Notification.countDocuments({ status: 'sent' });
    const scheduledNotifications = await Notification.countDocuments({ status: 'scheduled' });
    const draftNotifications = await Notification.countDocuments({ status: 'draft' });

    // Notifications by type
    const byType = await Notification.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    // Notifications by category
    const byCategory = await Notification.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalNotifications,
        sent: sentNotifications,
        scheduled: scheduledNotifications,
        draft: draftNotifications,
        byType,
        byCategory
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
