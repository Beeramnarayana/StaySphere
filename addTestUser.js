const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function addTestUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/house-rental', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@example.com' });
    if (existingUser) {
      console.log('Test user already exists:', existingUser);
      return existingUser;
    }

    // Create a new test user
    const hashedPassword = await bcrypt.hash('test1234', 12);
    
    const testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'landlord',
      profile: {
        phone: '+1234567890',
        bio: 'Test landlord account'
      },
      isVerified: true
    });

    await testUser.save();
    console.log('Test user created successfully:', testUser);
    return testUser;
    
  } catch (error) {
    console.error('Error adding test user:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

addTestUser();
