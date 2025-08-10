# Property Updates Feature

This document outlines the new property updates feature that allows landlords to upload property images and update property locations using Google Maps integration.

## Features

1. **Image Management**
   - Upload multiple property images
   - Delete existing images
   - Set a main image
   - Preview images in a gallery

2. **Location Management**
   - Display property location on an interactive map
   - Update property location by:
     - Dragging the marker
     - Searching for an address
     - Using current location

## API Endpoints

### Image Upload
- **POST** `/api/properties/:id/images`
  - Upload one or more images for a property
  - Max 10 images per property
  - Max 5MB per image
  - Supported formats: JPG, JPEG, PNG, WebP

### Delete Image
- **DELETE** `/api/properties/:id/images/:imageId`
  - Delete a specific image from a property
  - Only the property owner can delete images

### Update Location
- **PUT** `/api/properties/:id/location`
  - Update the geographical location of a property
  - Accepts GeoJSON Point format
  - Only the property owner can update the location

## Frontend Components

### PropertyImageGallery
A React component that handles image uploads, previews, and management.

**Props:**
- `propertyId`: ID of the property
- `images`: Array of existing images
- `isOwner`: Boolean indicating if current user is the property owner
- `onUpdate`: Callback when images are updated

### PropertyLocationMap
A React component that displays and updates property location using Google Maps.

**Props:**
- `propertyId`: ID of the property
- `initialLocation`: Initial location as GeoJSON Point
- `isOwner`: Boolean indicating if current user is the property owner
- `onLocationUpdate`: Callback when location is updated
- `address`: Optional address string for display

## Environment Variables

### Client (.env)
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Server (.env)
```
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

## Testing

1. **Prerequisites**
   - Node.js and npm installed
   - MongoDB running locally or remote
   - Google Maps API key

2. **Setup**
   ```bash
   # Install dependencies
   npm install
   
   # Install client dependencies
   cd client
   npm install
   cd ..
   
   # Create .env files with your configuration
   # See Environment Variables section above
   ```

3. **Run Tests**
   ```bash
   # Start the server
   npm run dev
   
   # In a new terminal, run the test script
   # Update the test script with your JWT token and property ID
   node test-property-updates.js
   ```

## Troubleshooting

1. **Image Upload Fails**
   - Check file size (max 5MB)
   - Verify file type (only JPG, JPEG, PNG, WebP)
   - Ensure uploads directory has write permissions

2. **Google Maps Not Loading**
   - Verify Google Maps API key is set in client .env
   - Check browser console for API key errors
   - Ensure billing is enabled for your Google Cloud project

3. **Authentication Issues**
   - Verify JWT token is valid and not expired
   - Check server logs for authentication errors
   - Ensure user is the property owner

## Security Considerations

1. **File Uploads**
   - Validate file types on both client and server
   - Use unique filenames to prevent overwrites
   - Consider using cloud storage in production

2. **API Security**
   - All endpoints require authentication
   - Only property owners can modify their properties
   - Rate limiting is in place to prevent abuse

## Future Improvements

1. **Image Processing**
   - Automatic image resizing and optimization
   - Support for image captions and reordering

2. **Location Features**
   - Geofencing for property boundaries
   - Nearby points of interest
   - Directions to property

3. **Performance**
   - Image lazy loading
   - Map tile optimization
   - Caching for static assets
