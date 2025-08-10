import React, { useState } from 'react';
import api from '../utils/axiosConfig';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Alert,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  CircularProgress,
  IconButton
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  Home as HomeIcon,
  Psychology as AIIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const AddProperty = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [aiDescription, setAiDescription] = useState('');
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imagePreview, setImagePreview] = useState([]);

  const [propertyData, setPropertyData] = useState({
    title: '',
    description: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    },
    propertyType: '',
    specifications: {
      bedrooms: 1,
      bathrooms: 1,
      squareFootage: '',
      parking: '',
      furnished: ''
    },
    pricing: {
      rent: '',
      deposit: '',
      applicationFee: '',
      petDeposit: ''
    },
    amenities: [],
    petPolicy: {
      allowed: false,
      types: [],
      deposit: '',
      monthlyFee: ''
    },
    availability: {
      availableDate: '',
      leaseLength: { min: 12, max: 12, preferred: 12 }
    },
    images: []
  });

  const steps = ['Basic Info', 'Property Details', 'Pricing & Policies', 'Images', 'Review & Submit'];

  const propertyTypes = ['apartment', 'house', 'condo', 'townhouse', 'studio'];
  const parkingOptions = ['none', 'street', 'garage', 'driveway', 'covered'];
  const furnishedOptions = ['unfurnished', 'partially-furnished', 'fully-furnished'];
  const commonAmenities = [
    'Parking', 'Gym', 'Pool', 'Laundry', 'Dishwasher', 'Air Conditioning',
    'Balcony', 'Pet Friendly', 'Furnished', 'Internet Included', 'Hardwood Floors',
    'In-unit Washer/Dryer', 'Fireplace', 'Garden', 'Rooftop Access'
  ];

  const handleInputChange = (section, field, value) => {
    if (section) {
      setPropertyData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setPropertyData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const toggleAmenity = (amenity) => {
    setPropertyData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const generateAIDescription = async () => {
    // Check if we have enough property data
    if (!propertyData.propertyType || !propertyData.address.city || !propertyData.pricing.rent) {
      setError('Please fill in property type, city, and rent amount before generating AI description.');
      return;
    }

    setGeneratingDescription(true);
    setError('');
    
    try {
      const response = await axios.post('/ai/generate-description', {
        propertyData
      });
      
      const generatedDescription = response.data.description;
      const source = response.data.source || 'ai';
      
      setAiDescription(generatedDescription);
      setPropertyData(prev => ({
        ...prev,
        description: generatedDescription
      }));
      
      // Show success message based on source
      if (source === 'openai') {
        setSuccess('AI description generated successfully!');
      } else {
        setSuccess('Description created using smart template!');
      }
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Failed to generate description:', error);
      
      // If the server responded with a fallback description, use it
      if (error.response?.data?.description) {
        const fallbackDescription = error.response.data.description;
        setAiDescription(fallbackDescription);
        setPropertyData(prev => ({
          ...prev,
          description: fallbackDescription
        }));
        setSuccess('Description created using smart template!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        // Create a client-side fallback description
        const fallbackDescription = createFallbackDescription(propertyData);
        setAiDescription(fallbackDescription);
        setPropertyData(prev => ({
          ...prev,
          description: fallbackDescription
        }));
        
        // Show informative error message
        if (error.response?.status === 503) {
          setError('AI service is not available. Using a basic description template instead.');
        } else {
          setError('AI description generation failed. Using a basic description template instead.');
        }
      }
    }
    setGeneratingDescription(false);
  };

  const createFallbackDescription = (data) => {
    const { propertyType, specifications, address, pricing, amenities } = data;
    
    let description = `Beautiful ${specifications.bedrooms || 'multi'}-bedroom ${propertyType || 'property'}`;
    
    if (address.city) {
      description += ` located in ${address.city}`;
      if (address.state) description += `, ${address.state}`;
    }
    
    description += '. ';
    
    if (specifications.bathrooms) {
      description += `Features ${specifications.bathrooms} bathroom${specifications.bathrooms > 1 ? 's' : ''}`;
    }
    
    if (specifications.squareFootage) {
      description += ` with ${specifications.squareFootage} square feet of living space`;
    }
    
    description += '. ';
    
    if (amenities && amenities.length > 0) {
      description += `Amenities include: ${amenities.slice(0, 5).join(', ')}`;
      if (amenities.length > 5) description += ' and more';
      description += '. ';
    }
    
    if (pricing.rent) {
      description += `Available for $${pricing.rent.toLocaleString()}/month. `;
    }
    
    description += 'Contact us today to schedule a viewing!';
    
    return description;
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      setError('Some files were skipped. Please upload only images under 5MB.');
      setTimeout(() => setError(''), 3000);
    }

    setUploadingImages(true);

    try {
      // Create preview URLs
      const newPreviews = validFiles.map(file => ({
        file,
        url: URL.createObjectURL(file),
        name: file.name
      }));

      setImagePreview(prev => [...prev, ...newPreviews]);
      setPropertyData(prev => ({
        ...prev,
        images: [...prev.images, ...validFiles]
      }));

      setSuccess(`${validFiles.length} image(s) added successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to process images. Please try again.');
      setTimeout(() => setError(''), 3000);
    }

    setUploadingImages(false);
  };

  const removeImage = (index) => {
    // Revoke the object URL to free memory
    URL.revokeObjectURL(imagePreview[index].url);
    
    setImagePreview(prev => prev.filter((_, i) => i !== index));
    setPropertyData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      
      // Add property data (excluding images array)
      const { images, ...propertyDataWithoutImages } = propertyData;
      formData.append('propertyData', JSON.stringify(propertyDataWithoutImages));
      
      // Add image files
      propertyData.images.forEach((image, index) => {
        formData.append('images', image);
      });
      
      const response = await api.post('/properties', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('Property added successfully!');
      setTimeout(() => {
        navigate('/landlord');
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to add property');
    }
    setLoading(false);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
              Basic Information
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Property Title"
                  value={propertyData.title}
                  onChange={(e) => handleInputChange(null, 'title', e.target.value)}
                  placeholder="e.g., Beautiful 2BR Apartment in Downtown"
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Street Address"
                  value={propertyData.address.street}
                  onChange={(e) => handleInputChange('address', 'street', e.target.value)}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="City"
                  value={propertyData.address.city}
                  onChange={(e) => handleInputChange('address', 'city', e.target.value)}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="State"
                  value={propertyData.address.state}
                  onChange={(e) => handleInputChange('address', 'state', e.target.value)}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="ZIP Code"
                  value={propertyData.address.zipCode}
                  onChange={(e) => handleInputChange('address', 'zipCode', e.target.value)}
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Property Type</InputLabel>
                  <Select
                    value={propertyData.propertyType}
                    onChange={(e) => handleInputChange(null, 'propertyType', e.target.value)}
                    label="Property Type"
                  >
                    {propertyTypes.map(type => (
                      <MenuItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </motion.div>
        );

      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
              Property Details
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Bedrooms"
                  value={propertyData.specifications.bedrooms}
                  onChange={(e) => handleInputChange('specifications', 'bedrooms', parseInt(e.target.value))}
                  inputProps={{ min: 0, max: 10 }}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Bathrooms"
                  value={propertyData.specifications.bathrooms}
                  onChange={(e) => handleInputChange('specifications', 'bathrooms', parseFloat(e.target.value))}
                  inputProps={{ min: 0, max: 10, step: 0.5 }}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Square Footage"
                  value={propertyData.specifications.squareFootage}
                  onChange={(e) => handleInputChange('specifications', 'squareFootage', e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Parking</InputLabel>
                  <Select
                    value={propertyData.specifications.parking}
                    onChange={(e) => handleInputChange('specifications', 'parking', e.target.value)}
                    label="Parking"
                  >
                    {parkingOptions.map(option => (
                      <MenuItem key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Furnished</InputLabel>
                  <Select
                    value={propertyData.specifications.furnished}
                    onChange={(e) => handleInputChange('specifications', 'furnished', e.target.value)}
                    label="Furnished"
                  >
                    {furnishedOptions.map(option => (
                      <MenuItem key={option} value={option}>
                        {option.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Amenities</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {commonAmenities.map(amenity => (
                    <Chip
                      key={amenity}
                      label={amenity}
                      onClick={() => toggleAmenity(amenity)}
                      color={propertyData.amenities.includes(amenity) ? 'primary' : 'default'}
                      variant={propertyData.amenities.includes(amenity) ? 'filled' : 'outlined'}
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
              Pricing & Policies
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Monthly Rent"
                  value={propertyData.pricing.rent}
                  onChange={(e) => handleInputChange('pricing', 'rent', e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Security Deposit"
                  value={propertyData.pricing.deposit}
                  onChange={(e) => handleInputChange('pricing', 'deposit', e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Application Fee"
                  value={propertyData.pricing.applicationFee}
                  onChange={(e) => handleInputChange('pricing', 'applicationFee', e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Available Date"
                  value={propertyData.availability.availableDate}
                  onChange={(e) => handleInputChange('availability', 'availableDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <Typography variant="h6" gutterBottom>Pet Policy</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Button
                      variant={propertyData.petPolicy.allowed ? 'contained' : 'outlined'}
                      onClick={() => handleInputChange('petPolicy', 'allowed', !propertyData.petPolicy.allowed)}
                    >
                      Pets {propertyData.petPolicy.allowed ? 'Allowed' : 'Not Allowed'}
                    </Button>
                  </Box>
                  
                  {propertyData.petPolicy.allowed && (
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Pet Deposit"
                          value={propertyData.petPolicy.deposit}
                          onChange={(e) => handleInputChange('petPolicy', 'deposit', e.target.value)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Monthly Pet Fee"
                          value={propertyData.petPolicy.monthlyFee}
                          onChange={(e) => handleInputChange('petPolicy', 'monthlyFee', e.target.value)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>
                          }}
                        />
                      </Grid>
                    </Grid>
                  )}
                </FormControl>
              </Grid>
            </Grid>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
              Description & Review
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card sx={{ mb: 3, border: aiDescription ? '2px solid' : '1px solid', borderColor: aiDescription ? 'success.main' : 'divider' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <AIIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">AI Description Generator</Typography>
                      {aiDescription && (
                        <Chip 
                          label="Generated" 
                          color="success" 
                          size="small" 
                          sx={{ ml: 'auto' }}
                        />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Let AI create a compelling description for your property based on the details you've entered
                    </Typography>
                    
                    {/* Requirements check */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Required fields: Property Type, City, Rent Amount
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Chip 
                          label="Property Type" 
                          size="small" 
                          color={propertyData.propertyType ? 'success' : 'default'}
                          variant={propertyData.propertyType ? 'filled' : 'outlined'}
                        />
                        <Chip 
                          label="City" 
                          size="small" 
                          color={propertyData.address.city ? 'success' : 'default'}
                          variant={propertyData.address.city ? 'filled' : 'outlined'}
                        />
                        <Chip 
                          label="Rent" 
                          size="small" 
                          color={propertyData.pricing.rent ? 'success' : 'default'}
                          variant={propertyData.pricing.rent ? 'filled' : 'outlined'}
                        />
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Button
                        variant={aiDescription ? "outlined" : "contained"}
                        onClick={generateAIDescription}
                        disabled={generatingDescription}
                        startIcon={generatingDescription ? <CircularProgress size={16} /> : <AIIcon />}
                        sx={{ minWidth: 200 }}
                      >
                        {generatingDescription ? 'Generating Description...' : 
                         aiDescription ? 'Regenerate AI Description' : 'Generate AI Description'}
                      </Button>
                      
                      {aiDescription && (
                        <Button
                          variant="text"
                          color="secondary"
                          onClick={() => {
                            setAiDescription('');
                            setPropertyData(prev => ({ ...prev, description: '' }));
                          }}
                        >
                          Clear
                        </Button>
                      )}
                    </Box>
                    
                    {/* Preview of generated description */}
                    {aiDescription && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.200' }}>
                        <Typography variant="caption" color="success.main" sx={{ fontWeight: 'bold' }}>
                          AI Generated Preview:
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {aiDescription.substring(0, 150)}...
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label="Property Description"
                  value={propertyData.description}
                  onChange={(e) => handleInputChange(null, 'description', e.target.value)}
                  placeholder="Describe your property, its features, and what makes it special..."
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Property Summary</Typography>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>{propertyData.title}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {propertyData.address.street}, {propertyData.address.city}, {propertyData.address.state}
                  </Typography>
                  <Typography variant="body2">
                    {propertyData.specifications.bedrooms} bed, {propertyData.specifications.bathrooms} bath • 
                    ${propertyData.pricing.rent}/month
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
              Property Images
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Upload Property Photos
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Add high-quality photos to showcase your property. The first image will be used as the main photo.
                    </Typography>
                    
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="image-upload"
                      multiple
                      type="file"
                      onChange={handleImageUpload}
                    />
                    <label htmlFor="image-upload">
                      <Button
                        variant="outlined"
                        component="span"
                        disabled={uploadingImages}
                        sx={{ mb: 2 }}
                      >
                        {uploadingImages ? 'Uploading...' : 'Choose Images'}
                      </Button>
                    </label>
                    
                    <Typography variant="caption" display="block" color="text.secondary">
                      Supported formats: JPG, PNG, GIF. Max size: 5MB per image.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Image Preview Grid */}
              {imagePreview.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Uploaded Images ({imagePreview.length})
                  </Typography>
                  <Grid container spacing={2}>
                    {imagePreview.map((preview, index) => (
                      <Grid item xs={6} sm={4} key={index}>
                        <Card>
                          <Box sx={{ position: 'relative' }}>
                            <img
                              src={preview.url}
                              alt={`Property ${index + 1}`}
                              style={{
                                width: '100%',
                                height: '150px',
                                objectFit: 'cover'
                              }}
                            />
                            <IconButton
                              sx={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                bgcolor: 'rgba(255, 255, 255, 0.8)',
                                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' }
                              }}
                              size="small"
                              onClick={() => removeImage(index)}
                            >
                              ✕
                            </IconButton>
                            {index === 0 && (
                              <Chip
                                label="Main Photo"
                                size="small"
                                color="primary"
                                sx={{
                                  position: 'absolute',
                                  bottom: 4,
                                  left: 4
                                }}
                              />
                            )}
                          </Box>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              )}
              
              {imagePreview.length === 0 && (
                <Grid item xs={12}>
                  <Box
                    sx={{
                      border: '2px dashed',
                      borderColor: 'grey.300',
                      borderRadius: 2,
                      p: 4,
                      textAlign: 'center',
                      bgcolor: 'grey.50'
                    }}
                  >
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                      No images uploaded yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Upload some photos to make your listing more attractive to potential renters.
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
              Review & Submit
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Final Property Summary</Typography>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      {propertyData.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                      {propertyData.address.street}, {propertyData.address.city}, {propertyData.address.state} {propertyData.address.zipCode}
                    </Typography>
                    <Typography variant="h5" color="primary.main" sx={{ mb: 2 }}>
                      ${propertyData.pricing.rent}/month
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {propertyData.specifications.bedrooms} bed, {propertyData.specifications.bathrooms} bath
                      {propertyData.specifications.squareFootage && ` • ${propertyData.specifications.squareFootage} sq ft`}
                    </Typography>
                    {propertyData.images.length > 0 && (
                      <Typography variant="body2" color="success.main">
                        ✓ {propertyData.images.length} image(s) uploaded
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', textAlign: 'center' }}>
          Add New Property
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        <AnimatePresence mode="wait">
          {renderStepContent()}
        </AnimatePresence>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0}
          >
            Back
          </Button>
          
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
              startIcon={<HomeIcon />}
            >
              {loading ? 'Adding Property...' : 'Add Property'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
            >
              Next
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default AddProperty;
