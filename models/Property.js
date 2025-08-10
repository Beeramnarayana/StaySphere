const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  isMain: {
    type: Boolean,
    default: false
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  propertyType: {
    type: String,
    enum: ['apartment', 'house', 'condo', 'townhouse', 'studio', 'loft'],
    required: true
  },
  specifications: {
    bedrooms: {
      type: Number,
      required: true,
      min: 0
    },
    bathrooms: {
      type: Number,
      required: true,
      min: 0
    },
    squareFootage: Number,
    yearBuilt: Number,
    parking: {
      type: String,
      enum: ['none', 'street', 'garage', 'driveway', 'covered']
    },
    furnished: {
      type: String,
      default: false
    },
    parkingSpaces: {
      type: Number,
      default: 0
    },
    petPolicy: {
      allowed: Boolean,
      deposit: Number,
      monthlyFee: Number,
      restrictions: [String]
    }
  },
  pricing: {
    rent: {
      type: Number,
      required: true
    },
    deposit: Number,
    applicationFee: Number,
    adminFee: Number,
    utilitiesIncluded: [String],
    leaseTerms: [Number]
  },
  amenities: [{
    type: String
  }],
  features: [String],
  policies: {
    smokingAllowed: {
      type: Boolean,
      default: false
    },
    petsAllowed: {
      type: Boolean,
      default: false
    },
    maxOccupants: Number,
    minimumLeaseMonths: {
      type: Number,
      default: 12
    },
    incomeRequirement: Number
  },
  
  // Property images
  images: [imageSchema],
  
  // GeoJSON location
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(v) {
          return v.length === 2 && 
                 v[0] >= -180 && v[0] <= 180 && 
                 v[1] >= -90 && v[1] <= 90;
        },
        message: props => `${props.value} is not a valid coordinate pair [longitude, latitude]`
      },
      index: '2dsphere'
    }
  },
  landlordInfo: {
    name: String,
    email: String,
    phone: String,
    company: String,
    responseTime: String,
    rating: String
  },
  address: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    neighborhood: String,
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
        validate: {
          validator: function(v) {
            return Array.isArray(v) && v.length === 2 && 
                   typeof v[0] === 'number' && 
                   typeof v[1] === 'number' &&
                   v[0] >= -180 && v[0] <= 180 &&
                   v[1] >= -90 && v[1] <= 90;
          },
          message: props => `${props.value} is not a valid coordinate pair [longitude, latitude]`
        },
        index: '2dsphere'
      }
    }
  },
  availability: {
    availableDate: Date,
    status: {
      type: String,
      enum: ['active', 'pending', 'rented', 'inactive'],
      default: 'active'
    },
    showingSchedule: {
      weekdays: String,
      weekends: String,
      notes: String
    }
  },
  images: [{
    url: String,
    caption: String,
    isMain: {
      type: Boolean,
      default: false
    }
  }],
  virtualTour: String,
  marketData: {
    cityAverage: Number,
    marketTrend: Number,
    demandScore: Number,
    inventory: String,
    pricePerSqFt: Number
  },
  views: {
    type: Number,
    default: 0
  },
  inquiries: {
    type: Number,
    default: 0
  },
  saved: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'rented', 'inactive'],
    default: 'active'
  },
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }],
  lastMessageAt: {
    type: Date
  },
  analytics: {
    views: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    inquiries: { type: Number, default: 0 },
    lastViewed: { type: Date },
    lastSaved: { type: Date }
  },
  
  // AI Analysis data
  aiAnalysis: {
    estimatedRent: { type: Number },
    marketAverage: { type: Number },
    confidenceScore: { type: Number },
    analysisDate: { type: Date, default: Date.now },
    marketTrend: { type: String },
    pricePerSqFt: { type: Number },
    comparableProperties: [{
      price: Number,
      distance: Number,
      bedrooms: Number,
      bathrooms: Number,
      sqft: Number
    }]
  }
}, {
  timestamps: true
});

// Index for geospatial queries
propertySchema.index({ 'address.coordinates.coordinates': '2dsphere' });

// Text index for search
propertySchema.index({
  title: 'text',
  description: 'text',
  'address.city': 'text',
  'address.state': 'text',
  amenities: 'text'
});

// Compound indexes for common queries
propertySchema.index({ 'pricing.rent': 1, 'specifications.bedrooms': 1 });
propertySchema.index({ 'address.city': 1, 'address.state': 1 });
propertySchema.index({ propertyType: 1, status: 1 });

module.exports = mongoose.model('Property', propertySchema);
