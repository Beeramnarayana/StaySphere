const mongoose = require('mongoose');
const Property = require('./models/Property');
const User = require('./models/User');

async function addTestProperty() {
  try {
    await mongoose.connect('mongodb://localhost:27017/house-rental', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // First, check if we have a user to assign as landlord
    const user = await User.findOne();
    if (!user) {
      console.error('No users found in the database. Please create a user first.');
      return;
    }

    const testProperty = new Property({
      title: '2br',
      description: 'A lovely 2 bedroom apartment in the city center',
      landlord: user._id,
      propertyType: 'apartment',
      specifications: {
        bedrooms: 2,
        bathrooms: 1,
        squareFootage: 850,
        parking: 'street',
        furnished: false
      },
      pricing: {
        rent: 1200,
        deposit: 1200,
        utilitiesIncluded: ['water', 'trash'],
        leaseTerms: [6, 12, 24]
      },
      amenities: ['gym', 'laundry', 'elevator'],
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        zipCode: '10001',
        country: 'USA'
      },
      location: {
        type: 'Point',
        coordinates: [-73.9876, 40.7484] // Longitude, Latitude for New York
      },
      availability: 'available',
      status: 'active',
      images: [{
        url: 'https://example.com/image1.jpg',
        path: 'images/test/image1.jpg',
        isMain: true
      }]
    });

    await testProperty.save();
    console.log('Test property added successfully:', testProperty);
    
  } catch (error) {
    console.error('Error adding test property:', error);
  } finally {
    await mongoose.disconnect();
  }
}

addTestProperty();
