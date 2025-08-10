const express = require('express');
const OpenAI = require('openai');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Property = require('../models/Property');
const { calculateRentPrice, getMarketTrends } = require('../services/marketDataService');
const propertyGenerator = require('../services/propertyGenerator');

const router = express.Router();

// Track if we've hit the OpenAI quota
let openaiQuotaExceeded = false;
let lastQuotaError = null;

// Initialize OpenAI (will work with API key from environment)
let openai = null;

try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000 // 30 second timeout
    });
    console.log('OpenAI client initialized successfully');
  } else {
    console.log('No OpenAI API key found, using fallback responses');
  }
} catch (error) {
  console.error('Error initializing OpenAI client:', error);
  openai = null;
}

// AI Onboarding Chat
router.post('/onboarding-chat', auth, async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    
    // Check if we should use fallback responses
    if (!openai || openaiQuotaExceeded) {
      console.log('Using fallback response (OpenAI not available or quota exceeded)');
      return res.json({
        response: generateFallbackOnboardingResponse(message, conversationHistory),
        preferences: extractPreferencesFromText(message),
        fallback: true,
        fallbackReason: !openai ? 'not_configured' : 'quota_exceeded'
      });
    }

    const systemPrompt = `You are an AI assistant helping users find rental housing. Your goal is to understand their preferences through natural conversation. Ask about:
    - Budget range
    - Location preferences
    - Property type and size
    - Lifestyle needs (commute, amenities, neighborhood vibe)
    - Deal-breakers and must-haves
    - Pet requirements
    
    Keep responses conversational, helpful, and focused on gathering housing preferences. Extract structured data from their responses.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    let aiResponse;
    
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 300,
        temperature: 0.7
      });
      aiResponse = completion.choices[0].message.content;
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError.message);
      
      // Check if this is a quota exceeded error
      if (openaiError.status === 429 || 
          (openaiError.message && openaiError.message.includes('quota'))) {
        openaiQuotaExceeded = true;
        lastQuotaError = new Date();
        console.warn('OpenAI quota exceeded, using fallback responses');
      }
      
      // Use fallback response
      aiResponse = generateFallbackOnboardingResponse(message, conversationHistory);
    }

    // Extract preferences from conversation (simplified)
    const extractedPrefs = extractPreferencesFromText(message);
    
    if (Object.keys(extractedPrefs).length > 0) {
      const user = await User.findById(req.user.userId);
      user.preferences = { ...user.preferences, ...extractedPrefs };
      await user.save();
    }

    res.json({
      response: aiResponse,
      extractedPreferences: extractedPrefs
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ 
      message: 'AI service error',
      response: 'I\'m having trouble processing that right now. Could you tell me about your budget and location preferences?'
    });
  }
});

// Natural Language Search
router.post('/natural-search', auth, async (req, res) => {
  try {
    const { query } = req.body;
    
    // Parse natural language query into search filters
    const searchFilters = await parseNaturalLanguageQuery(query);
    
    // Build MongoDB query
    const mongoQuery = buildMongoQuery(searchFilters);
    
    // Search properties
    const properties = await Property.find(mongoQuery)
      .populate('landlord', 'name email profile.phone')
      .limit(20)
      .sort({ 'aiAnalysis.matchingScore': -1, createdAt: -1 });

    // Calculate personalized scores for each property
    const user = await User.findById(req.user.userId);
    const scoredProperties = properties.map(property => ({
      ...property.toObject(),
      personalizedScore: calculatePersonalizedScore(property, user.preferences)
    }));

    res.json({
      query: query,
      parsedFilters: searchFilters,
      properties: scoredProperties,
      total: scoredProperties.length
    });
  } catch (error) {
    console.error('Natural search error:', error);
    res.status(500).json({ message: 'Search service error' });
  }
});

// AI Cost Analysis
router.get('/cost-analysis/:propertyId', auth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.propertyId)
      .populate('landlord', 'name email profile.phone');
      
    if (!property) {
      return res.status(404).json({ 
        success: false,
        message: 'Property not found' 
      });
    }

    // Get user data if available
    let user = null;
    try {
      user = await User.findById(req.user.userId);
    } catch (userError) {
      console.warn('Could not fetch user data for cost analysis:', userError.message);
    }

    // Get market data for comparison
    const marketData = await getMarketData(property);
    
    // Calculate basic costs
    const rent = property.pricing?.rent || 0;
    const deposit = property.pricing?.deposit || Math.ceil(rent * 1.5);
    const utilities = property.pricing?.utilities?.estimated || 
                     (property.specifications?.squareFootage ? 
                      Math.ceil(property.specifications.squareFootage * 0.15) : 150);
    
    // Calculate commute cost if user has preferences
    let commuteCost = 0;
    if (user?.preferences?.commute) {
      try {
        commuteCost = calculateCommuteCost(property.address, user.preferences.commute);
      } catch (commuteError) {
        console.warn('Error calculating commute cost:', commuteError.message);
      }
    }

    // Calculate market comparison metrics
    const pricePerSqFt = property.specifications?.squareFootage 
      ? rent / property.specifications.squareFootage 
      : 0;
    
    const marketComparison = {
      averageRent: marketData.averageRent || Math.round(rent * 0.9 + Math.random() * rent * 0.2),
      averagePricePerSqFt: marketData.averagePricePerSqFt || (pricePerSqFt * 0.9),
      marketHealth: marketData.marketHealth || 'stable',
      lastUpdated: new Date().toISOString()
    };

    // Calculate affordability metrics
    const totalMonthlyCost = rent + utilities + commuteCost;
    const yearlyProjection = totalMonthlyCost * 12;
    
    // Generate analysis and recommendations
    const analysis = generateCostAnalysis({
      rent,
      deposit,
      utilities,
      commuteCost,
      propertyType: property.type,
      location: property.address?.city || 'the area',
      amenities: property.amenities || [],
      marketData: marketComparison
    });

    const response = {
      success: true,
      basicCosts: {
        rent,
        deposit,
        utilities,
        commuteCost,
        totalMonthlyCost,
        yearlyProjection
      },
      marketComparison,
      analysis,
      recommendations: generateRecommendations({
        rent,
        marketAverage: marketComparison.averageRent,
        amenities: property.amenities || [],
        property
      })
    };

    // Cache the analysis on the property if possible
    try {
      // Log property details for debugging
      const propertyId = property._id || 'unknown';
      const propertyTitle = property.title || 'Untitled Property';
      
      // Check if property has valid coordinates
      const hasCoords = property.address?.coordinates?.coordinates !== undefined;
      const coordsArray = Array.isArray(property.address?.coordinates?.coordinates);
      const hasValidLength = coordsArray && property.address.coordinates.coordinates.length === 2;
      const hasValidNumbers = hasValidLength && 
                            !isNaN(property.address.coordinates.coordinates[0]) && 
                            !isNaN(property.address.coordinates.coordinates[1]);
      const hasValidType = property.address?.coordinates?.type === 'Point';
      
      if (hasCoords && coordsArray && hasValidLength && hasValidNumbers && hasValidType) {
        // All validations passed, save the analysis
        property.aiAnalysis = property.aiAnalysis || {};
        property.aiAnalysis.costAnalysis = response;
        property.aiAnalysis.lastUpdated = new Date();
        
        try {
          await property.save();
          console.log(`Successfully saved cost analysis for property: ${propertyTitle} (${propertyId})`);
        } catch (saveError) {
          console.warn(`Error saving property ${propertyId}:`, saveError.message);
        }
      } else {
        // Log specific reason for skipping
        if (!hasCoords) {
          console.warn(`Skipping save for property "${propertyTitle}" (${propertyId}): Missing coordinates`);
        } else if (!coordsArray) {
          console.warn(`Skipping save for property "${propertyTitle}" (${propertyId}): Coordinates not an array`);
        } else if (!hasValidLength) {
          console.warn(`Skipping save for property "${propertyTitle}" (${propertyId}): Invalid coordinates length`);
        } else if (!hasValidNumbers) {
          console.warn(`Skipping save for property "${propertyTitle}" (${propertyId}): Invalid coordinate values`);
        } else if (!hasValidType) {
          console.warn(`Skipping save for property "${propertyTitle}" (${propertyId}): Invalid coordinates type`);
        }
        
        // Add a note to the response that coordinates are missing
        response.coordinatesStatus = 'missing_or_invalid';
        response.coordinatesHelp = 'This property is missing valid geographic coordinates. Update the property with valid coordinates to enable location-based features.';
      }
    } catch (error) {
      console.error('Error in cost analysis caching:', error.message);
      // Don't fail the request, just log the error
      response.saveError = 'Could not cache analysis results';
    }

    res.json(response);
  } catch (error) {
    console.error('Cost analysis error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error generating cost analysis',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to get market data (simplified - in a real app, this would use a market data service)
async function getMarketData(property) {
  // In a real app, this would fetch from a market data API
  return {
    averageRent: property.pricing?.rent ? 
      Math.round(property.pricing.rent * (0.9 + Math.random() * 0.2)) :
      null,
    averagePricePerSqFt: property.specifications?.squareFootage ?
      (property.pricing?.rent || 0) / property.specifications.squareFootage * (0.8 + Math.random() * 0.4) :
      null,
    marketHealth: ['growing', 'stable', 'declining'][Math.floor(Math.random() * 3)],
    lastUpdated: new Date().toISOString()
  };
}

// Generate cost analysis based on property data
function generateCostAnalysis(data) {
  const { rent, deposit, utilities, commuteCost, propertyType, location, amenities, marketData } = data;
  const totalMonthly = rent + utilities + commuteCost;
  
  // Basic analysis
  const analysis = {
    summary: '',
    affordability: {
      rating: 0, // 1-5
      description: ''
    },
    valueAssessment: {
      rating: 0, // 1-5
      description: ''
    },
    highlights: []
  };

  // Calculate affordability (simplified)
  const rentToIncomeRatio = 0.3; // Assuming 30% of income on rent
  const estimatedIncomeNeeded = Math.ceil((totalMonthly * 12) / 0.3);
  
  analysis.affordability.rating = Math.min(5, Math.max(1, 5 - Math.floor((totalMonthly - 1000) / 500)));
  analysis.affordability.description = `This property would require an estimated annual income of $${estimatedIncomeNeeded.toLocaleString()} to maintain a healthy budget.`;
  
  // Calculate value assessment
  const valueScore = rent / (marketData.averageRent || rent) * 5;
  analysis.valueAssessment.rating = Math.min(5, Math.max(1, valueScore));
  analysis.valueAssessment.description = valueScore > 4.5 ? 
    'Excellent value compared to similar properties in the area.' :
    valueScore > 3.5 ?
    'Good value for the price and location.' :
    valueScore > 2.5 ?
    'Average pricing for the area and features.' :
    'Higher than average pricing for this market segment.';
  
  // Generate highlights
  if (utilities < 100) analysis.highlights.push('Low utility costs');
  if (commuteCost < 50) analysis.highlights.push('Minimal commute expenses');
  if (amenities.includes('laundry')) analysis.highlights.push('In-unit laundry can save on external costs');
  if (amenities.includes('parking')) analysis.highlights.push('Parking included (potential savings)');
  
  // Generate summary
  analysis.summary = `This ${propertyType} in ${location} is priced at $${rent}/month. ` +
    `With utilities and estimated commute costs, your total monthly housing expenses would be approximately $${totalMonthly.toFixed(2)}. ` +
    `This represents ${(totalMonthly / estimatedIncomeNeeded * 12 * 100).toFixed(1)}% of the estimated required annual income.`;
  
  return analysis;
}

// Generate recommendations based on property data
function generateRecommendations(data) {
  const { rent, marketAverage, amenities, property } = data;
  const recommendations = [];
  
  // Price-related recommendations
  if (rent > marketAverage * 1.1) {
    recommendations.push({
      type: 'price',
      priority: 'high',
      message: 'This property is priced above the market average. Consider negotiating the rent or looking for similar properties in the area.',
      suggestion: 'You could save approximately $' + Math.round(rent - marketAverage) + '/month by finding a property closer to the market average.'
    });
  } else if (rent < marketAverage * 0.9) {
    recommendations.push({
      type: 'price',
      priority: 'low',
      message: 'This property is priced below the market average, which could indicate good value.',
      suggestion: 'Act quickly as properties at this price point tend to get rented fast.'
    });
  }
  
  // Amenity-based recommendations
  if (!amenities.includes('laundry') && !amenities.includes('in-unit laundry')) {
    recommendations.push({
      type: 'amenity',
      priority: 'medium',
      message: 'No in-unit laundry available.',
      suggestion: 'Factor in additional time and cost for laundry services (typically $20-40/month).'
    });
  }
  
  // Location-based recommendations
  if (property.address?.city?.toLowerCase().includes('downtown')) {
    recommendations.push({
      type: 'location',
      priority: 'low',
      message: 'Downtown location detected.',
      suggestion: 'Consider potential savings from reduced transportation costs if you work nearby.'
    });
  }
  
  return recommendations;
}

// Helper function for creating fallback descriptions
const createFallbackDescription = (data) => {
  try {
    const { propertyType, specifications, address, pricing, amenities } = data || {};
    
    let description = `Beautiful ${specifications?.bedrooms || 'multi'}-bedroom ${propertyType || 'property'}`;
    
    if (address?.city) {
      description += ` located in ${address.city}`;
      if (address.state) description += `, ${address.state}`;
    }
    
    description += '. ';
    
    if (specifications?.bathrooms) {
      description += `Features ${specifications.bathrooms} bathroom${specifications.bathrooms > 1 ? 's' : ''}`;
    }
    
    if (specifications?.squareFootage) {
      description += ` with ${specifications.squareFootage} square feet of living space`;
    }
    
    description += '. ';
    
    if (amenities && amenities.length > 0) {
      description += `Amenities include: ${amenities.slice(0, 5).join(', ')}`;
      if (amenities.length > 5) description += ' and more';
      description += '. ';
    }
    
    if (pricing?.rent) {
      description += `Available for $${pricing.rent.toLocaleString()}/month. `;
    }
    
    description += 'Contact us today to schedule a viewing!';
    
    return description;
  } catch (error) {
    console.error('Error creating fallback description:', error);
    return 'Beautiful rental property available. Contact us for more details!';
  }
};

// AI Property Description Generation (for landlords)
router.post('/generate-description', auth, async (req, res) => {
  try {
    const { propertyData } = req.body;
    
    // Validate input data
    if (!propertyData) {
      return res.status(400).json({ 
        error: 'Property data is required',
        description: createFallbackDescription({}),
        fallback: true,
        fallbackReason: 'missing_property_data'
      });
    }
    
    console.log('Generating description for property:', {
      type: propertyData.propertyType,
      city: propertyData.address?.city,
      rent: propertyData.pricing?.rent,
      bedrooms: propertyData.specifications?.bedrooms
    });
    
    // If OpenAI is not available, quota exceeded, or we're in fallback mode
    const shouldUseFallback = !openai || openaiQuotaExceeded || 
      (process.env.OPENAI_QUOTA_EXCEEDED && process.env.OPENAI_QUOTA_EXCEEDED === 'true');
      
    if (shouldUseFallback) {
      const fallbackReason = !openai ? 'not_configured' : 
        (openaiQuotaExceeded ? 'quota_exceeded' : 'quota_exceeded_env');
      
      console.log(`Using fallback description (${fallbackReason})`);
      const fallbackDesc = createFallbackDescription(propertyData);
      
      return res.json({ 
        message: 'AI service not available, using template',
        description: fallbackDesc,
        fallback: true,
        fallbackReason,
        source: 'fallback'
      });
    }

    try {
      // Generate description using OpenAI
      console.log('Sending request to OpenAI...');
      
      const prompt = `Generate an engaging rental property description for:
      - ${propertyData.specifications?.bedrooms || 'Multiple'} bedroom, ${propertyData.specifications?.bathrooms || 'Multiple'} bathroom ${propertyData.propertyType || 'property'}
      - Location: ${propertyData.address?.city || 'Great location'}, ${propertyData.address?.state || ''}
      - Rent: $${propertyData.pricing?.rent || 'Competitive pricing'}
      - Amenities: ${propertyData.amenities?.length ? propertyData.amenities.join(', ') : 'Various amenities available'}
      - Square footage: ${propertyData.specifications?.squareFootage || 'Spacious'} sq ft
      
      Make it compelling, highlight key features, and appeal to potential renters. Keep it under 300 words.`;
      
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('OpenAI request timeout')), 30000); // 30 second timeout
      });
      
      const openaiPromise = openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
        temperature: 0.8
      });
      
      const completion = await Promise.race([openaiPromise, timeoutPromise]);
      const generatedDescription = completion.choices[0].message.content;
      
      console.log('OpenAI response received, length:', generatedDescription.length);
      
      return res.json({
        description: generatedDescription,
        source: 'openai',
        fallback: false
      });
      
    } catch (error) {
      console.error('Description generation error:', error.message);
      
      // If we get a quota exceeded error, set the flag
      if (error.message.includes('quota') || error.message.includes('429') || error.status === 429) {
        openaiQuotaExceeded = true;
        process.env.OPENAI_QUOTA_EXCEEDED = 'true';
        console.log('OpenAI quota exceeded, falling back to template');
      }
      
      console.log('Error stack:', error.stack);
      
      // Fallback to template-based description
      const fallbackDescription = createFallbackDescription(propertyData);
      
      return res.json({
        description: fallbackDescription,
        source: 'fallback',
        fallback: true,
        fallbackReason: 'api_error',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Unexpected error in property description endpoint:', error);
    return res.status(500).json({
      description: createFallbackDescription({}),
      source: 'fallback',
      fallback: true,
      fallbackReason: 'unexpected_error',
      error: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper functions
function extractPreferencesFromText(text) {
  const prefs = {};
  const lowerText = text.toLowerCase();
  
  // Budget extraction
  const budgetMatch = lowerText.match(/\$?(\d{1,4}),?(\d{3})/);
  if (budgetMatch) {
    const amount = parseInt(budgetMatch[1] + (budgetMatch[2] || ''));
    if (amount > 500 && amount < 10000) {
      prefs.budget = { max: amount };
    }
  }
  
  // Bedroom extraction
  const bedroomMatch = lowerText.match(/(\d+)\s*bed/);
  if (bedroomMatch) {
    prefs.bedrooms = { min: parseInt(bedroomMatch[1]) };
  }
  
  // Pet policy
  if (lowerText.includes('pet') || lowerText.includes('dog') || lowerText.includes('cat')) {
    prefs.petPolicy = 'allowed';
  }
  
  return prefs;
}

async function parseNaturalLanguageQuery(query) {
  // Simplified NLP parsing - in production, use more sophisticated NLP
  const filters = {};
  const lowerQuery = query.toLowerCase();
  
  // Extract price
  const priceMatch = lowerQuery.match(/under \$?(\d+)/);
  if (priceMatch) {
    filters.maxRent = parseInt(priceMatch[1]);
  }
  
  // Extract bedrooms
  const bedroomMatch = lowerQuery.match(/(\d+)\s*bed/);
  if (bedroomMatch) {
    filters.bedrooms = parseInt(bedroomMatch[1]);
  }
  
  // Extract location
  const locationMatch = lowerQuery.match(/in ([a-zA-Z\s]+)/);
  if (locationMatch) {
    filters.city = locationMatch[1].trim();
  }
  
  return filters;
}

function buildMongoQuery(filters) {
  const query = { status: 'active' };
  
  if (filters.maxRent) {
    query['pricing.rent'] = { $lte: filters.maxRent };
  }
  
  if (filters.bedrooms) {
    query['specifications.bedrooms'] = filters.bedrooms;
  }
  
  if (filters.city) {
    query['address.city'] = new RegExp(filters.city, 'i');
  }
  
  return query;
}

function calculatePersonalizedScore(property, userPrefs) {
  let score = 0;
  
  // Budget match
  if (userPrefs.budget && userPrefs.budget.max) {
    if (property.pricing.rent <= userPrefs.budget.max) {
      score += 30;
    }
  }
  
  // Bedroom match
  if (userPrefs.bedrooms && userPrefs.bedrooms.min) {
    if (property.specifications.bedrooms >= userPrefs.bedrooms.min) {
      score += 25;
    }
  }
  
  // Amenity matches
  if (userPrefs.amenities && property.amenities) {
    const matches = userPrefs.amenities.filter(amenity => 
      property.amenities.includes(amenity)
    ).length;
    score += matches * 5;
  }
  
  return Math.min(score, 100);
}

function calculateCommuteCost(propertyAddress, commutePrefs) {
  if (!commutePrefs || !commutePrefs.workAddress) return 0;
  
  // Mock calculation - in production, use Google Maps API
  return 150; // Average monthly commute cost
}

// AI Pricing Analysis with Enhanced Market Data
router.post('/pricing-analysis', auth, async (req, res) => {
  try {
    console.log('Received pricing analysis request with body:', JSON.stringify(req.body, null, 2));
    
    // Handle both nested propertyData and direct property data
    const propertyData = req.body.propertyData || req.body;
    
    if (!propertyData) {
      return res.status(400).json({ 
        success: false, 
        message: 'No property data provided' 
      });
    }
    
    if (!propertyData) {
      console.error('No property data provided in request');
      return res.status(400).json({ success: false, message: 'Property data is required' });
    }
    
    console.log('Processing pricing analysis for property type:', propertyData.propertyType);
    
    // Calculate the base price using the market data service
    const priceAnalysis = calculateRentPrice({
      propertyType: propertyData.propertyType || 'apartment',
      bedrooms: propertyData.bedrooms || 1,
      bathrooms: propertyData.bathrooms || 1,
      squareFootage: propertyData.squareFootage || 1000,
      city: propertyData.city || '',
      state: propertyData.state || '',
      amenities: propertyData.amenities || []
    });
    
    console.log('Price analysis calculated:', priceAnalysis);

    // Get market trends for the location
    const marketTrends = getMarketTrends(
      propertyData.city, 
      propertyData.state
    );

    // Generate recommendations
    const recommendations = [
      'Consider including utilities in the rent to attract more tenants.',
      'Your price is competitive for this area based on current market trends.',
      'Highlight your property\'s unique features to justify the price.'
    ];

    // Calculate market position
    const marketPosition = getMarketPosition(
      priceAnalysis.totalPrice,
      marketTrends.averageRent[propertyData.propertyType] || priceAnalysis.totalPrice * 1.1
    );

    res.json({
      success: true,
      recommendedPrice: priceAnalysis.totalPrice,
      priceRange: {
        min: priceAnalysis.priceRange.min,
        max: priceAnalysis.priceRange.max
      },
      marketInsights: {
        averageRent: marketTrends.averageRent[propertyData.propertyType] || priceAnalysis.totalPrice * 1.1,
        averagePricePerSqFt: priceAnalysis.totalPrice / (propertyData.squareFootage || 1000),
        averageUtilities: 1500, // Default value, can be adjusted
        demand: marketTrends.demand,
        daysOnMarket: marketTrends.averageDaysOnMarket
      },
      marketPosition: marketPosition,
      recommendations: recommendations,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Pricing analysis error:', error);
    
    // Fallback response if there's an error
    const fallbackPrice = 15000; // Default fallback price
    res.status(500).json({
      success: false,
      message: 'Using fallback pricing data',
      recommendedPrice: fallbackPrice,
      priceRange: {
        min: fallbackPrice * 0.9,
        max: fallbackPrice * 1.1
      },
      marketInsights: {
        averageRent: fallbackPrice * 1.1,
        averagePricePerSqFt: fallbackPrice / 1000,
        averageUtilities: 1500,
        demand: 'Medium',
        daysOnMarket: 30
      },
      marketPosition: 'average',
      recommendations: [
        'Consider adjusting the price based on local market conditions.',
        'Highlight your property\'s unique features to stand out.'
      ],
      lastUpdated: new Date().toISOString()
    });
  }
});

// Generate comprehensive pricing analysis using market data service
function generatePricingAnalysis(data) {
  const { city, state, bedrooms, bathrooms, squareFootage, amenities, propertyType, neighborhood } = data;
  
  // Use market data service for intelligent pricing
  const pricingData = marketDataService.calculateRentPrice({
    city, state, bedrooms, bathrooms, squareFootage, amenities, propertyType, neighborhood
  });
  
  // Get market insights
  const marketInsights = marketDataService.getMarketInsights(city, state);
  
  // Calculate price range with confidence intervals
  const recommendedRent = pricingData.recommendedRent;
  const priceRange = {
    conservative: Math.round(recommendedRent * 0.92),
    recommended: recommendedRent,
    aggressive: Math.round(recommendedRent * 1.08)
  };
  
  // Generate detailed analysis
  const analysis = {
    recommendedRent,
    priceRange,
    marketData: pricingData.marketData,
    priceBreakdown: pricingData.priceBreakdown,
    marketInsights,
    competitiveAnalysis: {
      cityAverage: pricingData.marketData.cityAverage,
      percentageDifference: Math.round(((recommendedRent - pricingData.marketData.cityAverage) / pricingData.marketData.cityAverage) * 100),
      marketPosition: getMarketPosition(recommendedRent, pricingData.marketData.cityAverage)
    },
    pricingStrategy: generatePricingStrategy(pricingData, marketInsights),
    factors: [
      `Base market rate: $${pricingData.priceBreakdown.baseRent}`,
      pricingData.priceBreakdown.sizeAdjustment ? `Size adjustment: ${pricingData.priceBreakdown.sizeAdjustment > 0 ? '+' : ''}$${pricingData.priceBreakdown.sizeAdjustment}` : null,
      pricingData.priceBreakdown.amenityBonus ? `Amenity premium: +$${pricingData.priceBreakdown.amenityBonus}` : null,
      pricingData.priceBreakdown.marketAdjustment ? `Market trend: ${pricingData.priceBreakdown.marketAdjustment > 0 ? '+' : ''}$${pricingData.priceBreakdown.marketAdjustment}` : null,
      neighborhood ? `Neighborhood: ${neighborhood}` : null
    ].filter(Boolean),
    confidence: calculateConfidence(pricingData, marketInsights),
    recommendations: generatePricingRecommendations(pricingData, marketInsights),
    lastUpdated: new Date().toISOString()
  };
  
  return analysis;
}

// Get market position relative to average
function getMarketPosition(rent, average) {
  const ratio = rent / average;
  if (ratio > 1.15) return 'premium';
  if (ratio > 1.05) return 'above-average';
  if (ratio < 0.85) return 'budget';
  if (ratio < 0.95) return 'below-average';
  return 'market-rate';
}

// Generate pricing strategy recommendations
function generatePricingStrategy(pricingData, marketInsights) {
  const strategies = [];
  
  if (marketInsights.trends.demandLevel === 'high') {
    strategies.push('Consider aggressive pricing due to high demand');
  }
  
  if (marketInsights.trends.inventory === 'low') {
    strategies.push('Limited inventory supports premium pricing');
  }
  
  if (marketInsights.trends.priceDirection === 'rising') {
    strategies.push('Market trending upward - price at upper range');
  } else if (marketInsights.trends.priceDirection === 'falling') {
    strategies.push('Market softening - consider competitive pricing');
  }
  
  if (pricingData.marketData.demandScore > 8.5) {
    strategies.push('High demand score supports premium positioning');
  }
  
  return strategies.length > 0 ? strategies : ['Price competitively based on market conditions'];
}

// Calculate confidence level
function calculateConfidence(pricingData, marketInsights) {
  let confidence = 70; // Base confidence
  
  // Market data quality
  if (pricingData.marketData.demandScore > 7) confidence += 10;
  if (marketInsights.marketHealth > 60) confidence += 10;
  
  // Data completeness
  if (pricingData.priceBreakdown.sizeAdjustment) confidence += 5;
  if (pricingData.priceBreakdown.amenityBonus) confidence += 5;
  
  return Math.min(95, confidence);
}

// Generate specific pricing recommendations
function generatePricingRecommendations(pricingData, marketInsights) {
  const recommendations = [];
  
  // Base recommendation
  recommendations.push(`Start at $${pricingData.recommendedRent} based on current market conditions`);
  
  // Market-specific advice
  if (marketInsights.trends.competitiveness === 'very-competitive') {
    recommendations.push('Price competitively - market moves fast');
    recommendations.push('Consider offering move-in incentives');
  }
  
  // Seasonal advice
  const month = new Date().getMonth();
  if (month >= 4 && month <= 8) { // May-September
    recommendations.push('Peak rental season - demand is typically higher');
  } else if (month >= 10 || month <= 2) { // Nov-March
    recommendations.push('Off-peak season - consider flexible pricing');
  }
  
  // Inventory advice
  if (marketInsights.trends.inventory === 'low') {
    recommendations.push('Low inventory - you have pricing power');
  }
  
  return recommendations;
}

// Generate fallback onboarding responses when OpenAI is not available
function generateFallbackOnboardingResponse(message, conversationHistory = []) {
  const lowerMessage = message.toLowerCase();
  
  // Analyze conversation stage
  const conversationLength = conversationHistory.length;
  
  // Budget-related responses
  if (lowerMessage.includes('budget') || lowerMessage.includes('price') || lowerMessage.includes('rent') || lowerMessage.includes('$')) {
    return "Great! Budget is definitely important when house hunting. What's your ideal monthly rent range? This will help me find properties that fit your financial comfort zone.";
  }
  
  // Location-related responses
  if (lowerMessage.includes('location') || lowerMessage.includes('city') || lowerMessage.includes('area') || lowerMessage.includes('neighborhood')) {
    return "Location is key! Which city or neighborhood are you interested in? Are you looking for somewhere close to work, with good schools, nightlife, or perhaps a quiet residential area?";
  }
  
  // Property type responses
  if (lowerMessage.includes('apartment') || lowerMessage.includes('house') || lowerMessage.includes('condo') || lowerMessage.includes('bedroom')) {
    return "Perfect! What type of property are you looking for? Are you thinking apartment, house, condo, or townhouse? And how many bedrooms would be ideal for your needs?";
  }
  
  // Amenities responses
  if (lowerMessage.includes('amenities') || lowerMessage.includes('gym') || lowerMessage.includes('pool') || lowerMessage.includes('parking')) {
    return "Amenities can really make a difference in your daily life! Are there specific amenities that are must-haves for you? Things like parking, gym, pool, laundry, or pet-friendly policies?";
  }
  
  // Commute responses
  if (lowerMessage.includes('work') || lowerMessage.includes('commute') || lowerMessage.includes('job') || lowerMessage.includes('office')) {
    return "Your commute is super important for daily quality of life! Where do you work or need to commute to? Are you looking for walking distance, public transit access, or easy highway access?";
  }
  
  // Pet responses
  if (lowerMessage.includes('pet') || lowerMessage.includes('dog') || lowerMessage.includes('cat') || lowerMessage.includes('animal')) {
    return "I see you have furry family members! Finding pet-friendly housing is definitely important. What type of pets do you have, and do you need any specific accommodations like a yard or pet amenities?";
  }
  
  // Timeline responses
  if (lowerMessage.includes('when') || lowerMessage.includes('move') || lowerMessage.includes('time') || lowerMessage.includes('date')) {
    return "Timing is important for planning your move! When are you looking to move in? This helps me prioritize properties that will be available when you need them.";
  }
  
  // Initial greeting responses
  if (conversationLength === 0 || lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('start')) {
    return "Welcome! I'm here to help you find the perfect rental home. To get started, could you tell me a bit about what you're looking for? For example, your budget range, preferred location, or type of property?";
  }
  
  // General follow-up questions based on conversation length
  if (conversationLength < 3) {
    const questions = [
      "That's helpful! Could you also tell me about your budget range? This will help narrow down the best options for you.",
      "Great information! What about location - which areas or neighborhoods are you considering?",
      "Perfect! Are there any specific amenities or features that are important to you?"
    ];
    return questions[conversationLength % questions.length];
  }
  
  // Default responses for later in conversation
  const defaultResponses = [
    "Thanks for that information! Is there anything else that's particularly important to you in your housing search?",
    "That's really helpful! Based on what you've told me, I can help you find some great options. Any other preferences or requirements?",
    "Excellent! I'm getting a good picture of what you're looking for. Are there any deal-breakers or must-haves I should know about?",
    "Perfect! With all this information, I can help you find properties that match your needs. Ready to start looking at some options?"
  ];
  
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

module.exports = router;
