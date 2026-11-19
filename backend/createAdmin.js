// Script to create an admin user
// Run this with: node createAdmin.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Check if admin already exists
    const adminExists = await User.findOne({ email: 'admin@edutest.com' });
    
    if (adminExists) {
      console.log('Admin user already exists!');
      console.log('Email: admin@edutest.com');
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@edutest.com',
      mobile: '9999999999',
      password: 'admin123',
      role: 'admin'
    });

    console.log('✅ Admin user created successfully!');
    console.log('-----------------------------------');
    console.log('Email: admin@edutest.com');
    console.log('Password: admin123');
    console.log('-----------------------------------');
    console.log('You can now login with these credentials');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

createAdmin();
