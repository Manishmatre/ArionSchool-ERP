const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const updateSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Your super admin information from the image
    const superAdminInfo = {
      email: 'manishmatre@gmail.com',
      mobile: '9561932345',
      name: 'Manish Matre',
      address: {
        street: 'At Post Shirapur Tq. Karad',
        city: 'Dist Satara',
        state: 'Maharashtra',
        pincode: '415539',
        country: 'India'
      }
    };

    // Remove all existing super admins
    console.log('Removing existing super admins...');
    await User.deleteMany({ role: 'super_admin' });

    // Create/update the single super admin
    console.log('Creating super admin...');
    const superAdmin = await User.findOneAndUpdate(
      { email: superAdminInfo.email },
      {
        ...superAdminInfo,
        role: 'super_admin',
        isActive: true,
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // Default password: password
      },
      { upsert: true, new: true }
    );

    console.log('Super admin updated successfully:', {
      email: superAdmin.email,
      mobile: superAdmin.mobile,
      name: superAdmin.name,
      address: superAdmin.address
    });

    // Verify only one super admin exists
    const superAdminCount = await User.countDocuments({ role: 'super_admin' });
    console.log(`Total super admins in system: ${superAdminCount}`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error updating super admin:', error);
    process.exit(1);
  }
};

updateSuperAdmin();
