const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Property = require('../models/Property');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/properties/';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.params.id}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const filetypes = /jpe?g|png|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only .jpg, .jpeg, .png, and .webp formats are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// @route   POST /api/properties/:id/images
// @desc    Upload property images
// @access  Private (Landlord)
router.post(
  '/:id/images',
  auth,
  upload.array('images', 10), // Max 10 images
  async (req, res) => {
    try {
      const property = await Property.findById(req.params.id);
      
      // Check if property exists
      if (!property) {
        return res.status(404).json({ msg: 'Property not found' });
      }

      // Check if user owns the property
      if (property.landlord.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'Not authorized' });
      }

      // Process uploaded files
      const newImages = [];
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          // In production, you'd upload to a cloud storage service like S3
          // For now, we'll just save the path
          newImages.push({
            url: `/uploads/properties/${file.filename}`,
            path: file.path,
            isMain: property.images.length === 0 // First image is main by default
          });
        });

        // Add new images to property
        property.images = [...property.images, ...newImages];
        await property.save();
      }

      res.json({ images: property.images });
    } catch (err) {
      console.error(err.message);
      // Clean up uploaded files if there was an error
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlink(file.path, () => {});
          }
        });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   DELETE /api/properties/:id/images/:imageId
// @desc    Delete a property image
// @access  Private (Landlord)
router.delete('/:id/images/:imageId', auth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    // Check if property exists
    if (!property) {
      return res.status(404).json({ msg: 'Property not found' });
    }

    // Check if user owns the property
    if (property.landlord.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    // Find the image to delete
    const imageIndex = property.images.findIndex(
      img => img._id.toString() === req.params.imageId
    );

    if (imageIndex === -1) {
      return res.status(404).json({ msg: 'Image not found' });
    }

    const imageToDelete = property.images[imageIndex];
    
    // Remove image from array
    property.images.splice(imageIndex, 1);
    
    // If we deleted the main image and there are other images, set the first one as main
    if (imageToDelete.isMain && property.images.length > 0) {
      property.images[0].isMain = true;
    }

    await property.save();

    // Delete the file from the filesystem
    if (fs.existsSync(imageToDelete.path)) {
      fs.unlink(imageToDelete.path, (err) => {
        if (err) console.error(`Error deleting file: ${imageToDelete.path}`, err);
      });
    }

    res.json({ images: property.images });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/properties/:id/location
// @desc    Update property location
// @access  Private (Landlord)
router.put('/:id/location', auth, async (req, res) => {
  const { location } = req.body;

  try {
    // Validate location
    if (!location || !location.coordinates || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
      return res.status(400).json({ msg: 'Invalid location data' });
    }

    const property = await Property.findById(req.params.id);
    
    // Check if property exists
    if (!property) {
      return res.status(404).json({ msg: 'Property not found' });
    }

    // Check if user owns the property
    if (property.landlord.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    // Update location
    property.location = {
      type: 'Point',
      coordinates: location.coordinates
    };

    await property.save();
    
    res.json(property);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Property not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;
