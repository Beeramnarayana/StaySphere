require('dotenv').config();
const mongoose = require('mongoose');
const createMessageIndexes = require('../models/indexes/message.indexes');

async function initializeDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000
    });

    console.log('Connected to MongoDB');

    // Create message collection if it doesn't exist
    const messageModel = mongoose.model('Message');
    try {
      await messageModel.createCollection();
      console.log('Message collection created');
    } catch (error) {
      if (error.codeName === 'NamespaceExists') {
        console.log('Message collection already exists');
      } else {
        throw error;
      }
    }

    // Create indexes
    console.log('Creating indexes...');
    await createMessageIndexes();
    
    console.log('Database initialization completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();
