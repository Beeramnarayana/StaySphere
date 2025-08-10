import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Chip,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Paper
} from '@mui/material';
import { 
  Psychology as AIIcon,
  Home as HomeIcon,
  LocationOn as LocationIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const Onboarding = () => {
  const { user, updatePreferences } = useAuth();
  const navigate = useNavigate();
  
  const [activeStep, setActiveStep] = useState(0);
  const [preferences, setPreferences] = useState({
    budget: { min: 1000, max: 3000 },
    location: { city: '', state: '', zipCode: '' },
    propertyType: [],
    bedrooms: { min: 1, max: 3 },
    bathrooms: { min: 1, max: 2 },
    amenities: [],
    petPolicy: '',
    commute: { workAddress: '', maxCommuteTime: 30, transportMode: 'driving' },
    lifestyle: { quietness: 3, socialActivity: 3, familyFriendly: false },
    dealBreakers: [],
    niceToHaves: []
  });
  
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', content: "Hi! I'm your AI assistant. I'll help you find the perfect rental home by understanding your preferences. Let's start with your budget - what's your ideal monthly rent range?" }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);

  const steps = [
    'AI Chat Setup',
    'Location & Budget',
    'Property Preferences',
    'Lifestyle & Amenities'
  ];

  const propertyTypes = ['apartment', 'house', 'condo', 'townhouse', 'studio'];
  const commonAmenities = [
    'Parking', 'Gym', 'Pool', 'Laundry', 'Dishwasher', 'Air Conditioning',
    'Balcony', 'Pet Friendly', 'Furnished', 'Internet Included'
  ];

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!currentMessage.trim()) return;

    const userMessage = { role: 'user', content: currentMessage };
    const newHistory = [...chatHistory, userMessage];
    setChatHistory(newHistory);
    setCurrentMessage('');
    setIsTyping(true);

    try {
      const response = await axios.post('/ai/onboarding-chat', {
        message: currentMessage,
        conversationHistory: newHistory
      });

      const aiResponse = { role: 'assistant', content: response.data.response };
      setChatHistory([...newHistory, aiResponse]);

      // Update preferences if extracted
      if (response.data.extractedPreferences) {
        setPreferences(prev => ({
          ...prev,
          ...response.data.extractedPreferences
        }));
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorResponse = {
        role: 'assistant',
        content: "I'm having trouble processing that. Could you tell me about your budget range?"
      };
      setChatHistory([...newHistory, errorResponse]);
    }

    setIsTyping(false);
  };

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await updatePreferences(preferences);
      navigate('/search');
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
    setLoading(false);
  };

  const handlePreferenceChange = (category, field, value) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const toggleArrayItem = (category, item) => {
    setPreferences(prev => ({
      ...prev,
      [category]: prev[category].includes(item)
        ? prev[category].filter(i => i !== item)
        : [...prev[category], item]
    }));
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
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <AIIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>
                Let's Find Your Perfect Home
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Chat with our AI to help us understand your preferences
              </Typography>
            </Box>

            <Paper sx={{ p: 3, mb: 3, maxHeight: 400, overflow: 'auto' }}>
              {chatHistory.map((message, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                    mb: 2
                  }}
                >
                  <Paper
                    sx={{
                      p: 2,
                      maxWidth: '80%',
                      bgcolor: message.role === 'user' ? 'primary.main' : 'grey.100',
                      color: message.role === 'user' ? 'white' : 'text.primary'
                    }}
                  >
                    <Typography variant="body2">
                      {message.content}
                    </Typography>
                  </Paper>
                </Box>
              ))}
              {isTyping && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    AI is typing...
                  </Typography>
                </Box>
              )}
            </Paper>

            <Box component="form" onSubmit={handleChatSubmit} sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Tell me about your ideal home..."
                variant="outlined"
              />
              <Button type="submit" variant="contained" disabled={isTyping}>
                Send
              </Button>
            </Box>
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
              Location & Budget
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="City"
                  value={preferences.location.city}
                  onChange={(e) => handlePreferenceChange('location', 'city', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="State"
                  value={preferences.location.state}
                  onChange={(e) => handlePreferenceChange('location', 'state', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom>
                  Monthly Budget: ${preferences.budget.min} - ${preferences.budget.max}
                </Typography>
                <Slider
                  value={[preferences.budget.min, preferences.budget.max]}
                  onChange={(e, newValue) => {
                    setPreferences(prev => ({
                      ...prev,
                      budget: { min: newValue[0], max: newValue[1] }
                    }));
                  }}
                  valueLabelDisplay="auto"
                  min={500}
                  max={8000}
                  step={100}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Work/School Address (for commute calculation)"
                  value={preferences.commute.workAddress}
                  onChange={(e) => handlePreferenceChange('commute', 'workAddress', e.target.value)}
                />
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
              Property Preferences
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Property Types</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {propertyTypes.map(type => (
                    <Chip
                      key={type}
                      label={type.charAt(0).toUpperCase() + type.slice(1)}
                      onClick={() => toggleArrayItem('propertyType', type)}
                      color={preferences.propertyType.includes(type) ? 'primary' : 'default'}
                      variant={preferences.propertyType.includes(type) ? 'filled' : 'outlined'}
                    />
                  ))}
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography gutterBottom>
                  Bedrooms: {preferences.bedrooms.min} - {preferences.bedrooms.max}
                </Typography>
                <Slider
                  value={[preferences.bedrooms.min, preferences.bedrooms.max]}
                  onChange={(e, newValue) => {
                    setPreferences(prev => ({
                      ...prev,
                      bedrooms: { min: newValue[0], max: newValue[1] }
                    }));
                  }}
                  valueLabelDisplay="auto"
                  min={0}
                  max={5}
                  step={1}
                  marks
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography gutterBottom>
                  Bathrooms: {preferences.bathrooms.min} - {preferences.bathrooms.max}
                </Typography>
                <Slider
                  value={[preferences.bathrooms.min, preferences.bathrooms.max]}
                  onChange={(e, newValue) => {
                    setPreferences(prev => ({
                      ...prev,
                      bathrooms: { min: newValue[0], max: newValue[1] }
                    }));
                  }}
                  valueLabelDisplay="auto"
                  min={1}
                  max={4}
                  step={0.5}
                  marks
                />
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
              Lifestyle & Amenities
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Desired Amenities</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {commonAmenities.map(amenity => (
                    <Chip
                      key={amenity}
                      label={amenity}
                      onClick={() => toggleArrayItem('amenities', amenity)}
                      color={preferences.amenities.includes(amenity) ? 'primary' : 'default'}
                      variant={preferences.amenities.includes(amenity) ? 'filled' : 'outlined'}
                    />
                  ))}
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Pet Policy</InputLabel>
                  <Select
                    value={preferences.petPolicy}
                    onChange={(e) => setPreferences(prev => ({ ...prev, petPolicy: e.target.value }))}
                    label="Pet Policy"
                  >
                    <MenuItem value="">No preference</MenuItem>
                    <MenuItem value="allowed">Pets allowed</MenuItem>
                    <MenuItem value="not-allowed">No pets</MenuItem>
                    <MenuItem value="case-by-case">Case by case</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography gutterBottom>Neighborhood Quietness (1-5)</Typography>
                <Slider
                  value={preferences.lifestyle.quietness}
                  onChange={(e, newValue) => handlePreferenceChange('lifestyle', 'quietness', newValue)}
                  valueLabelDisplay="auto"
                  min={1}
                  max={5}
                  step={1}
                  marks
                />
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
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

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
              onClick={handleFinish}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Start Searching'}
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

export default Onboarding;
