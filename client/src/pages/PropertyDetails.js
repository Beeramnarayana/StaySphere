import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Divider,
  IconButton,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert,
  Rating,
  Tab,
  Tabs,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Badge,
  Snackbar,
  Tooltip
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  LocationOn as LocationIcon,
  Bed as BedIcon,
  Bathtub as BathtubIcon,
  SquareFoot as SquareFootIcon,
  Psychology as AIIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Send as SendIcon,
  InfoOutlined as InfoOutlinedIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import api from '../utils/axiosConfig';
import { useSnackbar } from 'notistack';
import PropertyImageGallery from '../components/PropertyImageGallery';
import PropertyLocationMap from '../components/PropertyLocationMap';

const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  // Removed unused state
  const [costAnalysis, setCostAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [contactLoading, setContactLoading] = useState(false);

  const { enqueueSnackbar } = useSnackbar();

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      console.log(`[${new Date().toISOString()}] [${id}] Fetching property details`);
      
      if (!id || id.length !== 24) {
        const errorMsg = 'Invalid property ID format';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      let propertyRes, savedRes, costAnalysisRes;
      
      try {
        // Validate property ID format first
        if (!/^[0-9a-fA-F]{24}$/.test(id)) {
          throw new Error('Invalid property ID format');
        }

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 15000)
        );

        // Fetch property details with a timeout
        const propertyPromise = Promise.race([
          api.get(`/properties/${id}`),
          timeoutPromise
        ]);
        
        // Only fetch saved properties if authenticated
        const savedPromise = isAuthenticated 
          ? Promise.race([
              api.get('/users/saved-properties'),
              new Promise(resolve => setTimeout(() => resolve({ data: [] }), 5000))
            ])
            .then(res => ({
              data: Array.isArray(res.data) ? res.data : (res.data?.data || []),
              status: 'fulfilled'
            }))
            .catch(err => {
              console.error('Error fetching saved properties:', err);
              return { data: [], status: 'rejected' };
            })
          : Promise.resolve({ data: [], status: 'fulfilled' });
        
        // Fetch cost analysis if authenticated
        const costAnalysisPromise = isAuthenticated
          ? Promise.race([
              api.get(`/ai/cost-analysis/${id}`),
              new Promise(resolve => setTimeout(() => resolve({ data: null }), 8000))
            ])
            .then(res => ({ data: res?.data || null, status: 'fulfilled' }))
            .catch(err => {
              console.error('Error fetching cost analysis:', err);
              return { data: null, status: 'rejected' };
            })
          : Promise.resolve({ data: null, status: 'rejected' });
          
        [propertyRes, savedRes, costAnalysisRes] = await Promise.allSettled([
          propertyPromise,
          savedPromise,
          costAnalysisPromise
        ]);
        
        // Set cost analysis if available
        if (costAnalysisRes.status === 'fulfilled' && costAnalysisRes.value?.data) {
          setCostAnalysis(costAnalysisRes.value.data);
        }
        
      } catch (networkError) {
        console.error('Network error:', networkError);
        const errorMsg = networkError.message === 'Request timeout' 
          ? 'Request timed out. Please check your connection and try again.'
          : 'Network error. Please check your connection and try again.';
        throw new Error(errorMsg);
      }
      
      // Handle property response
      let propertyData;
      if (propertyRes.status === 'fulfilled' && propertyRes.value?.data) {
        propertyData = propertyRes.value.data;
      } else {
        const error = propertyRes?.reason || new Error('Failed to load property details');
        console.error('Error fetching property:', error);
        const errorMsg = error.response?.data?.message || 
                        error.message || 
                        'Failed to load property details. The property may not exist or you may not have permission to view it.';
        throw new Error(errorMsg);
      }
      
      if (!propertyData) {
        throw new Error('No property data received from server');
      }
      
      // Log the property data structure for debugging
      console.log('Property data structure:', JSON.stringify(propertyData, null, 2));
      
      // Check if the property is active
      if (propertyData.status !== 'active' && (!user || user._id !== propertyData.landlord?._id)) {
        throw new Error('This property is not available or has been removed');
      }
      
      // Ensure location and address data exists with proper defaults
      const propertyWithLocation = {
        ...propertyData,
        address: {
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
          coordinates: [0, 0],
          ...propertyData.address
        },
        location: propertyData.location || {
          type: 'Point',
          coordinates: propertyData.address?.coordinates?.coordinates || 
                     propertyData.address?.coordinates || 
                     [0, 0]
        },
        specifications: {
          bedrooms: 1,
          bathrooms: 1,
          squareFootage: 0,
          ...propertyData.specifications
        },
        pricing: {
          rent: 0,
          deposit: 0,
          utilities: 0,
          ...propertyData.pricing
        },
        amenities: Array.isArray(propertyData.amenities) ? propertyData.amenities : []
      };
      
      setProperty(propertyWithLocation);
      
      if (isAuthenticated) {
        try {
          console.log('Fetching cost analysis...');
          
          // Check if property is in saved list
          if (savedRes.data && savedRes.data.length > 0) {
            const isSaved = savedRes.data.some(p => p._id === id);
            setSaved(isSaved);
          }
          
          if (isAuthenticated && propertyData.landlord?._id === user?.id) {
            try {
              const analysisRes = await api.get(`/properties/${id}/cost-analysis`);
              if (analysisRes.data) {
                console.log('Received cost analysis:', analysisRes.data);
                setCostAnalysis({
                  ...analysisRes.data,
                  isFallback: false
                });
              }
            } catch (analysisError) {
              console.warn('Cost analysis not available:', analysisError.message);
              // Continue to generate fallback data
            }
          }
          
          // Generate fallback cost analysis if not already set
          if (!costAnalysis && propertyData.pricing) {
            const defaultAnalysis = {
              estimatedValue: Math.round(propertyData.pricing.rent * 150),
              monthlyExpenses: {
                maintenance: Math.round(propertyData.pricing.rent * 0.1),
                propertyTax: Math.round(propertyData.pricing.rent * 0.15),
                insurance: Math.round(propertyData.pricing.rent * 0.05),
                hoa: propertyData.amenities?.includes('HOA') ? Math.round(propertyData.pricing.rent * 0.1) : 0,
                other: 0,
                total: Math.round(propertyData.pricing.rent * 0.3)
              },
              roi: (Math.random() * 8 + 2).toFixed(2),
              cashFlow: {
                monthly: Math.round(propertyData.pricing.rent * 0.7),
                annual: Math.round(propertyData.pricing.rent * 0.7 * 12)
              },
              lastUpdated: new Date().toISOString(),
              isFallback: true
            };
            setCostAnalysis(defaultAnalysis);
          }
        } catch (error) {
          console.error('Error in secondary data fetch:', error);
          // Don't show error to user for secondary data
        }
      }
      
    } catch (error) {
      console.error('Error in fetchAllData:', error);
      const errorMessage = error.message || 'Failed to load property data. Please try again later.';
      setError(errorMessage);
      
      // Only show error message if it's not a 404 (handled by the UI)
      if (!error.message.includes('not found') && !error.message.includes('Invalid property ID')) {
        enqueueSnackbar(errorMessage, { 
          variant: 'error',
          autoHideDuration: 5000,
          preventDuplicate: true
        });
      }
    } finally {
      setLoading(false);
    }
  }, [id, isAuthenticated, enqueueSnackbar]);

  useEffect(() => {
    setLoading(true);
    fetchAllData();
  }, [fetchAllData]);


  const handleImagesUpdate = (updatedImages) => {
    setProperty(prev => ({
      ...prev,
      images: updatedImages
    }));
    enqueueSnackbar('Images updated successfully', { variant: 'success' });
  };

  const handleLocationUpdate = (updatedLocation) => {
    setProperty(prev => ({
      ...prev,
      location: updatedLocation
    }));
    enqueueSnackbar('Location updated successfully', { variant: 'success' });
  };

  // Removed unused getConfig function

  const handleSaveProperty = useCallback(async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/property/${id}` } });
      enqueueSnackbar('Please log in to save properties', { variant: 'info' });
      return;
    }

    // Validate property ID
    if (!id || id.length < 10) {
      console.error('Invalid property ID:', id);
      enqueueSnackbar('Invalid property. Please refresh the page and try again.', { variant: 'error' });
      return;
    }

    try {
      const endpoint = saved ? 'unsave' : 'save';
      const response = await api.post(`/properties/${id}/${endpoint}`);
      
      setSaved(!saved);
      enqueueSnackbar(
        response.data?.message || `Property ${endpoint}d successfully`, 
        { variant: 'success' }
      );
      
      // Update the property's save count and fetch fresh data
      if (property) {
        // Optimistically update the UI
        setProperty(prev => ({
          ...prev,
          analytics: {
            ...prev.analytics,
            saves: !saved 
              ? (prev.analytics?.saves || 0) + 1 
              : Math.max(0, (prev.analytics?.saves || 1) - 1)
          }
        }));
        
        // Fetch fresh property data to ensure consistency
        try {
          const freshProperty = await api.get(`/properties/${id}`);
          setProperty(freshProperty.data);
        } catch (err) {
          console.error('Error refreshing property data:', err);
        }
      }
    } catch (error) {
      console.error(`Error ${saved ? 'unsaving' : 'saving'} property:`, error);
      
      let errorMessage = `Failed to ${saved ? 'unsave' : 'save'} property. `;
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Your session has expired. Please log in again.';
          // Clear any invalid token
          localStorage.removeItem('token');
          navigate('/login', { state: { from: window.location.pathname } });
        } else if (error.response.data?.message) {
          errorMessage += error.response.data.message;
        } else {
          errorMessage += 'Please try again later.';
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage += error.message;
      }
      
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  }, [id, isAuthenticated, navigate, enqueueSnackbar, saved, property]);

  const handleContactLandlord = useCallback(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/property/${id}` } });
      return;
    }
    if (property?.address) {
      setContactMessage(`Hi, I'm interested in your property at ${property.address.street}, ${property.address.city}. Could you please provide more information?`);
    }
    setContactModalOpen(true);
  }, [isAuthenticated, navigate, id, property?.address]);

  const handleSendMessage = async () => {
    if (!contactMessage.trim()) {
      enqueueSnackbar('Please enter a message', { variant: 'warning' });
      return;
    }

    setContactLoading(true);
    try {
      // Get the current user's info
      const user = JSON.parse(localStorage.getItem('user'));
      
      await api.post('/properties/contact', {
        propertyId: id,
        name: user?.name || 'Guest User',
        email: user?.email || '',
        phone: user?.profile?.phone || '',
        message: contactMessage
      });
      
      setContactModalOpen(false);
      setContactMessage('');
      enqueueSnackbar('Message sent successfully! The landlord will contact you soon.', {
        variant: 'success'
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      enqueueSnackbar(error.response?.data?.message || 'Failed to send message. Please try again.', {
        variant: 'error'
      });
    } finally {
      setContactLoading(false);
    }
  };

  const handlePhoneCall = () => {
    if (property.landlord.profile?.phone) {
      window.open(`tel:${property.landlord.profile.phone}`);
    }
  };

  const handleEmailContact = () => {
    if (property.landlord.email) {
      const subject = encodeURIComponent(`Inquiry about property at ${property.address.street}`);
      const body = encodeURIComponent(`Hi, I'm interested in your property at ${property.address.street}, ${property.address.city}. Could you please provide more information?`);
      window.open(`mailto:${property.landlord.email}?subject=${subject}&body=${body}`);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !property) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ color: 'error.main', mb: 2, p: 1, bgcolor: 'error.light', borderRadius: 1 }}>
          {error || 'Property not found'}
        </Box>
      </Container>
    );
  }

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <Grid container spacing={4}>
          {/* Property Images */}
          <Grid item xs={12} sm={6}>
            <PropertyImageGallery
              propertyId={property._id}
              images={property.images || []}
              isOwner={isAuthenticated && property.landlord?._id === user?.id}
              onUpdate={handleImagesUpdate}
            />

            {/* Property Info */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {property.title}
                </Typography>
                <IconButton onClick={handleSaveProperty} size="large">
                  {saved ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="h6" color="text.secondary">
                  {property.address.street}, {property.address.city}, {property.address.state} {property.address.zipCode}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <BedIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="h6">
                    {property.specifications.bedrooms} Bedrooms
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <BathtubIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="h6">
                    {property.specifications.bathrooms} Bathrooms
                  </Typography>
                </Box>
                {property.specifications.squareFootage && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <SquareFootIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="h6">
                      {property.specifications.squareFootage} sq ft
                    </Typography>
                  </Box>
                )}
              </Box>

              <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.6 }}>
                {property.description}
              </Typography>

              {/* Amenities */}
              {property.amenities && property.amenities.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Amenities
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {property.amenities.map((amenity, index) => (
                      <Chip key={index} label={amenity} variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} sm={6}>
            {/* Pricing Card */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 2 }}>
                  ${property.pricing.rent.toLocaleString()}/month
                </Typography>
                
                {property.pricing.deposit && (
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    Deposit: ${property.pricing.deposit.toLocaleString()}
                  </Typography>
                )}
                
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{ mt: 2 }}
                  onClick={handleContactLandlord}
                  startIcon={<SendIcon />}
                >
                  Contact Landlord
                </Button>
              </CardContent>
            </Card>

            {/* Landlord Info */}
            {property.landlord && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Landlord Information
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    {property.landlord.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <EmailIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography 
                      variant="body2" 
                      color="primary" 
                      sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={handleEmailContact}
                    >
                      {property.landlord.email}
                    </Typography>
                  </Box>
                  {property.landlord.profile?.phone && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PhoneIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                      <Typography 
                        variant="body2" 
                        color="primary" 
                        sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={handlePhoneCall}
                      >
                        {property.landlord.profile.phone}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Property Location */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <PropertyLocationMap
              propertyId={property._id}
              initialLocation={property.location?.coordinates ? {
                lat: property.location.coordinates[1],
                lng: property.location.coordinates[0]
              } : null}
              isOwner={isAuthenticated && property.landlord?._id === user?.id}
              onLocationUpdate={handleLocationUpdate}
              address={`${property.address.street}, ${property.address.city}, ${property.address.state} ${property.address.zipCode}`}
            />
          </Grid>

          {/* AI Cost Analysis */}
          {costAnalysis && (
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AIIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {costAnalysis.isFallback ? 'Estimated' : 'AI'} Cost Analysis
                    </Typography>
                    {costAnalysis.isFallback && (
                      <Tooltip title="This is an estimate. Sign in as the property owner to see detailed analysis." arrow>
                        <InfoOutlinedIcon fontSize="small" color="action" sx={{ ml: 1 }} />
                      </Tooltip>
                    )}
                  </Box>
                  
                  {costAnalysis.isFallback && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Showing estimated costs. Sign in as the property owner for detailed analysis.
                    </Alert>
                  )}
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {costAnalysis.isFallback ? 'Estimated ' : ''}Total Monthly Cost
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      ₹{costAnalysis.totalMonthlyCost?.toLocaleString()}
                    </Typography>
                    {costAnalysis.marketComparison?.competitiveness && (
                      <Chip 
                        label={`${costAnalysis.marketComparison.competitiveness} price`}
                        color={
                          costAnalysis.marketComparison.competitiveness === 'high' ? 'error' :
                          costAnalysis.marketComparison.competitiveness === 'low' ? 'success' : 'default'
                        }
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                      Cost Breakdown
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Base Rent</Typography>
                      <Typography variant="body2">₹{costAnalysis.rent?.toLocaleString()}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Utilities (est.)</Typography>
                      <Typography variant="body2">₹{costAnalysis.utilities?.toLocaleString()}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Security Deposit</Typography>
                      <Typography variant="body2">₹{costAnalysis.deposit?.toLocaleString()}</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                      Market Comparison
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">Avg. in {property?.address?.city || 'area'}:</Typography>
                      <Typography variant="body2">₹{costAnalysis.marketComparison?.averageRent?.toLocaleString() || 'N/A'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Price per sq.ft:</Typography>
                      <Typography variant="body2">₹{costAnalysis.marketComparison?.pricePerSqFt?.toFixed(2) || 'N/A'}</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Yearly Total:</strong> ₹{costAnalysis.yearlyProjection?.toLocaleString()}
                    </Typography>
                    {costAnalysis.recommendations && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Tip:</strong> {costAnalysis.recommendations[0]}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      </motion.div>

      {/* Contact Modal */}
      <Dialog 
        open={contactModalOpen} 
        onClose={() => setContactModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Contact Landlord
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Send a message to {property?.landlord?.name} about this property
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Your Message"
            value={contactMessage}
            onChange={(e) => setContactMessage(e.target.value)}
            placeholder="Hi, I'm interested in your property..."
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setContactModalOpen(false)}
            disabled={contactLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSendMessage}
            variant="contained"
            disabled={contactLoading || !contactMessage.trim()}
            startIcon={contactLoading ? <CircularProgress size={16} /> : <SendIcon />}
          >
            {contactLoading ? 'Sending...' : 'Send Message'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
    </>
  );
};

export default PropertyDetails;
