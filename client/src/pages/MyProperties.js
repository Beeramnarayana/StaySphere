import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Box,
  Button,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Analytics as AnalyticsIcon,
  LocationOn as LocationIcon,
  KingBed as BedIcon,
  Bathtub as BathtubIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/axiosConfig';

const MyProperties = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyProperties();
  }, []);

  const fetchMyProperties = async () => {
    try {
      setLoading(true);
      
      // The token is automatically added by the axios interceptor
      const response = await api.get('/properties/my-properties');
      
      console.log('Properties response:', response.data);
      
      if (response.data && response.data.success) {
        setProperties(response.data.data || []);
        setError('');
      } else {
        throw new Error(response.data?.message || 'Failed to load properties');
      }
    } catch (error) {
      console.error('Failed to fetch properties:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      
      if (error.response) {
        // The request was made and the server responded with a status code
        if (error.response.status === 401) {
          setError('Please log in to view your properties');
          // Optionally redirect to login
          // navigate('/login');
        } else if (error.response.status === 403) {
          setError('You do not have permission to view these properties');
        } else if (error.response.data && error.response.data.message) {
          setError(error.response.data.message);
        } else {
          setError('Failed to load properties. Please try again later.');
        }
      } else if (error.request) {
        // The request was made but no response was received
        setError('No response from server. Please check your connection.');
      } else {
        // Something happened in setting up the request
        setError('Error: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event, property) => {
    setAnchorEl(event.currentTarget);
    setSelectedProperty(property);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedProperty(null);
  };

  const handleEditProperty = () => {
    navigate(`/edit-property/${selectedProperty._id}`);
    handleMenuClose();
  };

  const handleDeleteProperty = async () => {
    try {
      await api.delete(`/properties/${selectedProperty._id}`);
      setProperties(prev => prev.filter(p => p._id !== selectedProperty._id));
      setDeleteDialogOpen(false);
      handleMenuClose();
    } catch (error) {
      console.error('Failed to delete property:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.message || 'Failed to delete property');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'rented': return 'info';
      case 'inactive': return 'default';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          My Properties
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/add-property')}
          sx={{ px: 3 }}
        >
          Add New Property
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {properties.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            No properties found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Start by adding your first rental property
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/add-property')}
          >
            Add Your First Property
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {properties.map((property) => (
            <Grid item xs={12} sm={6} md={4} key={property._id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card
                  sx={{
                    height: '100%',
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
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
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Chip
                          label={property.status}
                          color={getStatusColor(property.status)}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, property)}
                        >
                          <MoreIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    
                    <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>
                      {property.title}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'text.secondary' }}>
                      <LocationIcon sx={{ fontSize: 16, mr: 0.5 }} />
                      <Typography variant="body2">
                        {property.address.city}, {property.address.state}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <BedIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {property.specifications.bedrooms} bed
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <BathtubIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {property.specifications.bathrooms} bath
                        </Typography>
                      </Box>
                    </Box>

                    {/* Property Analytics */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" color="primary.main">
                          {property.analytics?.views || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Views
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" color="primary.main">
                          {property.analytics?.saves || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Saves
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" color="primary.main">
                          {property.analytics?.inquiries || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Inquiries
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Property Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          navigate(`/property/${selectedProperty?._id}`);
          handleMenuClose();
        }}>
          <ViewIcon sx={{ mr: 1 }} />
          View Property
        </MenuItem>
        <MenuItem onClick={() => {
          navigate(`/property-analytics/${selectedProperty?._id}`);
          handleMenuClose();
        }}>
          <AnalyticsIcon sx={{ mr: 1 }} />
          View Analytics
        </MenuItem>
        <MenuItem onClick={() => {
          // Navigate to edit property page (to be implemented)
          handleMenuClose();
        }}>
          <EditIcon sx={{ mr: 1 }} />
          Edit Property
        </MenuItem>
        <MenuItem 
          onClick={() => {
            setDeleteDialogOpen(true);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Delete Property
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Property</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedProperty?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteProperty}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MyProperties;
