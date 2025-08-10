const mongoose = require('mongoose');
const Property = require('./models/Property');

async function listAllProperties() {
  try {
    await mongoose.connect('mongodb://localhost:27017/house-rental', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const properties = await Property.find({}).lean();
    console.log('All Properties in Database:');
    properties.forEach((prop, index) => {
      console.log(`\nProperty ${index + 1}:`);
      console.log(`ID: ${prop._id}`);
      console.log(`Title: ${prop.title || 'N/A'}`);
      console.log(`Address: ${prop.address ? JSON.stringify(prop.address) : 'N/A'}`);
      console.log(`Status: ${prop.status || 'N/A'}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

listAllProperties();
