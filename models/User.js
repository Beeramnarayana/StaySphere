const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['renter', 'landlord', 'admin'],
    default: 'renter'
  },
  profile: {
    phone: String,
    avatar: String,
    bio: String,
    verified: {
      type: Boolean,
      default: false
    }
  },
  preferences: {
    budget: {
      min: Number,
      max: Number
    },
    location: {
      city: String,
      state: String,
      zipCode: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    propertyType: [{
      type: String,
      enum: ['apartment', 'house', 'condo', 'townhouse', 'studio']
    }],
    bedrooms: {
      min: Number,
      max: Number
    },
    bathrooms: {
      min: Number,
      max: Number
    },
    amenities: [{
      type: String
    }],
    petPolicy: {
      type: String,
      enum: ['allowed', 'not-allowed', 'case-by-case']
    },
    commute: {
      workAddress: String,
      maxCommuteTime: Number,
      transportMode: {
        type: String,
        enum: ['driving', 'public-transit', 'walking', 'cycling']
      }
    },
    lifestyle: {
      quietness: {
        type: Number,
        min: 1,
        max: 5
      },
      socialActivity: {
        type: Number,
        min: 1,
        max: 5
      },
      familyFriendly: Boolean
    },
    dealBreakers: [String],
    niceToHaves: [String]
  },
  searchHistory: [{
    query: String,
    filters: Object,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  savedProperties: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  }],
  viewedProperties: [{
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    },
    timeSpent: Number // in seconds
  }],
  aiPersonalization: {
    preferenceScore: {
      type: Map,
      of: Number
    },
    behaviorPatterns: Object,
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
