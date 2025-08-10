/**
 * Market Data Service
 * Handles property pricing analysis and market data calculations
 */

// Base prices per square foot by property type (in INR)
const BASE_PRICES = {
  apartment: 4000,    // INR per sqft
  house: 3500,       // INR per sqft
  villa: 5000,       // INR per sqft
  penthouse: 6000,   // INR per sqft
  studio: 4500,      // INR per sqft
  default: 4000      // Default price per sqft
};

// Location multipliers (city/state specific)
const LOCATION_MULTIPLIERS = {
  // Major cities
  'mumbai': 1.8,
  'delhi': 1.6,
  'bangalore': 1.7,
  'hyderabad': 1.4,
  'chennai': 1.3,
  'kolkata': 1.2,
  'pune': 1.3,
  'ahmedabad': 1.1,
  'vishakapatnam': 1.0,
  // States
  'maharashtra': 1.3,
  'delhi': 1.6,
  'karnataka': 1.2,
  'telangana': 1.1,
  'tamil nadu': 1.1,
  'west bengal': 1.0,
  'gujarat': 1.0,
  'andhra pradesh': 0.9,
  'default': 1.0
};

// Amenity values (in INR per month)
const AMENITY_VALUES = {
  parking: 1000,
  gym: 1500,
  pool: 2000,
  'air conditioning': 2000,
  'security': 1000,
  'power backup': 1000,
  'lift': 800,
  'water supply': 500,
  'maintenance': 1000,
  'playground': 500,
  'garden': 500,
  'clubhouse': 1000,
  'internet': 800,
  'housekeeping': 1000
};

// Bedroom multipliers
const BEDROOM_MULTIPLIERS = {
  1: 1.0,
  2: 1.3,
  3: 1.6,
  4: 1.9,
  5: 2.2,
  'default': 1.0
};

// Bathroom multipliers
const BATHROOM_MULTIPLIERS = {
  1: 1.0,
  2: 1.2,
  3: 1.4,
  4: 1.6,
  'default': 1.0
};

/**
 * Calculate the estimated rent price for a property
 * @param {Object} property - The property details
 * @returns {Object} - Contains basePrice, amenitiesValue, totalPrice, and priceRange
 */
const calculateRentPrice = (property) => {
  try {
    const {
      bedrooms = 1,
      bathrooms = 1,
      squareFootage = 0,
      city = '',
      state = '',
      amenities = []
    } = property;
    
    // Ensure property type is valid, default to 'apartment' if not
    const propertyType = (property.propertyType || 'apartment').toLowerCase();
    console.log(`Calculating rent for property type: ${propertyType}`);

    // Get base price based on property type
    const basePricePerSqFt = BASE_PRICES[propertyType] || BASE_PRICES.default;
    let basePrice = basePricePerSqFt * (squareFootage || 1000); // Default to 1000 sqft if not provided

    // Apply location multiplier
    const cityMultiplier = LOCATION_MULTIPLIERS[city.toLowerCase()] || 1.0;
    const stateMultiplier = LOCATION_MULTIPLIERS[state.toLowerCase()] || 1.0;
    const locationMultiplier = Math.max(cityMultiplier, stateMultiplier, 0.8); // Ensure minimum 0.8 multiplier
    
    basePrice *= locationMultiplier;

    // Apply bedroom and bathroom multipliers
    const bedroomMultiplier = BEDROOM_MULTIPLIERS[bedrooms] || BEDROOM_MULTIPLIERS.default;
    const bathroomMultiplier = BATHROOM_MULTIPLIERS[bathrooms] || BATHROOM_MULTIPLIERS.default;
    
    basePrice *= bedroomMultiplier * bathroomMultiplier;

    // Calculate amenities value
    let amenitiesValue = 0;
    if (Array.isArray(amenities)) {
      amenitiesValue = amenities.reduce((total, amenity) => {
        return total + (AMENITY_VALUES[amenity.toLowerCase()] || 0);
      }, 0);
    }

    // Calculate total price
    const totalPrice = basePrice + amenitiesValue;

    // Calculate price range (±15% of total price)
    const priceVariance = totalPrice * 0.15;
    const minPrice = Math.round(totalPrice - priceVariance);
    const maxPrice = Math.round(totalPrice + priceVariance);

    return {
      basePrice: Math.round(basePrice),
      amenitiesValue: Math.round(amenitiesValue),
      totalPrice: Math.round(totalPrice),
      priceRange: {
        min: minPrice,
        max: maxPrice,
        currency: 'INR',
        period: 'month'
      },
      locationMultiplier: parseFloat(locationMultiplier.toFixed(2)),
      bedroomMultiplier: parseFloat(bedroomMultiplier.toFixed(2)),
      bathroomMultiplier: parseFloat(bathroomMultiplier.toFixed(2))
    };
  } catch (error) {
    console.error('Error in calculateRentPrice:', error);
    throw new Error('Failed to calculate rent price');
  }
};

/**
 * Get market trends for a location
 * @param {string} city - The city name
 * @param {string} state - The state name
 * @returns {Object} - Market trends data
 */
const getMarketTrends = (city, state) => {
  // This is a simplified version - in a real app, this would fetch from a database or API
  const trends = {
    averageRent: {
      apartment: 35000,
      house: 45000,
      villa: 80000,
      studio: 25000
    },
    yoyGrowth: 7.5, // %
    demand: 'High', // High, Medium, Low
    averageDaysOnMarket: 30,
    lastUpdated: new Date().toISOString()
  };

  return trends;
};

module.exports = {
  calculateRentPrice,
  getMarketTrends
};
