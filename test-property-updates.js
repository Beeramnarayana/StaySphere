const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
const TEST_IMAGE_PATH = path.join(__dirname, 'test-image.jpg'); // Replace with a real image path
const JWT_TOKEN = 'YOUR_JWT_TOKEN'; // Replace with a valid JWT token

// Create axios instance with auth header
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Test property ID - replace with an existing property ID that you own
const TEST_PROPERTY_ID = 'YOUR_PROPERTY_ID';

// Test 1: Upload Property Images
async function testImageUpload() {
  try {
    console.log('Testing image upload...');
    
    // Check if test image exists
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      console.error(`Test image not found at: ${TEST_IMAGE_PATH}`);
      return;
    }

    const formData = new FormData();
    formData.append('images', fs.createReadStream(TEST_IMAGE_PATH));

    const response = await api.post(
      `/properties/${TEST_PROPERTY_ID}/images`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Content-Type': 'multipart/form-data'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    console.log('Image upload successful!');
    console.log('Response:', response.data);
    return response.data.images[0]._id; // Return the first image ID for deletion test
  } catch (error) {
    console.error('Image upload failed:', error.response?.data || error.message);
  }
}

// Test 2: Update Property Location
async function testLocationUpdate() {
  try {
    console.log('\nTesting location update...');
    
    // Test coordinates (New Delhi, India)
    const testLocation = {
      type: 'Point',
      coordinates: [77.2090, 28.6139] // [longitude, latitude]
    };

    const response = await api.put(
      `/properties/${TEST_PROPERTY_ID}/location`,
      { location: testLocation }
    );

    console.log('Location update successful!');
    console.log('Updated property:', response.data);
  } catch (error) {
    console.error('Location update failed:', error.response?.data || error.message);
  }
}

// Test 3: Delete Property Image
async function testImageDeletion(imageId) {
  if (!imageId) {
    console.log('No image ID provided for deletion test');
    return;
  }

  try {
    console.log('\nTesting image deletion...');
    
    const response = await api.delete(
      `/properties/${TEST_PROPERTY_ID}/images/${imageId}`
    );

    console.log('Image deletion successful!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Image deletion failed:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  try {
    // Test 1: Upload image
    const imageId = await testImageUpload();
    
    // Test 2: Update location
    await testLocationUpdate();
    
    // Test 3: Delete image (if upload was successful)
    if (imageId) {
      await testImageDeletion(imageId);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Start tests
runTests();
