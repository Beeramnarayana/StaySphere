// services/propertyGenerator.js
const faker = require('faker');
const { getRandomInt, getRandomFloat, getRandomArrayElement } = require('../utils/randomUtils');

// Property types and their characteristics
const PROPERTY_TYPES = ['Apartment', 'House', 'Condo', 'Townhouse', 'Loft', 'Studio'];
const AMENITIES = ['Parking', 'Gym', 'Pool', 'Laundry', 'Air Conditioning', 'Heating', 'Furnished', 'Pet Friendly', 'Balcony', 'Garden'];
const CITIES = [
  { city: 'New York', state: 'NY' },
  { city: 'San Francisco', state: 'CA' },
  { city: 'Los Angeles', state: 'CA' },
  { city: 'Chicago', state: 'IL' },
  { city: 'Austin', state: 'TX' },
  { city: 'Seattle', state: 'WA' },
  { city: 'Miami', state: 'FL' },
  { city: 'Boston', state: 'MA' },
  { city: 'Denver', state: 'CO' },
  { city: 'Atlanta', state: 'GA' }
];

// Generate a single property
function generateProperty(location = null) {
  const propertyType = getRandomArrayElement(PROPERTY_TYPES);
  const cityData = location || getRandomArrayElement(CITIES);
  
  // Generate realistic property data
  const bedrooms = propertyType === 'Studio' ? 0 : getRandomInt(1, 5);
  const bathrooms = Math.max(1, bedrooms - getRandomInt(0, 2));
  const size = propertyType === 'Studio' ? getRandomInt(300, 600) :
               propertyType === 'Apartment' ? getRandomInt(600, 1500) :
               propertyType === 'Condo' ? getRandomInt(700, 2000) :
               propertyType === 'Townhouse' ? getRandomInt(1000, 2500) :
               getRandomInt(1500, 5000); // House

  // Generate realistic pricing based on location and size
  const basePrice = getBasePrice(cityData.city, propertyType, size);
  const rent = Math.round(basePrice * (0.9 + Math.random() * 0.2)); // ±10% variation

  // Generate amenities (2-6 random amenities)
  const numAmenities = getRandomInt(2, 6);
  const amenities = [];
  const availableAmenities = [...AMENITIES];
  for (let i = 0; i < numAmenities && availableAmenities.length > 0; i++) {
    const index = getRandomInt(0, availableAmenities.length - 1);
    amenities.push(availableAmenities.splice(index, 1)[0]);
  }

  // Generate images (placeholders)
  const images = Array(getRandomInt(3, 8)).fill().map((_, i) => 
    `https://source.unsplash.com/800x600/?${propertyType.toLowerCase()},${i}`
  );

  return {
    title: `${getRandomAdjective()} ${propertyType} in ${cityData.city}`,
    description: faker.lorem.paragraphs(getRandomInt(2, 4), '\n\n'),
    propertyType,
    address: {
      street: faker.address.streetAddress(),
      city: cityData.city,
      state: cityData.state,
      zipCode: faker.address.zipCode(),
      coordinates: {
        type: 'Point',
        coordinates: [
          parseFloat(faker.address.longitude(-124.848974, -66.885444)), // US longitudes
          parseFloat(faker.address.latitude(24.396308, 49.384358))     // US latitudes
        ]
      }
    },
    pricing: {
      rent,
      securityDeposit: Math.round(rent * (faker.datatype.boolean() ? 1 : 1.5)),
      utilitiesIncluded: faker.datatype.boolean(0.3), // 30% chance
      availableFrom: faker.date.between(
        new Date(),
        new Date(new Date().setMonth(new Date().getMonth() + 2))
      )
    },
    size,
    bedrooms,
    bathrooms,
    yearBuilt: new Date().getFullYear() - getRandomInt(0, 50),
    amenities,
    images,
    status: getRandomArrayElement(['available', 'available', 'available', 'pending']), // 75% available
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// Get base price based on city and property type
function getBasePrice(city, propertyType, size) {
  // Base price per square foot by city (monthly)
  const cityMultipliers = {
    'New York': 4.5,
    'San Francisco': 4.8,
    'Los Angeles': 4.2,
    'Chicago': 3.0,
    'Austin': 2.8,
    'Seattle': 3.5,
    'Miami': 3.3,
    'Boston': 4.0,
    'Denver': 3.2,
    'Atlanta': 2.5
  };

  // Property type adjustments
  const typeMultipliers = {
    'Studio': 1.1,
    'Apartment': 1.0,
    'Condo': 1.2,
    'Townhouse': 1.3,
    'House': 1.4,
    'Loft': 1.25
  };

  const basePricePerSqFt = (cityMultipliers[city] || 2.5) * (typeMultipliers[propertyType] || 1.0);
  return basePricePerSqFt * size;
}

// Generate multiple properties for a city
function generatePropertiesForCity(city, state, count = 10) {
  return Array(count).fill().map(() => generateProperty({ city, state }));
}

// Get a random adjective for property titles
function getRandomAdjective() {
  const adjectives = [
    'Beautiful', 'Spacious', 'Modern', 'Luxury', 'Cozy', 'Stylish', 'Elegant',
    'Charming', 'Sunny', 'Bright', 'Renovated', 'Quiet', 'Peaceful', 'Private',
    'Historic', 'Contemporary', 'Minimalist', 'Rustic', 'Trendy', 'Vintage'
  ];
  return adjectives[Math.floor(Math.random() * adjectives.length)];
}

module.exports = {
  generateProperty,
  generatePropertiesForCity,
  getBasePrice
};