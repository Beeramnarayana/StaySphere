import React, { useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Paper
} from '@mui/material';
import {
  Psychology as AIIcon,
  AttachMoney as PricingIcon,
  Description as DescriptionIcon,
  TrendingUp as TrendIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import axios from 'axios';

const AITools = () => {
  const [activeTab, setActiveTab] = useState('pricing');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  
  // Pricing Analysis State
  const [pricingData, setPricingData] = useState({
    propertyType: '',
    bedrooms: '',
    bathrooms: '',
    squareFootage: '',
    city: '',
    state: '',
    amenities: []
  });

  // Description Generation State
  const [descriptionData, setDescriptionData] = useState({
    propertyType: '',
    bedrooms: '',
    bathrooms: '',
    city: '',
    rent: '',
    amenities: [],
    specialFeatures: ''
  });

  // Market Analysis State
  const [marketData, setMarketData] = useState({
    city: '',
    state: '',
    propertyType: '',
    priceRange: ''
  });

  const commonAmenities = [
    'parking', 'gym', 'pool', 'laundry', 'balcony', 'dishwasher',
    'air-conditioning', 'heating', 'pet-friendly', 'furnished'
  ];

  const handleAmenitiesToggle = (amenity, dataType) => {
    if (dataType === 'pricing') {
      setPricingData(prev => ({
        ...prev,
        amenities: prev.amenities.includes(amenity)
          ? prev.amenities.filter(a => a !== amenity)
          : [...prev.amenities, amenity]
      }));
    } else if (dataType === 'description') {
      setDescriptionData(prev => ({
        ...prev,
        amenities: prev.amenities.includes(amenity)
          ? prev.amenities.filter(a => a !== amenity)
          : [...prev.amenities, amenity]
      }));
    }
  };

  const generatePricingAnalysis = async () => {
    setLoading(true);
    setError('');
    setResult('');

    try {
      const response = await axios.post('/ai/pricing-analysis', {
        propertyData: pricingData
      });
      
      setResult(response.data.analysis);
    } catch (error) {
      console.error('Pricing analysis error:', error);
      setError('Failed to generate pricing analysis. Please try again.');
    }
    setLoading(false);
  };

  const generateDescription = async () => {
    setLoading(true);
    setError('');
    setResult('');

    try {
      const response = await axios.post('/ai/generate-description', {
        propertyData: {
          propertyType: descriptionData.propertyType,
          specifications: {
            bedrooms: descriptionData.bedrooms,
            bathrooms: descriptionData.bathrooms
          },
          address: {
            city: descriptionData.city
          },
          pricing: {
            rent: descriptionData.rent
          },
          amenities: descriptionData.amenities
        }
      });
      
      setResult(response.data.description);
    } catch (error) {
      console.error('Description generation error:', error);
      setError('Failed to generate description. Please try again.');
    }
    setLoading(false);
  };

  const generateMarketAnalysis = async () => {
    setLoading(true);
    setError('');
    setResult('');

    try {
      // Mock market analysis for now
      const analysis = `Market Analysis for ${marketData.city}, ${marketData.state}:

📊 Current Market Trends:
• Average rent for ${marketData.propertyType}: $2,400 - $3,200/month
• Market demand: High (85% occupancy rate)
• Price trend: +8% year-over-year growth

🎯 Pricing Recommendations:
• Competitive range: $2,600 - $2,900/month
• Premium positioning: $3,000 - $3,200/month
• Budget-friendly: $2,200 - $2,500/month

🏆 Key Success Factors:
• Properties with parking rent 15% higher
• Pet-friendly units have 25% faster turnover
• Updated kitchens command 10% premium

💡 AI Insights:
• Best listing time: Tuesday-Thursday
• Optimal lease start: 1st or 15th of month
• High-demand amenities: In-unit laundry, parking, gym access`;

      setResult(analysis);
    } catch (error) {
      console.error('Market analysis error:', error);
      setError('Failed to generate market analysis. Please try again.');
    }
    setLoading(false);
  };

  const renderPricingTool = () => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <PricingIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6">AI Pricing Analysis</Typography>
        </Box>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Property Type"
              value={pricingData.propertyType}
              onChange={(e) => setPricingData(prev => ({ ...prev, propertyType: e.target.value }))}
              placeholder="e.g., apartment, house, condo"
            />
          </Grid>
          <Grid item xs={6} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Bedrooms"
              value={pricingData.bedrooms}
              onChange={(e) => setPricingData(prev => ({ ...prev, bedrooms: e.target.value }))}
            />
          </Grid>
          <Grid item xs={6} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Bathrooms"
              value={pricingData.bathrooms}
              onChange={(e) => setPricingData(prev => ({ ...prev, bathrooms: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Square Footage"
              value={pricingData.squareFootage}
              onChange={(e) => setPricingData(prev => ({ ...prev, squareFootage: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="City"
              value={pricingData.city}
              onChange={(e) => setPricingData(prev => ({ ...prev, city: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="State"
              value={pricingData.state}
              onChange={(e) => setPricingData(prev => ({ ...prev, state: e.target.value }))}
            />
          </Grid>
        </Grid>

        <Typography variant="subtitle2" sx={{ mb: 2 }}>Select Amenities:</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          {commonAmenities.map(amenity => (
            <Chip
              key={amenity}
              label={amenity}
              onClick={() => handleAmenitiesToggle(amenity, 'pricing')}
              color={pricingData.amenities.includes(amenity) ? 'primary' : 'default'}
              variant={pricingData.amenities.includes(amenity) ? 'filled' : 'outlined'}
            />
          ))}
        </Box>

        <Button
          variant="contained"
          onClick={generatePricingAnalysis}
          disabled={loading || !pricingData.propertyType || !pricingData.city}
          startIcon={loading ? <CircularProgress size={16} /> : <AIIcon />}
        >
          {loading ? 'Analyzing...' : 'Generate Pricing Analysis'}
        </Button>
      </CardContent>
    </Card>
  );

  const renderDescriptionTool = () => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <DescriptionIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6">AI Description Generator</Typography>
        </Box>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Property Type"
              value={descriptionData.propertyType}
              onChange={(e) => setDescriptionData(prev => ({ ...prev, propertyType: e.target.value }))}
              placeholder="e.g., apartment, house, condo"
            />
          </Grid>
          <Grid item xs={6} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Bedrooms"
              value={descriptionData.bedrooms}
              onChange={(e) => setDescriptionData(prev => ({ ...prev, bedrooms: e.target.value }))}
            />
          </Grid>
          <Grid item xs={6} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Bathrooms"
              value={descriptionData.bathrooms}
              onChange={(e) => setDescriptionData(prev => ({ ...prev, bathrooms: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="City"
              value={descriptionData.city}
              onChange={(e) => setDescriptionData(prev => ({ ...prev, city: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Monthly Rent"
              value={descriptionData.rent}
              onChange={(e) => setDescriptionData(prev => ({ ...prev, rent: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Special Features (Optional)"
              value={descriptionData.specialFeatures}
              onChange={(e) => setDescriptionData(prev => ({ ...prev, specialFeatures: e.target.value }))}
              placeholder="e.g., recently renovated, great view, quiet neighborhood"
            />
          </Grid>
        </Grid>

        <Typography variant="subtitle2" sx={{ mb: 2 }}>Select Amenities:</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          {commonAmenities.map(amenity => (
            <Chip
              key={amenity}
              label={amenity}
              onClick={() => handleAmenitiesToggle(amenity, 'description')}
              color={descriptionData.amenities.includes(amenity) ? 'primary' : 'default'}
              variant={descriptionData.amenities.includes(amenity) ? 'filled' : 'outlined'}
            />
          ))}
        </Box>

        <Button
          variant="contained"
          onClick={generateDescription}
          disabled={loading || !descriptionData.propertyType || !descriptionData.city}
          startIcon={loading ? <CircularProgress size={16} /> : <AIIcon />}
        >
          {loading ? 'Generating...' : 'Generate Description'}
        </Button>
      </CardContent>
    </Card>
  );

  const renderMarketTool = () => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <TrendIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6">Market Analysis</Typography>
        </Box>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="City"
              value={marketData.city}
              onChange={(e) => setMarketData(prev => ({ ...prev, city: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="State"
              value={marketData.state}
              onChange={(e) => setMarketData(prev => ({ ...prev, state: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Property Type"
              value={marketData.propertyType}
              onChange={(e) => setMarketData(prev => ({ ...prev, propertyType: e.target.value }))}
              placeholder="e.g., apartment, house, condo"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Price Range"
              value={marketData.priceRange}
              onChange={(e) => setMarketData(prev => ({ ...prev, priceRange: e.target.value }))}
              placeholder="e.g., $2000-3000"
            />
          </Grid>
        </Grid>

        <Button
          variant="contained"
          onClick={generateMarketAnalysis}
          disabled={loading || !marketData.city || !marketData.propertyType}
          startIcon={loading ? <CircularProgress size={16} /> : <AIIcon />}
        >
          {loading ? 'Analyzing...' : 'Generate Market Analysis'}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>
          AI Tools for Landlords
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Leverage AI to optimize your rental business with smart pricing, compelling descriptions, and market insights.
        </Typography>

        {/* Tool Selection */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={2}>
            <Grid item>
              <Button
                variant={activeTab === 'pricing' ? 'contained' : 'outlined'}
                onClick={() => setActiveTab('pricing')}
                startIcon={<PricingIcon />}
              >
                Pricing Analysis
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant={activeTab === 'description' ? 'contained' : 'outlined'}
                onClick={() => setActiveTab('description')}
                startIcon={<DescriptionIcon />}
              >
                Description Generator
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant={activeTab === 'market' ? 'contained' : 'outlined'}
                onClick={() => setActiveTab('market')}
                startIcon={<TrendIcon />}
              >
                Market Analysis
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Tool Content */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            {activeTab === 'pricing' && renderPricingTool()}
            {activeTab === 'description' && renderDescriptionTool()}
            {activeTab === 'market' && renderMarketTool()}
          </Grid>

          <Grid item xs={12} sm={6}>
            {/* Results Panel */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  AI Results
                </Typography>
                
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                
                {loading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                )}
                
                {result && !loading && (
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                      {result}
                    </Typography>
                  </Paper>
                )}
                
                {!result && !loading && !error && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    Select a tool and fill in the details to get AI-powered insights
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </motion.div>
    </Container>
  );
};

export default AITools;
