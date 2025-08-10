// scripts/removeProperties.js
const mongoose = require('mongoose');
const Property = require('../models/Property');
require('dotenv').config();

async function removeAllProperties() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/house-rental', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Remove all properties
    const result = await Property.deleteMany({});
    console.log(`✅ Successfully removed ${result.deletedCount} properties`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error removing properties:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

removeAllProperties();