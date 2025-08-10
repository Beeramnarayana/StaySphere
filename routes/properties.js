const express = require('express');
const mongoose = require('mongoose');
const Property = require('../models/Property');
const User = require('../models/User');
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const upload = require('../config/upload');

const router = express.Router();

// Get cost analysis for a property
router.get('/:id/cost-analysis', auth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if user has access to this property
    if (property.landlord.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Generate sample cost analysis data
    const costAnalysis = {
      propertyId: property._id,
      estimatedValue: Math.round(property.pricing.rent * 150), // Simple estimation
      monthlyExpenses: {
        maintenance: Math.round(property.pricing.rent * 0.1),
        propertyTax: Math.round(property.pricing.rent * 0.15),
        insurance: Math.round(property.pricing.rent * 0.05),
        hoa: property.amenities?.includes('HOA') ? Math.round(property.pricing.rent * 0.1) : 0,
        other: 0
      },
      roi: (Math.random() * 8 + 2).toFixed(2), // Random ROI between 2-10%
      cashFlow: {
        monthly: Math.round(property.pricing.rent * 0.4), // 40% of rent as profit
        annual: Math.round(property.pricing.rent * 0.4 * 12)
      },
      lastUpdated: new Date()
    };

    // Calculate total expenses
    costAnalysis.monthlyExpenses.total = Object.values(costAnalysis.monthlyExpenses).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);

    res.json(costAnalysis);
  } catch (error) {
    console.error('Error in cost analysis:', error);
    res.status(500).json({ message: 'Failed to generate cost analysis' });
  }
});

// Get properties for the logged-in user (landlord)
router.get('/my-properties', auth, async (req, res) => {
  try {
    const properties = await Property.find({ 
      landlord: req.user.userId,
      status: { $ne: 'deleted' } // Don't return deleted properties
    })
    .sort({ createdAt: -1 })
    .populate('landlord', 'name email profile.phone profile.verified')
    .lean();

    res.json({
      success: true,
      data: properties
    });
  } catch (error) {
    console.error('Error fetching user properties:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch your properties' 
    });
  }
});

// Get a single property by ID
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findOne({ _id: req.params.id, status: 'active' })
      .populate('landlord', 'name email profile.phone')
      .lean();

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Increment view count
    await Property.findByIdAndUpdate(req.params.id, { $inc: { 'analytics.views': 1 } });

    res.json(property);
  } catch (error) {
    console.error('Error fetching property:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid property ID' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new property
router.post('/', auth, upload.array('images', 10), async (req, res) => {
  try {
    const propertyData = JSON.parse(req.body.propertyData || '{}');
    
    // Validate required fields
    if (!propertyData.title || !propertyData.propertyType || !propertyData.address) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields (title, propertyType, address)' 
      });
    }

    // Set default location if not provided
    if (!propertyData.location) {
      propertyData.location = {
        type: 'Point',
        coordinates: [0, 0], // Default coordinates (can be updated later)
        formattedAddress: propertyData.address
      };
    } else if (!propertyData.location.coordinates) {
      // If location exists but no coordinates, add default coordinates
      propertyData.location.coordinates = [0, 0];
    }

    // Set the landlord to the current user
    propertyData.landlord = req.user.userId;
    
    // Create the property
    const property = new Property(propertyData);
    
    try {
      await property.save();
    } catch (validationError) {
      console.error('Validation error creating property:', validationError);
      return res.status(400).json({
        success: false,
        message: 'Invalid property data',
        error: validationError.message,
        errors: validationError.errors
      });
    }

    // If there are images, handle them here
    if (req.files && req.files.images) {
      const images = Array.isArray(req.files.images) 
        ? req.files.images 
        : [req.files.images];
      
      // Process and save images (you'll need to implement this part)
      // For now, we'll just store the file information
      property.images = images.map(file => ({
        url: `/uploads/${file.filename}`,
        isPrimary: false
      }));
      
      // Set the first image as primary
      if (property.images.length > 0) {
        property.images[0].isPrimary = true;
      }
      
      await property.save();
    }

    // Populate the landlord field before sending the response
    await property.populate('landlord', 'name email');
    
    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: property
    });
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create property',
      error: error.message
    });
  }
});

// Get all properties with filters
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      minPrice,
      maxPrice,
      bedrooms,
      propertyType,
      location,
      sort = '-createdAt'
    } = req.query;

    // Build query
    const query = { status: 'active' };
    
    // Price filter
    if (minPrice || maxPrice) {
      query['pricing.rent'] = {};
      if (minPrice) query['pricing.rent'].$gte = Number(minPrice);
      if (maxPrice) query['pricing.rent'].$lte = Number(maxPrice);
    }

    // Bedrooms filter
    if (bedrooms) {
      query['specifications.bedrooms'] = Number(bedrooms);
    }

    // Property type filter
    if (propertyType) {
      query.propertyType = propertyType;
    }

    // Location search
    if (location) {
      query.$or = [
        { 'address.city': new RegExp(location, 'i') },
        { 'address.state': new RegExp(location, 'i') },
        { 'address.country': new RegExp(location, 'i') }
      ];
    }

    // Execute query with pagination
    const properties = await Property.find(query)
      .populate('landlord', 'name email profile.phone profile.verified')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get total count for pagination
    const total = await Property.countDocuments(query);

    res.json({
      success: true,
      data: properties,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalResults: total
      }
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch properties. Please try again later.'
    });
  }
});

// Handle contact form submission
router.post('/contact', async (req, res) => {
  try {
    const { propertyId, name, email, phone, message } = req.body;

    // Validate required fields
    if (!propertyId || !name || !email || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid email address' 
      });
    }

    // Find the property to get the landlord's ID
    const property = await Property.findById(propertyId).populate('landlord');
    if (!property) {
      return res.status(404).json({ 
        success: false, 
        message: 'Property not found' 
      });
    }

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create and save the message
      const newMessage = new Message({
        property: propertyId,
        from: {
          name,
          email,
          phone: phone || ''
        },
        to: property.landlord._id,
        message,
        status: 'unread'
      });

      await newMessage.save({ session });

      // Update the property with the new message reference
      await Property.findByIdAndUpdate(
        propertyId,
        {
          $push: { messages: newMessage._id },
          $set: { lastMessageAt: new Date() },
          $inc: { 'analytics.inquiries': 1 }
        },
        { session, new: true }
      );

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      // Here you would typically send an email notification to the landlord
      // For example:
      // await sendEmail(
      //   property.landlord.email,
      //   'New Property Inquiry',
      //   `You have a new inquiry for your property at ${property.address.street} from ${name} (${email}).\n\nMessage: ${message}`
      // );

      // Return success response
      res.status(200).json({ 
        success: true, 
        message: 'Your message has been sent successfully. The property owner will contact you soon.' 
      });
    } catch (error) {
      // If anything fails, abort the transaction
      await session.abortTransaction();
      session.endSession();
      throw error;
    }

  } catch (error) {
    console.error('Error processing contact form:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while sending your message. Please try again later.' 
    });
  }
});

// Get messages for a user (landlord)
router.get('/messages', auth, async (req, res) => {
  try {
    const messages = await Message.find({ to: req.user.userId })
      .populate('property', 'title address')
      .sort({ createdAt: -1 });
      
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

// Update message status (e.g., mark as read)
router.put('/messages/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, to: req.user.userId },
      { status },
      { new: true }
    );
    
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    
    res.json({ success: true, data: message });
  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({ success: false, message: 'Failed to update message status' });
  }
});

// Save a property for the current user
router.post('/:id/save', auth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Use req.user.userId consistently (set by auth middleware)
    const userId = req.user.userId || req.user.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already saved
    const alreadySaved = user.savedProperties.some(id => 
      id.toString() === property._id.toString()
    );
    
    if (alreadySaved) {
      return res.status(400).json({ message: 'Property already saved' });
    }

    user.savedProperties.push(property._id);
    await user.save();

    // Update save count on property
    property.analytics = property.analytics || { saves: 0 };
    property.analytics.saves = (property.analytics.saves || 0) + 1;
    await property.save();

    res.json({ 
      success: true,
      message: 'Property saved successfully',
      savesCount: property.analytics.saves
    });
  } catch (error) {
    console.error('Error saving property:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while saving property' 
    });
  }
});

// Unsave a property for the current user
router.post('/:id/unsave', auth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Use req.user.userId consistently (set by auth middleware)
    const userId = req.user.userId || req.user.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if property is in saved list
    const propertyIndex = user.savedProperties.findIndex(
      id => id.toString() === req.params.id
    );
    
    if (propertyIndex === -1) {
      return res.status(400).json({ message: 'Property not in saved list' });
    }

    // Remove property from saved list
    user.savedProperties.splice(propertyIndex, 1);
    await user.save();

    // Update save count on property
    property.analytics = property.analytics || { saves: 0 };
    property.analytics.saves = Math.max(0, (property.analytics.saves || 1) - 1);
    await property.save();

    res.json({ 
      success: true,
      message: 'Property removed from saved',
      savesCount: property.analytics.saves
    });
  } catch (error) {
    console.error('Error unsaving property:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while unsaving property' 
    });
  }
});



// Get user's saved properties
router.get('/user/saved', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Find properties where the current user has saved them
    const savedProperties = await Property.find({
      _id: { $in: user.savedProperties || [] },
      status: 'active'
    })
    .populate('landlord', 'name email profile.phone profile.verified')
    .lean();

    res.json({
      success: true,
      data: savedProperties
    });
  } catch (error) {
    console.error('Error fetching saved properties:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch saved properties. Please try again later.'
    });
  }
});

module.exports = router;