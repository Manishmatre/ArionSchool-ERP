const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const fixSuperAdminLogin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find current super admin
    const currentSuperAdmin = await User.findOne({ role: 'super_admin' });
    console.log('Current super admin:', currentSuperAdmin ? {
      email: currentSuperAdmin.email,
      mobile: currentSuperAdmin.mobile,
      name: currentSuperAdmin.name
    } : 'No super admin found');

    if (currentSuperAdmin) {
      // Update with correct login information
      const updatedAdmin = await User.findByIdAndUpdate(
        currentSuperAdmin._id,
        {
          email: 'manishmatre@gmail.com',
          mobile: '9561932345',
          name: 'Manish Matre',
          address: {
            street: 'At Post Shirapur Tq. Karad',
            city: 'Dist Satara',
            state: 'Maharashtra',
            pincode: '415539',
            country: 'India'
          },
          // Keep existing password or set a known one
          password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // password: "password"
        },
        { new: true }
      );

      console.log('Super admin updated for login:', {
        email: updatedAdmin.email,
        mobile: updatedAdmin.mobile,
        name: updatedAdmin.name
      });

      console.log('\nLogin Credentials:');
      console.log('Email: manishmatre@gmail.com');
      console.log('Password: password');
      console.log('Mobile: 9561932345');
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing super admin:', error);
    process.exit(1);
  }
};

fixSuperAdminLogin();
