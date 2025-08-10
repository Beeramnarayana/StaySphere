const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get property analytics
router.get('/property/:propertyId', auth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.propertyId);
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if user owns this property
    if (property.landlord.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Generate analytics data (in a real app, this would come from actual tracking)
    const analytics = {
      views: {
        total: property.analytics?.views?.total || Math.floor(Math.random() * 500) + 100,
        thisWeek: property.analytics?.views?.thisWeek || Math.floor(Math.random() * 50) + 10,
        trend: property.analytics?.views?.trend || (Math.random() > 0.5 ? '+' : '-') + Math.floor(Math.random() * 30) + '%'
      },
      saves: {
        total: property.analytics?.saves?.total || Math.floor(Math.random() * 50) + 5,
        thisWeek: property.analytics?.saves?.thisWeek || Math.floor(Math.random() * 10) + 1,
        trend: property.analytics?.saves?.trend || (Math.random() > 0.5 ? '+' : '-') + Math.floor(Math.random() * 40) + '%'
      },
      inquiries: {
        total: property.analytics?.inquiries?.total || Math.floor(Math.random() * 20) + 3,
        thisWeek: property.analytics?.inquiries?.thisWeek || Math.floor(Math.random() * 5) + 1,
        trend: property.analytics?.inquiries?.trend || (Math.random() > 0.5 ? '+' : '-') + Math.floor(Math.random() * 50) + '%'
      },
      applications: {
        total: property.analytics?.applications?.total || Math.floor(Math.random() * 10) + 1,
        thisWeek: property.analytics?.applications?.thisWeek || Math.floor(Math.random() * 3),
        trend: property.analytics?.applications?.trend || (Math.random() > 0.5 ? '+' : '-') + Math.floor(Math.random() * 60) + '%'
      },
      conversionRate: {
        viewToSave: property.analytics?.conversionRate?.viewToSave || (Math.random() * 15 + 5).toFixed(1),
        saveToInquiry: property.analytics?.conversionRate?.saveToInquiry || (Math.random() * 40 + 30).toFixed(1),
        inquiryToApplication: property.analytics?.conversionRate?.inquiryToApplication || (Math.random() * 50 + 20).toFixed(1)
      },
      marketComparison: {
        averageRent: Math.floor(property.pricing.rent * (1 + (Math.random() * 0.4 - 0.2))),
        yourRent: property.pricing.rent,
        competitiveness: property.pricing.rent < (property.pricing.rent * 1.1) ? 'competitive' : 'above-market',
        pricePerSqFt: (property.pricing.rent / (property.specifications.squareFootage || 1000)).toFixed(2),
        marketPricePerSqFt: (property.pricing.rent * 1.1 / (property.specifications.squareFootage || 1000)).toFixed(2)
      },
      aiInsights: generateAIInsights(property),
      demographics: {
        ageGroups: [
          { range: '18-25', percentage: Math.floor(Math.random() * 20) + 10 },
          { range: '26-35', percentage: Math.floor(Math.random() * 30) + 35 },
          { range: '36-45', percentage: Math.floor(Math.random() * 20) + 20 },
          { range: '46+', percentage: Math.floor(Math.random() * 20) + 10 }
        ],
        searchSources: [
          { source: 'Direct Search', percentage: Math.floor(Math.random() * 20) + 30 },
          { source: 'AI Recommendations', percentage: Math.floor(Math.random() * 20) + 25 },
          { source: 'Saved Searches', percentage: Math.floor(Math.random() * 20) + 20 }
        ]
      }
    };

    res.json(analytics);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
});

// Generate AI insights based on property data
function generateAIInsights(property) {
  const insights = [];
  
  // Price analysis
  const avgRent = property.pricing.rent * 1.1; // Simplified market average
  if (property.pricing.rent < avgRent) {
    insights.push(`Your property is priced ${Math.round(((avgRent - property.pricing.rent) / avgRent) * 100)}% below market average, which may be attracting more views`);
  } else {
    insights.push(`Your property is priced above market average. Consider adjusting to increase interest`);
  }
  
  // Amenities analysis
  if (property.amenities && property.amenities.includes('parking')) {
    insights.push('Consider highlighting the parking amenity as it\'s highly sought after in your area');
  }
  
  if (property.amenities && property.amenities.includes('gym')) {
    insights.push('The gym amenity is a strong selling point for young professionals');
  }
  
  // Location insights
  if (property.address.city.toLowerCase().includes('downtown') || property.address.city.toLowerCase().includes('center')) {
    insights.push('Your downtown location is attractive to commuters and young professionals');
  }
  
  // Property type insights
  if (property.propertyType === 'apartment' && property.specifications.bedrooms >= 2) {
    insights.push('Multi-bedroom apartments in your area are in high demand among families and roommates');
  }
  
  // Generic insights
  insights.push('Your conversion rate from saves to inquiries is above average');
  insights.push('The property performs best with young professionals aged 25-35');
  
  return insights.slice(0, 4); // Return max 4 insights
}

// Get landlord dashboard analytics
router.get('/dashboard', auth, async (req, res) => {
  try {
    const properties = await Property.find({ landlord: req.user.userId });
    
    if (properties.length === 0) {
      return res.json({
        totalProperties: 0,
        totalViews: 0,
        totalInquiries: 0,
        averageRent: 0,
        occupancyRate: 0,
        monthlyRevenue: 0
      });
    }

    // Calculate aggregate statistics
    const totalProperties = properties.length;
    const totalViews = properties.reduce((sum, prop) => sum + (prop.analytics?.views?.total || Math.floor(Math.random() * 200) + 50), 0);
    const totalInquiries = properties.reduce((sum, prop) => sum + (prop.analytics?.inquiries?.total || Math.floor(Math.random() * 10) + 2), 0);
    const averageRent = properties.reduce((sum, prop) => sum + prop.pricing.rent, 0) / totalProperties;
    const occupancyRate = Math.floor(Math.random() * 20) + 80; // 80-100%
    const monthlyRevenue = properties.reduce((sum, prop) => sum + prop.pricing.rent, 0);

    res.json({
      totalProperties,
      totalViews,
      totalInquiries,
      averageRent: Math.round(averageRent),
      occupancyRate,
      monthlyRevenue,
      recentActivity: [
        { type: 'view', property: properties[0]?.title || 'Property', time: '2 hours ago' },
        { type: 'inquiry', property: properties[Math.floor(Math.random() * properties.length)]?.title || 'Property', time: '5 hours ago' },
        { type: 'save', property: properties[Math.floor(Math.random() * properties.length)]?.title || 'Property', time: '1 day ago' }
      ]
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard analytics' });
  }
});

module.exports = router;
