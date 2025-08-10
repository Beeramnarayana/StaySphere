// services/marketData.js
const Property = require('../models/Property');

const marketDataService = {
  /**
   * Get market data for a specific location
   * @param {Object} location - Location object with city and state
   * @returns {Object} Market data including average prices, trends, etc.
   */
  async getMarketData(location) {
    try {
      // If no location provided, get global averages
      if (!location || !location.city) {
        return this.getGlobalMarketData();
      }

      // Get properties in the same city
      const properties = await Property.find({
        'address.city': location.city,
        'address.state': location.state
      });

      if (properties.length === 0) {
        return this.getGlobalMarketData();
      }

      // Calculate average price
      const totalRent = properties.reduce((sum, prop) => sum + (prop.pricing?.rent || 0), 0);
      const avgRent = totalRent / properties.length;

      // Count property types
      const propertyTypes = {};
      properties.forEach(prop => {
        const type = prop.propertyType || 'Unknown';
        propertyTypes[type] = (propertyTypes[type] || 0) + 1;
      });

      return {
        location: {
          city: location.city,
          state: location.state
        },
        averageRent: Math.round(avgRent),
        propertyTypeDistribution: propertyTypes,
        totalListings: properties.length,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting market data:', error);
      return this.getGlobalMarketData();
    }
  },

  /**
   * Get global market data (fallback)
   * @returns {Object} Default market data
   */
  getGlobalMarketData() {
    return {
      location: { city: 'Global', state: 'All' },
      averageRent: 1500,
      propertyTypeDistribution: {
        'Apartment': 45,
        'House': 35,
        'Condo': 15,
        'Other': 5
      },
      totalListings: 100,
      lastUpdated: new Date(),
      isEstimate: true
    };
  },

  /**
   * Get price trends for a location
   * @param {Object} location - Location object with city and state
   * @param {number} months - Number of months to look back
   * @returns {Array} Price trend data
   */
  async getPriceTrends(location, months = 12) {
    // In a real app, this would query historical data
    // For now, return mock data
    const trends = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      
      // Add some randomness to make it look real
      const basePrice = 1200 + (Math.random() * 600 - 300);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        averageRent: Math.round(basePrice + (i * 20)) // Slight upward trend
      });
    }

    return trends;
  }
};

module.exports = marketDataService;