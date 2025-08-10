import React, { useState, useEffect } from 'react';
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
  Psychology as AIIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const EditProperty = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
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
    images: [],
    status: 'active'
  });

  const steps = ['Basic Info', 'Property Details', 'Pricing & Policies', 'Images', 'Review & Update'];

  const propertyTypes = ['apartment', 'house', 'condo', 'townhouse', 'studio'];
  const parkingOptions = ['none', 'street', 'garage', 'driveway', 'covered'];
  const furnishedOptions = ['unfurnished', 'partially-furnished', 'fully-furnished'];
  const statusOptions = ['active', 'inactive', 'rented', 'maintenance'];
  const commonAmenities = [
    'Parking', 'Gym', 'Pool', 'Laundry', 'Dishwasher', 'Air Conditioning',
    'Balcony', 'Pet Friendly', 'Furnished', 'Internet Included', 'Hardwood Floors',
    'In-unit Washer/Dryer', 'Fireplace', 'Garden', 'Rooftop Access'
  ];

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    try {
      const response = await axios.get(`/properties/${id}`);
      const property = response.data;
      
      // Format the property data for editing
      setPropertyData({
        title: property.title || '',
        description: property.description || '',
        address: property.address || {
          street: '',
          city: '',
          state: '',
          zipCode: ''
        },
        propertyType: property.propertyType || '',
        specifications: property.specifications || {
          bedrooms: 1,
          bathrooms: 1,
          squareFootage: '',
          parking: '',
          furnished: ''
        },
        pricing: property.pricing || {
          rent: '',
          deposit: '',
          applicationFee: '',
          petDeposit: ''
        },
        amenities: property.amenities || [],
        petPolicy: property.petPolicy || {
          allowed: false,
          types: [],
          deposit: '',
          monthlyFee: ''
        },
        availability: property.availability || {
          availableDate: '',
          leaseLength: { min: 12, max: 12, preferred: 12 }
        },
        images: [],
        status: property.status || 'active'
      });

      // Set up image previews for existing images
      if (property.images && property.images.length > 0) {
        const existingPreviews = property.images.map((imagePath, index) => ({
          url: `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${imagePath}`,
          name: `existing-${index}`,
          isExisting: true
        }));
        setImagePreview(existingPreviews);
      }

    } catch (error) {
      console.error('Failed to fetch property:', error);
      setError('Failed to load property data');
    }
    setInitialLoading(false);
  };

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

  const handleAmenitiesToggle = (amenity) => {
    setPropertyData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const generateAIDescription = async () => {
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
      
      if (source === 'openai') {
        setSuccess('AI description generated successfully!');
      } else {
        setSuccess('Description created using smart template!');
      }
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Failed to generate description:', error);
      
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
        const fallbackDescription = createFallbackDescription(propertyData);
        setAiDescription(fallbackDescription);
        setPropertyData(prev => ({
          ...prev,
          description: fallbackDescription
        }));
        
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
    
    let description = `Beautiful ${specifications?.bedrooms || 'multi'}-bedroom ${propertyType || 'property'}`;
    
    if (address?.city) {
      description += ` located in ${address.city}`;
      if (address.state) description += `, ${address.state}`;
    }
    
    description += '. ';
    
    if (specifications?.bathrooms) {
      description += `Features ${specifications.bathrooms} bathroom${specifications.bathrooms > 1 ? 's' : ''}`;
    }
    
    if (specifications?.squareFootage) {
      description += ` with ${specifications.squareFootage} square feet of living space`;
    }
    
    description += '. ';
    
    if (amenities && amenities.length > 0) {
      description += `Amenities include: ${amenities.slice(0, 5).join(', ')}`;
      if (amenities.length > 5) description += ' and more';
      description += '. ';
    }
    
    if (pricing?.rent) {
      description += `Available for $${pricing.rent.toLocaleString()}/month. `;
    }
    
    description += 'Contact us today to schedule a viewing!';
    
    return description;
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024;
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      setError('Some files were skipped. Please upload only images under 5MB.');
      setTimeout(() => setError(''), 3000);
    }

    setUploadingImages(true);

    try {
      const newPreviews = validFiles.map(file => ({
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        isExisting: false
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
    const imageToRemove = imagePreview[index];
    
    if (!imageToRemove.isExisting) {
      URL.revokeObjectURL(imageToRemove.url);
    }
    
    setImagePreview(prev => prev.filter((_, i) => i !== index));
    
    if (!imageToRemove.isExisting) {
      setPropertyData(prev => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index - imagePreview.filter((img, idx) => idx < index && img.isExisting).length)
      }));
    }
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
      
      const { images, ...propertyDataWithoutImages } = propertyData;
      formData.append('propertyData', JSON.stringify(propertyDataWithoutImages));
      
      propertyData.images.forEach((image, index) => {
        formData.append('images', image);
      });
      
      const response = await axios.put(`/properties/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('Property updated successfully!');
      setTimeout(() => {
        navigate('/my-properties');
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update property');
    }
    setLoading(false);
  };

  if (initialLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

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
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
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

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={propertyData.status}
                    onChange={(e) => handleInputChange(null, 'status', e.target.value)}
                    label="Status"
                  >
                    {statusOptions.map(status => (
                      <MenuItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </motion.div>
        );

      // Add other cases similar to AddProperty but with update context
      default:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              Step content coming soon...
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', textAlign: 'center' }}>
          Edit Property
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
              startIcon={<SaveIcon />}
            >
              {loading ? 'Updating Property...' : 'Update Property'}
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

export default EditProperty;
