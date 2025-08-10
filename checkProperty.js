const mongoose = require('mongoose');
const Property = require('./models/Property');

async function checkProperty() {
  try {
    await mongoose.connect('mongodb://localhost:27017/house-rental', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const property = await Property.findById('6889797c7f0cb6ef08412f44');
    console.log('Property Data:', JSON.stringify(property, null, 2));
    
    if (property && property.address && property.address.coordinates) {
      console.log('\nCurrent Coordinates:', property.address.coordinates);
    } else {
      console.log('\nNo valid coordinates found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkProperty();
