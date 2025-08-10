const mongoose = require('mongoose');
const Property = require('./models/Property');

async function listProperties() {
  try {
    await mongoose.connect('mongodb://localhost:27017/house-rental', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const properties = await Property.find({}).limit(5).lean();
    console.log('First 5 Properties:');
    properties.forEach((prop, index) => {
      console.log(`\nProperty ${index + 1}:`);
      console.log(`ID: ${prop._id}`);
      console.log(`Title: ${prop.title || 'N/A'}`);
      console.log(`Address: ${prop.address ? JSON.stringify(prop.address) : 'N/A'}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

listProperties();
