import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Box,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip
} from '@mui/material';
import { useSnackbar } from 'notistack';
import {
  Favorite as FavoriteIcon,
  LocationOn as LocationIcon,
  Bed as BedIcon,
  Bathtub as BathtubIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../utils/axiosConfig';

const SavedProperties = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSavedProperties();
  }, []);

  const fetchSavedProperties = async () => {
    try {
      setLoading(true);
      console.log('Fetching saved properties...');
      const response = await api.get('/users/saved-properties');
      console.log('Saved properties response:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        console.log('Setting properties from response.data');
        setProperties(response.data);
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        // Handle case where data is nested in response.data.data
        console.log('Setting properties from response.data.data');
        setProperties(response.data.data);
      } else {
        console.error('Unexpected API response format:', response.data);
        setProperties([]);
      }
      
      // Log the first property's AI analysis data if available
      if (response.data && response.data.length > 0) {
        console.log('First property AI analysis:', response.data[0]?.aiAnalysis || 'No AI analysis found');
      }
    } catch (error) {
      console.error('Failed to fetch saved properties:', error);
      let errorMessage = 'Failed to load saved properties. ';
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        if (error.response.status === 401) {
          errorMessage += 'Please log in to view saved properties.';
        } else if (error.response.data && error.response.data.message) {
          errorMessage += error.response.data.message;
        } else {
          errorMessage += 'Please try again later.';
        }
      } else if (error.request) {
        errorMessage += 'No response from server. Please check your connection.';
      } else {
        errorMessage += error.message;
      }
      
      setError(errorMessage);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (propertyId, e) => {
    e.stopPropagation();
    try {
      await api.post(`/properties/${propertyId}/unsave`);
      setProperties(prev => prev.filter(p => p._id !== propertyId));
      enqueueSnackbar('Property removed from saved', { variant: 'success' });
      setError('');
    } catch (error) {
      console.error('Failed to unsave property:', error);
      const errorMessage = error.response?.data?.message || 'Failed to unsave property. Please try again.';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      setError(errorMessage);
    }
  };

  const handlePropertyClick = (propertyId, e) => {
    // Don't navigate if clicking on the unsave button
    if (e.target.closest('button')) return;
    navigate(`/property/${propertyId}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </Container>
    );
  }


  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>
        Saved Properties
      </Typography>

      {properties.length === 0 ? (
        <Alert severity="info">
          You haven't saved any properties yet. Start browsing to save your favorites!
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {properties.map((property) => (
            <Grid 
              item 
              xs={12} 
              sm={6} 
              md={4} 
              key={property._id}
              onClick={(e) => handlePropertyClick(property._id, e)}
              sx={{ cursor: 'pointer' }}
            >
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3
                  }
                }}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={property.images?.[0]?.url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'}
                  alt={property.title}
                />
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
                      ${property.pricing.rent.toLocaleString()}/mo
                    </Typography>
                    <Tooltip title="Remove from saved">
                      <IconButton 
                        onClick={(e) => handleUnsave(property._id, e)}
                        size="small"
                        sx={{ 
                          backgroundColor: 'rgba(255,255,255,0.9)',
                          '&:hover': {
                            backgroundColor: 'rgba(255,255,255,1)'
                          }
                        }}
                      >
                        <FavoriteIcon color="error" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>
                    {property.title}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'text.secondary' }}>
                    <LocationIcon sx={{ fontSize: 16, mr: 0.5 }} />
                    <Typography variant="body2">
                      {property.address?.city}, {property.address?.state}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <BedIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {property.specifications?.bedrooms} bed
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <BathtubIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {property.specifications?.bathrooms} bath
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* AI Cost Analysis Section */}
                  {property.aiCostAnalysis && (
                    <Box sx={{ 
                      mt: 2, 
                      p: 1.5, 
                      bgcolor: 'action.hover', 
                      borderRadius: 1,
                      borderLeft: '3px solid',
                      borderColor: 'primary.main'
                    }}>
                      <Typography variant="subtitle2" color="text.primary" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        AI Market Analysis
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">Est. Fair Rent:</Typography>
                        <Typography variant="caption" fontWeight="bold" color="success.main">
                          ${property.aiCostAnalysis.estimatedRent?.toLocaleString() || 'N/A'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">Market Avg:</Typography>
                        <Typography variant="caption">
                          ${property.aiCostAnalysis.marketAverage?.toLocaleString() || 'N/A'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">Confidence:</Typography>
                        <Typography variant="caption" 
                          color={property.aiCostAnalysis.confidenceScore >= 70 ? 'success.main' : 
                                property.aiCostAnalysis.confidenceScore >= 40 ? 'warning.main' : 'error.main'}>
                          {property.aiCostAnalysis.confidenceScore}%
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default SavedProperties;
