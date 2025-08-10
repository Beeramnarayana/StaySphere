const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('savedProperties')
      .select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's saved properties with AI cost analysis
router.get('/saved-properties', auth, async (req, res) => {
  try {
    console.log('Fetching saved properties for user:', req.user.userId);
    
    const user = await User.findById(req.user.userId)
      .populate({
        path: 'savedProperties',
        populate: {
          path: 'aiAnalysis',
          select: 'estimatedRent marketAverage confidenceScore analysisDate'
        }
      })
      .select('savedProperties');
    
    if (!user) {
      console.log('User not found:', req.user.userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`Found ${user.savedProperties.length} saved properties`);

    // Transform the data to include AI analysis if available
    const propertiesWithAnalysis = user.savedProperties.map((property, index) => {
      const propertyObj = property.toObject ? property.toObject() : property;
      
      console.log(`Property ${index + 1} ID:`, propertyObj._id);
      console.log('Property AI Analysis:', propertyObj.aiAnalysis);
      
      // Add AI analysis data if available
      if (propertyObj.aiAnalysis) {
        propertyObj.aiCostAnalysis = {
          estimatedRent: propertyObj.aiAnalysis.estimatedRent,
          marketAverage: propertyObj.aiAnalysis.marketAverage,
          confidenceScore: propertyObj.aiAnalysis.confidenceScore,
          lastUpdated: propertyObj.aiAnalysis.analysisDate
        };
        console.log('Added AI Cost Analysis:', propertyObj.aiCostAnalysis);
      } else {
        console.log('No AI analysis found for property:', propertyObj._id);
      }
      
      return propertyObj;
    });

    console.log('Sending properties with analysis:', propertiesWithAnalysis);
    res.json(propertiesWithAnalysis || []);
  } catch (error) {
    console.error('Get saved properties error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, profile, preferences } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (profile) user.profile = { ...user.profile, ...profile };
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's search history
router.get('/search-history', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('searchHistory');
    
    const recentSearches = user.searchHistory
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);

    res.json({ searchHistory: recentSearches });
  } catch (error) {
    console.error('Get search history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Clear search history
router.delete('/search-history', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.userId, {
      $set: { searchHistory: [] }
    });

    res.json({ message: 'Search history cleared successfully' });
  } catch (error) {
    console.error('Clear search history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
