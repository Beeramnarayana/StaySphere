const express = require('express');
const Property = require('../models/Property');
const User = require('../models/User');
const auth = require('../middleware/auth');
const marketDataService = require('../services/marketDataService');

const router = express.Router();

// Natural language search endpoint
router.post('/natural-search', async (req, res) => {
  try {
    const { query, page = 1, limit = 12 } = req.body;
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Basic text search
    let properties = await Property.find(
      { 
        $text: { $search: query },
        status: 'active' 
      },
      { score: { $meta: 'textScore' } }
    )
    .sort({ score: { $meta: 'textScore' } })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

    const total = await Property.countDocuments({ 
      $text: { $search: query },
      status: 'active' 
    });

    // Add pricing analysis for properties without prices
    properties = await Promise.all(properties.map(async (property) => {
      if (!property.pricing?.rent) {
        try {
          const priceAnalysis = marketDataService.calculateRentPrice({
            propertyType: property.propertyType,
            bedrooms: property.specifications?.bedrooms || 1,
            bathrooms: property.specifications?.bathrooms || 1,
            squareFootage: property.specifications?.area || 1000,
            city: property.location?.city || '',
            state: property.location?.state || '',
            amenities: property.amenities || []
          });

          return {
            ...property,
            pricing: {
              ...property.pricing,
              rent: priceAnalysis.totalPrice,
              estimated: true,
              priceAnalysis
            }
          };
        } catch (error) {
          console.error(`Error calculating price for property ${property._id}:`, error);
          return property; // Return original property if price calculation fails
        }
      }
      return property;
    }));

    res.json({
      success: true,
      properties,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    });

  } catch (error) {
    console.error('Natural search error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error performing search',
      error: error.message 
    });
  }
});

// Advanced search with AI personalization
router.post('/advanced', auth, async (req, res) => {
  try {
    const {
      query,
      filters,
      location,
      radius = 10,
      page = 1,
      limit = 12
    } = req.body;

    const user = await User.findById(req.user.userId);
    
    // Build MongoDB aggregation pipeline
    const pipeline = [];
    
    // Match stage
    const matchStage = { status: 'active' };
    
    if (filters.minRent || filters.maxRent) {
      matchStage['pricing.rent'] = {};
      if (filters.minRent) matchStage['pricing.rent'].$gte = filters.minRent;
      if (filters.maxRent) matchStage['pricing.rent'].$lte = filters.maxRent;
    }
    
    if (filters.bedrooms) {
      matchStage['specifications.bedrooms'] = filters.bedrooms;
    }
    
    if (filters.bathrooms) {
      matchStage['specifications.bathrooms'] = { $gte: filters.bathrooms };
    }
    
    if (filters.propertyType && filters.propertyType.length > 0) {
      matchStage.propertyType = { $in: filters.propertyType };
    }
    
    if (filters.amenities && filters.amenities.length > 0) {
      matchStage.amenities = { $in: filters.amenities };
    }
    
    // Text search
    if (query) {
      matchStage.$text = { $search: query };
    }
    
    // Geospatial search
    if (location && location.coordinates) {
      matchStage['address.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [location.coordinates.lng, location.coordinates.lat]
          },
          $maxDistance: radius * 1609.34 // Convert miles to meters
        }
      };
    }
    
    pipeline.push({ $match: matchStage });
    
    // Add personalization score
    pipeline.push({
      $addFields: {
        personalizedScore: {
          $add: [
            // Budget score
            {
              $cond: {
                if: { $and: [
                  { $ne: [user.preferences?.budget?.max, null] },
                  { $lte: ['$pricing.rent', user.preferences.budget.max] }
                ]},
                then: 30,
                else: 0
              }
            },
            // Bedroom score
            {
              $cond: {
                if: { $and: [
                  { $ne: [user.preferences?.bedrooms?.min, null] },
                  { $gte: ['$specifications.bedrooms', user.preferences.bedrooms.min] }
                ]},
                then: 25,
                else: 0
              }
            },
            // Text search score
            { $ifNull: [{ $meta: 'textScore' }, 0] }
          ]
        }
      }
    });
    
    // Sort by personalized score and relevance
    pipeline.push({
      $sort: {
        personalizedScore: -1,
        'analytics.views': -1,
        createdAt: -1
      }
    });
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit) });
    
    // Populate landlord
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'landlord',
        foreignField: '_id',
        as: 'landlord',
        pipeline: [
          { $project: { name: 1, email: 1, 'profile.phone': 1, 'profile.verified': 1 } }
        ]
      }
    });
    
    pipeline.push({
      $unwind: '$landlord'
    });
    
    const properties = await Property.aggregate(pipeline);
    
    // Get total count for pagination
    const countPipeline = pipeline.slice(0, -3); // Remove skip, limit, and lookup stages
    countPipeline.push({ $count: 'total' });
    const totalResult = await Property.aggregate(countPipeline);
    const total = totalResult[0]?.total || 0;
    
    // Update user search history
    user.searchHistory.push({
      query: query || '',
      filters,
      timestamp: new Date()
    });
    
    // Keep only last 50 searches
    if (user.searchHistory.length > 50) {
      user.searchHistory = user.searchHistory.slice(-50);
    }
    
    await user.save();
    
    res.json({
      properties,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      },
      searchMetadata: {
        query,
        filters,
        resultsCount: properties.length
      }
    });
  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({ message: 'Search service error' });
  }
});

// Get search suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }
    
    // Get city suggestions
    const cityAggregation = await Property.aggregate([
      {
        $match: {
          'address.city': { $regex: q, $options: 'i' },
          status: 'active'
        }
      },
      {
        $group: {
          _id: {
            city: '$address.city',
            state: '$address.state'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      },
      {
        $project: {
          _id: 0,
          suggestion: {
            $concat: ['$_id.city', ', ', '$_id.state']
          },
          type: 'location',
          count: 1
        }
      }
    ]);
    
    // Get amenity suggestions
    const amenityAggregation = await Property.aggregate([
      {
        $match: {
          amenities: { $regex: q, $options: 'i' },
          status: 'active'
        }
      },
      {
        $unwind: '$amenities'
      },
      {
        $match: {
          amenities: { $regex: q, $options: 'i' }
        }
      },
      {
        $group: {
          _id: '$amenities',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 3
      },
      {
        $project: {
          _id: 0,
          suggestion: '$_id',
          type: 'amenity',
          count: 1
        }
      }
    ]);
    
    const suggestions = [...cityAggregation, ...amenityAggregation];
    
    res.json({ suggestions });
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({ message: 'Suggestions service error' });
  }
});

// Get popular searches
router.get('/popular', async (req, res) => {
  try {
    const popularSearches = await User.aggregate([
      { $unwind: '$searchHistory' },
      {
        $match: {
          'searchHistory.timestamp': {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          },
          'searchHistory.query': { $ne: '' }
        }
      },
      {
        $group: {
          _id: '$searchHistory.query',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          query: '$_id',
          count: 1
        }
      }
    ]);
    
    res.json({ popularSearches });
  } catch (error) {
    console.error('Popular searches error:', error);
    res.status(500).json({ message: 'Popular searches service error' });
  }
});

// Market Analysis for a specific location
router.get('/market-analysis', async (req, res) => {
  try {
    const { city, state, bedrooms, propertyType } = req.query;
    
    if (!city || !state) {
      return res.status(400).json({ message: 'City and state are required' });
    }
    
    // Get market insights
    const marketInsights = marketDataService.getMarketInsights(city, state);
    
    // Get comparable properties from database
    const comparables = await getComparableProperties(city, state, bedrooms, propertyType);
    
    // Get market data
    const marketData = marketDataService.getMarketData(city, state);
    
    // Calculate market statistics
    const marketStats = await calculateMarketStats(city, state, bedrooms, propertyType);
    
    res.json({
      location: { city, state },
      marketInsights,
      marketData: {
        averageRents: marketData.avgRent,
        pricePerSqFt: marketData.pricePerSqFt,
        marketTrend: marketData.marketTrend,
        demandScore: marketData.demandScore,
        inventory: marketData.inventory
      },
      comparables,
      marketStats,
      recommendations: generateMarketRecommendations(marketInsights, marketStats)
    });
    
  } catch (error) {
    console.error('Market analysis error:', error);
    res.status(500).json({ message: 'Market analysis service error' });
  }
});

// Get comparable properties for pricing analysis
router.get('/comparables', async (req, res) => {
  try {
    const { city, state, bedrooms, bathrooms, propertyType, minRent, maxRent } = req.query;
    
    if (!city || !state) {
      return res.status(400).json({ message: 'City and state are required' });
    }
    
    // Build query for comparable properties
    const query = {
      'address.city': new RegExp(city, 'i'),
      'address.state': new RegExp(state, 'i'),
      status: 'active'
    };
    
    if (bedrooms) {
      query['specifications.bedrooms'] = parseInt(bedrooms);
    }
    
    if (bathrooms) {
      query['specifications.bathrooms'] = { $gte: parseFloat(bathrooms) - 0.5, $lte: parseFloat(bathrooms) + 0.5 };
    }
    
    if (propertyType) {
      query.propertyType = propertyType;
    }
    
    if (minRent || maxRent) {
      query['pricing.rent'] = {};
      if (minRent) query['pricing.rent'].$gte = parseInt(minRent);
      if (maxRent) query['pricing.rent'].$lte = parseInt(maxRent);
    }
    
    // Get comparable properties
    const comparables = await Property.find(query)
      .select('title address pricing specifications amenities propertyType createdAt')
      .sort({ 'pricing.rent': 1 })
      .limit(20);
    
    // Calculate statistics
    const stats = calculateComparableStats(comparables);
    
    res.json({
      comparables,
      statistics: stats,
      count: comparables.length
    });
    
  } catch (error) {
    console.error('Comparables error:', error);
    res.status(500).json({ message: 'Comparables service error' });
  }
});

// Enhanced property recommendations based on user preferences and market data
router.post('/smart-recommendations', auth, async (req, res) => {
  try {
    const { preferences, location, budget } = req.body;
    const user = await User.findById(req.user.userId);
    
    // Build smart query based on preferences and market data
    const query = { status: 'active' };
    
    if (location.city && location.state) {
      query['address.city'] = new RegExp(location.city, 'i');
      query['address.state'] = new RegExp(location.state, 'i');
    }
    
    if (budget.min || budget.max) {
      query['pricing.rent'] = {};
      if (budget.min) query['pricing.rent'].$gte = budget.min;
      if (budget.max) query['pricing.rent'].$lte = budget.max;
    }
    
    if (preferences.bedrooms) {
      query['specifications.bedrooms'] = { $in: preferences.bedrooms };
    }
    
    if (preferences.propertyTypes && preferences.propertyTypes.length > 0) {
      query.propertyType = { $in: preferences.propertyTypes };
    }
    
    if (preferences.amenities && preferences.amenities.length > 0) {
      query.amenities = { $in: preferences.amenities };
    }
    
    // Get properties
    let properties = await Property.find(query)
      .populate('landlord', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(50);
    
    // Apply AI scoring based on preferences and market data
    properties = properties.map(property => {
      const marketData = marketDataService.getMarketData(property.address.city, property.address.state);
      const score = calculateSmartScore(property, preferences, marketData, user.preferences);
      
      return {
        ...property.toObject(),
        smartScore: score,
        marketInsights: {
          marketTrend: marketData.marketTrend,
          demandScore: marketData.demandScore,
          pricePosition: getRelativePricing(property.pricing.rent, marketData, property.specifications.bedrooms)
        }
      };
    });
    
    // Sort by smart score
    properties.sort((a, b) => b.smartScore - a.smartScore);
    
    res.json({
      recommendations: properties.slice(0, 20),
      totalFound: properties.length,
      searchCriteria: { preferences, location, budget }
    });
    
  } catch (error) {
    console.error('Smart recommendations error:', error);
    res.status(500).json({ message: 'Smart recommendations service error' });
  }
});

// Helper functions
async function getComparableProperties(city, state, bedrooms, propertyType) {
  const query = {
    'address.city': new RegExp(city, 'i'),
    'address.state': new RegExp(state, 'i'),
    status: 'active'
  };
  
  if (bedrooms) {
    query['specifications.bedrooms'] = parseInt(bedrooms);
  }
  
  if (propertyType) {
    query.propertyType = propertyType;
  }
  
  const properties = await Property.find(query)
    .select('address pricing specifications amenities propertyType')
    .sort({ 'pricing.rent': 1 })
    .limit(10);
  
  return properties;
}

async function calculateMarketStats(city, state, bedrooms, propertyType) {
  const query = {
    'address.city': new RegExp(city, 'i'),
    'address.state': new RegExp(state, 'i'),
    status: 'active'
  };
  
  if (bedrooms) {
    query['specifications.bedrooms'] = parseInt(bedrooms);
  }
  
  if (propertyType) {
    query.propertyType = propertyType;
  }
  
  const properties = await Property.find(query).select('pricing specifications');
  
  if (properties.length === 0) {
    return {
      averageRent: 0,
      medianRent: 0,
      minRent: 0,
      maxRent: 0,
      totalProperties: 0
    };
  }
  
  const rents = properties.map(p => p.pricing.rent).sort((a, b) => a - b);
  
  return {
    averageRent: Math.round(rents.reduce((sum, rent) => sum + rent, 0) / rents.length),
    medianRent: rents[Math.floor(rents.length / 2)],
    minRent: rents[0],
    maxRent: rents[rents.length - 1],
    totalProperties: properties.length,
    priceRange: {
      q1: rents[Math.floor(rents.length * 0.25)],
      q3: rents[Math.floor(rents.length * 0.75)]
    }
  };
}

function calculateComparableStats(comparables) {
  if (comparables.length === 0) {
    return {
      averageRent: 0,
      medianRent: 0,
      priceRange: { min: 0, max: 0 },
      averageSize: 0
    };
  }
  
  const rents = comparables.map(p => p.pricing.rent).sort((a, b) => a - b);
  const sizes = comparables.map(p => p.specifications.squareFootage).filter(s => s > 0);
  
  return {
    averageRent: Math.round(rents.reduce((sum, rent) => sum + rent, 0) / rents.length),
    medianRent: rents[Math.floor(rents.length / 2)],
    priceRange: {
      min: rents[0],
      max: rents[rents.length - 1]
    },
    averageSize: sizes.length > 0 ? Math.round(sizes.reduce((sum, size) => sum + size, 0) / sizes.length) : 0,
    pricePerSqFt: sizes.length > 0 ? (rents.reduce((sum, rent) => sum + rent, 0) / rents.length) / (sizes.reduce((sum, size) => sum + size, 0) / sizes.length) : 0
  };
}

function generateMarketRecommendations(marketInsights, marketStats) {
  const recommendations = [];
  
  if (marketInsights.trends.priceDirection === 'rising') {
    recommendations.push('Market prices are trending upward - consider acting quickly on good deals');
  }
  
  if (marketInsights.trends.inventory === 'low') {
    recommendations.push('Limited inventory - be prepared to make quick decisions');
  }
  
  if (marketInsights.trends.demandLevel === 'high') {
    recommendations.push('High demand market - consider expanding search criteria');
  }
  
  if (marketStats.totalProperties < 10) {
    recommendations.push('Limited data available - consider expanding location search');
  }
  
  return recommendations;
}

function calculateSmartScore(property, preferences, marketData, userPreferences) {
  let score = 50; // Base score
  
  // Price scoring (30% weight)
  if (preferences.budget) {
    const budgetMid = (preferences.budget.min + preferences.budget.max) / 2;
    const priceDiff = Math.abs(property.pricing.rent - budgetMid) / budgetMid;
    score += (1 - priceDiff) * 30;
  }
  
  // Amenity matching (25% weight)
  if (preferences.amenities && preferences.amenities.length > 0) {
    const matchedAmenities = property.amenities.filter(a => preferences.amenities.includes(a));
    const amenityScore = (matchedAmenities.length / preferences.amenities.length) * 25;
    score += amenityScore;
  }
  
  // Market position (20% weight)
  const marketPosition = getRelativePricing(property.pricing.rent, marketData, property.specifications.bedrooms);
  if (marketPosition === 'good-value') score += 20;
  else if (marketPosition === 'market-rate') score += 15;
  else if (marketPosition === 'premium') score += 10;
  
  // Property quality indicators (15% weight)
  if (property.specifications.yearBuilt > 2010) score += 5;
  if (property.amenities.length > 5) score += 5;
  if (property.specifications.squareFootage > 1000) score += 5;
  
  // Demand/popularity (10% weight)
  score += Math.min(10, property.views / 50); // Up to 10 points based on views
  
  return Math.min(100, Math.max(0, score));
}

function getRelativePricing(rent, marketData, bedrooms) {
  const bedroomKey = bedrooms === 0 ? 'studio' : `${bedrooms}bed`;
  const marketAvg = marketData.avgRent[bedroomKey] || marketData.avgRent['1bed'];
  
  const ratio = rent / marketAvg;
  
  if (ratio < 0.9) return 'good-value';
  if (ratio < 1.1) return 'market-rate';
  return 'premium';
}

module.exports = router;
