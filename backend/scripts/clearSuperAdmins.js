const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const clearSuperAdmins = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all super admins
    const superAdmins = await User.find({ role: 'super_admin' });
    console.log(`Found ${superAdmins.length} super admin(s):`);
    
    superAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. Email: ${admin.email}, Mobile: ${admin.mobile}`);
    });

    // Delete all super admins
    const result = await User.deleteMany({ role: 'super_admin' });
    console.log(`\nDeleted ${result.deletedCount} super admin(s)`);

    // Verify no super admins remain
    const remainingCount = await User.countDocuments({ role: 'super_admin' });
    console.log(`Remaining super admins: ${remainingCount}`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing super admins:', error);
    process.exit(1);
  }
};

clearSuperAdmins();
