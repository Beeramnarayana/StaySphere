import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Chip,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Home,
  LocationOn,
  AttachMoney,
  Analytics,
  Insights,
  CompareArrows
} from '@mui/icons-material';
import axios from 'axios';

const MarketAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [marketData, setMarketData] = useState(null);
  const [comparables, setComparables] = useState([]);
  const [searchParams, setSearchParams] = useState({
    city: '',
    state: '',
    bedrooms: '',
    propertyType: ''
  });
  const [error, setError] = useState('');

  const propertyTypes = ['apartment', 'house', 'condo', 'townhouse', 'loft'];
  const states = ['NY', 'CA', 'TX', 'FL', 'IL', 'WA', 'MA', 'CO', 'OR', 'NC'];

  const handleSearch = async () => {
    if (!searchParams.city || !searchParams.state) {
      setError('Please enter both city and state');
      return;
    }

    setLoading(true);
    setError('');
    setMarketData(null);
    setComparables([]);

    try {
      // Get market analysis
      const marketResponse = await axios.get('/api/search/market-analysis', {
        params: searchParams
      });
      
      // Check if response contains valid data
      if (marketResponse.data && typeof marketResponse.data === 'object' && 
          !marketResponse.data.type && !marketResponse.data.message) {
        setMarketData(marketResponse.data);
      } else {
        throw new Error('Invalid market data format received');
      }

      // Get comparable properties
      const comparablesResponse = await axios.get('/api/search/comparables', {
        params: searchParams
      });
      
      if (comparablesResponse.data && Array.isArray(comparablesResponse.data.comparables)) {
        setComparables(comparablesResponse.data.comparables);
      }

    } catch (error) {
      console.error('Market analysis error:', error);
      let errorMessage = 'An error occurred while processing your request.';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const errorData = error.response.data;
        if (typeof errorData === 'object' && errorData !== null) {
          errorMessage = errorData.message || JSON.stringify(errorData);
        } else {
          errorMessage = String(errorData || errorMessage);
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'No response from server. Please check your connection and try again.';
      } else if (error.message) {
        // Something happened in setting up the request that triggered an Error
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTrendIcon = (trend) => {
    if (trend > 0.05) return <TrendingUp color="success" />;
    if (trend < -0.02) return <TrendingDown color="error" />;
    return <CompareArrows color="primary" />;
  };

  const getTrendColor = (trend) => {
    if (trend > 0.05) return 'success';
    if (trend < -0.02) return 'error';
    return 'primary';
  };

  const getDemandLevel = (score) => {
    if (score > 8) return { label: 'High', color: 'error' };
    if (score > 6) return { label: 'Moderate', color: 'warning' };
    return { label: 'Low', color: 'success' };
  };

  const getInventoryColor = (inventory) => {
    switch (inventory) {
      case 'very-low':
      case 'low':
        return 'error';
      case 'moderate':
        return 'warning';
      default:
        return 'success';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Analytics color="primary" />
        Market Analysis
      </Typography>

      {/* Search Form */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Search Market Data
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="City"
                value={searchParams.city}
                onChange={(e) => setSearchParams({ ...searchParams, city: e.target.value })}
                placeholder="e.g., New York"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>State</InputLabel>
                <Select
                  value={searchParams.state}
                  onChange={(e) => setSearchParams({ ...searchParams, state: e.target.value })}
                >
                  {states.map(state => (
                    <MenuItem key={state} value={state}>{state}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Bedrooms</InputLabel>
                <Select
                  value={searchParams.bedrooms}
                  onChange={(e) => setSearchParams({ ...searchParams, bedrooms: e.target.value })}
                >
                  <MenuItem value="">Any</MenuItem>
                  <MenuItem value="0">Studio</MenuItem>
                  <MenuItem value="1">1 BR</MenuItem>
                  <MenuItem value="2">2 BR</MenuItem>
                  <MenuItem value="3">3 BR</MenuItem>
                  <MenuItem value="4">4+ BR</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Property Type</InputLabel>
                <Select
                  value={searchParams.propertyType}
                  onChange={(e) => setSearchParams({ ...searchParams, propertyType: e.target.value })}
                >
                  <MenuItem value="">Any</MenuItem>
                  {propertyTypes.map(type => (
                    <MenuItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleSearch}
                disabled={loading}
                sx={{ height: 56 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Analyze'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {typeof error === 'string' 
            ? error 
            : error?.message || 'An error occurred. Please try again.'}
        </Alert>
      )}

      {marketData && !error && (
        <>
          {/* Market Overview */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOn color="primary" />
                    Market Overview - {marketData.location.city}, {marketData.location.state}
                  </Typography>
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Market Health Score
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={marketData.marketInsights.marketHealth}
                        sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="body2" fontWeight="bold">
                        {marketData.marketInsights.marketHealth}/100
                      </Typography>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Market Trend
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getTrendIcon(marketData.marketData.marketTrend)}
                          <Typography variant="h6" color={getTrendColor(marketData.marketData.marketTrend)}>
                            {(marketData.marketData.marketTrend * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Demand Level
                        </Typography>
                        {(() => {
                          const demand = getDemandLevel(marketData.marketData.demandScore);
                          return (
                            <Chip
                              label={demand.label}
                              color={demand.color}
                              size="small"
                            />
                          );
                        })()}
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Inventory
                        </Typography>
                        <Chip
                          label={marketData.marketData.inventory.replace('-', ' ')}
                          color={getInventoryColor(marketData.marketData.inventory)}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Price/Sq Ft
                        </Typography>
                        <Typography variant="h6">
                          ${marketData.marketData.pricePerSqFt.toFixed(2)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AttachMoney color="primary" />
                    Average Rent by Bedroom
                  </Typography>
                  
                  <Box sx={{ mt: 2 }}>
                    {Object.entries(marketData.marketData.averageRents).map(([bedrooms, rent]) => (
                      <Box key={bedrooms} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">
                          {bedrooms === 'studio' ? 'Studio' : `${bedrooms.replace('bed', '')} Bedroom`}
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(rent)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Market Insights */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Insights color="primary" />
                    Market Insights
                  </Typography>
                  
                  <List dense>
                    {marketData.marketInsights.recommendations.map((recommendation, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemText
                          primary={recommendation}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Market Statistics
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Average Rent
                      </Typography>
                      <Typography variant="h6">
                        {formatCurrency(marketData.marketStats.averageRent)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Median Rent
                      </Typography>
                      <Typography variant="h6">
                        {formatCurrency(marketData.marketStats.medianRent)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Price Range
                      </Typography>
                      <Typography variant="body2">
                        {formatCurrency(marketData.marketStats.minRent)} - {formatCurrency(marketData.marketStats.maxRent)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Total Properties
                      </Typography>
                      <Typography variant="h6">
                        {marketData.marketStats.totalProperties}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Comparable Properties */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Home color="primary" />
                Comparable Properties ({comparables.length})
              </Typography>
              
              <Grid container spacing={3}>
                {(function() {
                  const validProperties = comparables
                    .filter(property => {
                      // Skip properties with invalid coordinates
                      const hasValidCoords = 
                        property.location?.coordinates && 
                        Array.isArray(property.location.coordinates) &&
                        property.location.coordinates.length === 2 &&
                        typeof property.location.coordinates[0] === 'number' &&
                        typeof property.location.coordinates[1] === 'number';
                      
                      if (!hasValidCoords) {
                        console.warn(`Skipping property ${property.title || property._id || 'unknown'}: Invalid coordinate values`);
                        return false;
                      }
                      return true;
                    })
                    .slice(0, 6);
                  
                  if (validProperties.length === 0) {
                    return (
                      <Grid item xs={12} key="no-properties">
                        <Alert severity="info">
                          No valid properties found with location data. Please try a different search area.
                        </Alert>
                      </Grid>
                    );
                  }
                  
                  return validProperties.map((property, index) => (
                    <Grid item xs={12} sm={6} md={4} key={property._id || index}>
                      <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                            {typeof property.title === 'string' || typeof property.title === 'number' 
                              ? property.title 
                              : 'Property Title'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {typeof property.address?.street === 'string' ? property.address.street : 'Address'}
                            {property.address?.neighborhood && `, ${property.address.neighborhood}`}
                          </Typography>
                          
                          <Divider sx={{ my: 2 }} />
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                            <Typography variant="body2">Rent:</Typography>
                            <Typography variant="body2" fontWeight="bold" color="primary">
                              {typeof property.pricing?.rent === 'number' 
                                ? `${formatCurrency(property.pricing.rent)}/mo`
                                : 'N/A'}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                            <Typography variant="body2">Bed/Bath:</Typography>
                            <Typography variant="body2">
                              {typeof property.specifications?.bedrooms === 'number' 
                                ? property.specifications.bedrooms 
                                : '?'} BR / 
                              {typeof property.specifications?.bathrooms === 'number' 
                                ? property.specifications.bathrooms 
                                : '?'} BA
                            </Typography>
                          </Box>
                          
                          {property.specifications?.squareFootage && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2">Size:</Typography>
                              <Typography variant="body2">
                                {typeof property.specifications.squareFootage === 'number'
                                  ? `${property.specifications.squareFootage.toLocaleString()} sq ft`
                                  : 'N/A'}
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ));
                })()}
              </Grid>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default MarketAnalysis;
