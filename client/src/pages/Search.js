import React, { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'notistack';
import {
  Container,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  IconButton,
  Pagination,
  Paper,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Drawer,
  useMediaQuery,
  useTheme,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  LocationOn as LocationIcon,
  Bed as BedIcon,
  Bathtub as BathtubIcon,
  Psychology as AIIcon
} from '@mui/icons-material';
import { Snackbar, Alert} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import api from '../utils/axiosConfig';

const Search = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savedProperties, setSavedProperties] = useState(new Set());
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });
  
  const [filters, setFilters] = useState({
    minRent: 500,
    maxRent: 5000,
    bedrooms: '',
    bathrooms: '',
    propertyType: [],
    amenities: [],
    location: { city: '', state: '' }
  });

  const propertyTypes = ['apartment', 'house', 'condo', 'townhouse', 'studio'];
  const commonAmenities = [
    'Parking', 'Gym', 'Pool', 'Laundry', 'Dishwasher', 'Air Conditioning',
    'Balcony', 'Pet Friendly', 'Furnished', 'Internet Included'
  ];

  const fetchProperties = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      // Convert filters to a format the API expects
      const apiFilters = {
        ...filters,
        page,
        limit: 12,
        // Handle location object if it exists
        ...(filters.location?.city && { city: filters.location.city }),
        ...(filters.location?.state && { state: filters.location.state })
      };
      
      // Remove the original location object to avoid sending it as [object Object]
      delete apiFilters.location;
      
      const queryParams = new URLSearchParams(apiFilters).toString();
      
      console.log('Fetching properties with params:', queryParams);
      const response = await api.get(`/properties?${queryParams}`);
      
      console.log('API response:', response.data);
      
      if (response.data && Array.isArray(response.data.data || response.data)) {
        const propertiesData = response.data.data || response.data;
        console.log(`Found ${propertiesData.length} properties`);
        setProperties(propertiesData);
        setPagination(prev => ({
          ...prev,
          current: page,
          pages: response.data.pagination?.totalPages || 1,
          total: response.data.pagination?.totalResults || propertiesData.length
        }));
      } else {
        console.error('Unexpected API response format:', response.data);
        setProperties([]);
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error status:', error.response.status);
      }
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleSearch = useCallback(async (page = 1) => {
    const query = searchQuery.trim();
    console.log('handleSearch called with query:', query, 'page:', page);
    
    if (!query) {
      console.log('No search query, fetching all properties');
      fetchProperties(page);
      return;
    }

    setLoading(true);
    try {
      console.log('Sending search request to /search/natural-search with:', { query, page, limit: 12 });
      const response = await api.post('/search/natural-search', {
        query,
        page,
        limit: 12
      });
      
      console.log('Search response:', response.data);
      
      if (response.data && Array.isArray(response.data.properties)) {
        console.log(`Found ${response.data.properties.length} properties`);
        setProperties(response.data.properties);
        setPagination({
          current: page,
          pages: response.data.pages || 1,
          total: response.data.total || response.data.properties.length
        });
      } else {
        console.error('Unexpected search response format:', response.data);
        setProperties([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      if (error.response) {
        console.error('Error response:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, fetchProperties]);

  // Handle initial load and search query changes
  useEffect(() => {
    console.log('Component mounted or search query changed');
    console.log('Current searchParams:', Object.fromEntries(searchParams.entries()));
    
    const searchQuery = searchParams.get('q');
    console.log('Current search query:', searchQuery);
    
    if (searchQuery) {
      console.log('Initiating search with query:', searchQuery);
      handleSearch(1); // Always start from page 1 on new search
    } else {
      console.log('Fetching all properties...');
      fetchProperties(1); // Always start from page 1 on initial load
    }
    // We're intentionally omitting fetchProperties and handleSearch from the dependency array
    // because they are stable references (memoized with useCallback) and including them
    // would cause an infinite loop. The linter warning can be safely ignored here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  
  // Handle pagination changes separately
  useEffect(() => {
    const currentPage = pagination.current;
    if (currentPage > 1) {
      const searchQuery = searchParams.get('q');
      if (searchQuery) {
        handleSearch(currentPage);
      } else {
        fetchProperties(currentPage);
      }
    }
    // We're intentionally omitting fetchProperties and handleSearch from the dependency array
    // because they are stable references (memoized with useCallback) and including them
    // would cause an infinite loop. The linter warning can be safely ignored here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, searchParams]);
  
  // Fetch saved properties when authentication state changes
  useEffect(() => {
    const fetchSavedProperties = async () => {
    if (!isAuthenticated) {
      console.log('User not authenticated, skipping saved properties fetch');
      return;
    }
    
    try {
      console.log('Fetching saved properties...');
      const response = await api.get('/users/saved-properties');
      
      console.log('Saved properties response:', response.data);
      setSavedProperties(new Set(response.data.map(p => p._id || p)));
      } catch (error) {
        console.error('Failed to fetch saved properties:', error);
        if (error.response) {
          console.error('Error response:', {
            status: error.response.status,
            data: error.response.data
          });
          if (error.response.status === 401) {
            // Token might be expired, log the user out
            localStorage.removeItem('token');
            window.location.href = '/login';
          }
        }
      }
    };
    
    fetchSavedProperties();
  }, [isAuthenticated]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set('q', searchQuery);
      setSearchParams(params);
      handleSearch(1);
    } else {
      params.delete('q');
      setSearchParams(params);
      fetchProperties(1);
    }
  };

  const [savingStates, setSavingStates] = useState({});
  const { enqueueSnackbar } = useSnackbar();

  const handleSaveProperty = async (propertyId, e) => {
    if (e) e.stopPropagation();
    
    if (!isAuthenticated) {
      navigate('/login', { state: { from: window.location.pathname } });
      enqueueSnackbar('Please log in to save properties', { variant: 'info' });
      return;
    }

    const isCurrentlySaved = savedProperties.has(propertyId);
    const endpoint = isCurrentlySaved ? 'unsave' : 'save';
    
    // Set loading state for this property
    setSavingStates(prev => ({
      ...prev,
      [propertyId]: { loading: true, error: null }
    }));
    
    try {
      const response = await api.post(`/properties/${propertyId}/${endpoint}`);
      
      // Update local state optimistically
      if (isCurrentlySaved) {
        setSavedProperties(prev => {
          const newSet = new Set(prev);
          newSet.delete(propertyId);
          return newSet;
        });
      } else {
        setSavedProperties(prev => new Set([...prev, propertyId]));
      }
      
      // Update the property in the search results
      setProperties(prevProperties => 
        prevProperties.map(property => 
          property._id === propertyId
            ? {
                ...property,
                analytics: {
                  ...(property.analytics || {}),
                  saves: response.data?.savesCount !== undefined 
                    ? response.data.savesCount 
                    : isCurrentlySaved 
                      ? Math.max(0, (property.analytics?.saves || 1) - 1)
                      : (property.analytics?.saves || 0) + 1
                }
              }
            : property
        )
      );
      
      // Show success message
      enqueueSnackbar(
        response.data?.message || 
        (isCurrentlySaved ? 'Property removed from saved' : 'Property saved successfully'),
        { 
          variant: 'success',
          autoHideDuration: 3000
        }
      );
      
      return true;
      
    } catch (error) {
      console.error(`Failed to ${endpoint} property:`, error);
      
      // Revert optimistic update
      if (isCurrentlySaved) {
        setSavedProperties(prev => new Set([...prev, propertyId]));
      } else {
        setSavedProperties(prev => {
          const newSet = new Set(prev);
          newSet.delete(propertyId);
          return newSet;
        });
      }
      
      let errorMessage = `Failed to ${endpoint} property. `;
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Your session has expired. Please log in again.';
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
      
      enqueueSnackbar(errorMessage, { 
        variant: 'error',
        autoHideDuration: 5000
      });
      
      return false;
      
    } finally {
      // Clear loading state
      setSavingStates(prev => ({
        ...prev,
        [propertyId]: { loading: false, error: null }
      }));
    }
  };

  const toggleArrayFilter = (category, item) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(item)
        ? prev[category].filter(i => i !== item)
        : [...prev[category], item]
    }));
  };

  const applyFilters = () => {
    fetchProperties(1);
    setFilterDrawerOpen(false);
  };

  const FilterContent = () => (
    <Box sx={{ p: 3, width: isMobile ? '100vw' : 350 }}>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
        Filters
      </Typography>

      {/* Price Range */}
      <Box sx={{ mb: 3 }}>
        <Typography gutterBottom>
          Price Range: ${filters.minRent} - ${filters.maxRent}
        </Typography>
        <Slider
          value={[filters.minRent, filters.maxRent]}
          onChange={(e, newValue) => {
            setFilters(prev => ({
              ...prev,
              minRent: newValue[0],
              maxRent: newValue[1]
            }));
          }}
          valueLabelDisplay="auto"
          min={500}
          max={8000}
          step={100}
        />
      </Box>

      {/* Bedrooms */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Bedrooms</InputLabel>
        <Select
          value={filters.bedrooms}
          onChange={(e) => setFilters(prev => ({ ...prev, bedrooms: e.target.value }))}
          label="Bedrooms"
        >
          <MenuItem value="">Any</MenuItem>
          <MenuItem value={0}>Studio</MenuItem>
          <MenuItem value={1}>1+</MenuItem>
          <MenuItem value={2}>2+</MenuItem>
          <MenuItem value={3}>3+</MenuItem>
          <MenuItem value={4}>4+</MenuItem>
        </Select>
      </FormControl>

      {/* Property Types */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>Property Type</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {propertyTypes.map(type => (
            <Chip
              key={type}
              label={type.charAt(0).toUpperCase() + type.slice(1)}
              onClick={() => toggleArrayFilter('propertyType', type)}
              color={filters.propertyType.includes(type) ? 'primary' : 'default'}
              variant={filters.propertyType.includes(type) ? 'filled' : 'outlined'}
              size="small"
            />
          ))}
        </Box>
      </Box>

      {/* Amenities */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>Amenities</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {commonAmenities.map(amenity => (
            <Chip
              key={amenity}
              label={amenity}
              onClick={() => toggleArrayFilter('amenities', amenity)}
              color={filters.amenities.includes(amenity) ? 'primary' : 'default'}
              variant={filters.amenities.includes(amenity) ? 'filled' : 'outlined'}
              size="small"
            />
          ))}
        </Box>
      </Box>

      <Button
        fullWidth
        variant="contained"
        onClick={applyFilters}
        sx={{ mt: 2 }}
      >
        Apply Filters
      </Button>
    </Box>
  );

  const PropertyCard = ({ property }) => {
    const isSaved = savedProperties.has(property._id);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card
          sx={{
            height: '100%',
            cursor: 'pointer',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
            }
          }}
          onClick={() => navigate(`/property/${property._id}`)}
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
              <IconButton
                onClick={(e) => handleSaveProperty(property._id, e)}
                size="small"
                color={isSaved ? 'error' : 'default'}
              >
                {isSaved ? (
                  <FavoriteIcon />
                ) : (
                  <FavoriteBorderIcon />
                )}
              </IconButton>
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
            
            {property.personalizedScore && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AIIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                <Typography variant="body2" color="primary.main">
                  {property.personalizedScore}% match
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Search Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box component="form" onSubmit={handleSearchSubmit} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Use natural language: '2 bedroom apartment near downtown with parking'"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AIIcon color="primary" />
                </InputAdornment>
              )
            }}
          />
          <Button type="submit" variant="contained" startIcon={<SearchIcon />}>
            Search
          </Button>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setFilterDrawerOpen(true)}
          >
            Filters
          </Button>
        </Box>
      </Paper>

      {/* Results */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          {searchQuery ? `Search Results for "${searchQuery}"` : 'Available Properties'}
        </Typography>
        <Typography color="text.secondary">
          {pagination.total} properties found
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {properties.map((property) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={property._id}>
                <PropertyCard property={property} />
              </Grid>
            ))}
          </Grid>

          {properties.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary">
                No properties found matching your criteria
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Try adjusting your search or filters
              </Typography>
            </Box>
          )}

          {pagination.pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={pagination.pages}
                page={pagination.current}
                onChange={(e, page) => {
                  if (searchQuery) {
                    handleSearch(page);
                  } else {
                    fetchProperties(page);
                  }
                }}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Filter Drawer */}
      <Drawer
        anchor="right"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
      >
        <FilterContent />
      </Drawer>
      
      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity="success"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Search;

