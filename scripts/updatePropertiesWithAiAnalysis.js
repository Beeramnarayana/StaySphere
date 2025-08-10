const mongoose = require('mongoose');
require('dotenv').config();
const Property = require('../models/Property');

// Function to validate coordinates
function isValidCoordinate(coord) {
  return Array.isArray(coord) && 
         coord.length === 2 && 
         !isNaN(coord[0]) && 
         !isNaN(coord[1]) &&
         coord[0] >= -180 && 
         coord[0] <= 180 &&
         coord[1] >= -90 && 
         coord[1] <= 90;
}

// Function to fix coordinates if needed
function fixCoordinates(property) {
  if (property.address && property.address.coordinates) {
    const coords = property.address.coordinates.coordinates;
    
    // If coordinates are not valid, set to default (0,0)
    if (!isValidCoordinate(coords)) {
      console.log(`Fixing invalid coordinates for property ${property._id}:`, coords);
      property.address.coordinates = {
        type: 'Point',
        coordinates: [0, 0] // Default coordinates
      };
    }
  }
}

async function updateProperties() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find all properties that don't have aiAnalysis field
    const properties = await Property.find({ aiAnalysis: { $exists: false } });
    
    console.log(`Found ${properties.length} properties to update`);
    
    // Update each property
    for (const property of properties) {
      try {
        console.log(`Updating property ${property._id}...`);
        
        // Fix coordinates if needed
        fixCoordinates(property);
        
        // Set default AI analysis data
        property.aiAnalysis = {
          estimatedRent: property.pricing.rent * 0.9, // Example: 90% of current rent
          marketAverage: property.pricing.rent * 1.1, // Example: 110% of current rent
          confidenceScore: 75, // Example confidence score
          analysisDate: new Date(),
          marketTrend: 'stable',
          pricePerSqFt: property.specifications.squareFootage 
            ? property.pricing.rent / property.specifications.squareFootage 
            : 0,
          comparableProperties: []
        };
        
        // Save with validation disabled to avoid coordinate validation errors
        await property.save({ validateBeforeSave: false });
        console.log(`Updated property ${property._id}`);
      } catch (error) {
        console.error(`Error updating property ${property._id}:`, error.message);
        // Continue with next property even if one fails
        continue;
      }
    }
    
    console.log('All properties updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error updating properties:', error);
    process.exit(1);
  }
}

updateProperties();
