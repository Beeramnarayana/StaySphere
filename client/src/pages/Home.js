import React, { useState } from 'react';
import {
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  useTheme,
  Box,
  TextField,
  Paper,
  InputAdornment,
  IconButton,
  Chip
} from '@mui/material';
import { 
  Search as SearchIcon,
  Psychology as AIIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/search');
    } else {
      navigate('/register');
    }
  };

  const features = [
    {
      icon: <AIIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'AI-Powered Search',
      description: 'Use natural language to find your perfect home. Just describe what you\'re looking for!'
    },
    {
      icon: <SpeedIcon sx={{ fontSize: 40, color: 'secondary.main' }} />,
      title: 'Instant Matching',
      description: 'Get personalized property recommendations based on your preferences and behavior.'
    },
    {
      icon: <TrendingIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Market Analysis',
      description: 'AI-driven cost analysis and market insights to help you make informed decisions.'
    }
  ];

  const popularSearches = [
    '2 bedroom apartment near downtown',
    'Pet-friendly house with yard',
    'Studio apartment under $2000',
    'Luxury condo with amenities'
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Typography
                  variant="h2"
                  component="h1"
                  sx={{
                    fontWeight: 'bold',
                    mb: 2,
                    fontSize: { xs: '2.5rem', md: '3.5rem' }
                  }}
                >
                  Find Your Perfect Home with AI
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    mb: 4,
                    opacity: 0.9,
                    fontWeight: 400,
                    fontSize: { xs: '1.2rem', md: '1.5rem' }
                  }}
                >
                  Revolutionary AI-powered rental search that understands exactly what you're looking for
                </Typography>
                
                {/* Search Bar */}
                <Paper
                  component="form"
                  onSubmit={handleSearch}
                  sx={{
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    mb: 3,
                    borderRadius: 3,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                  }}
                >
                  <TextField
                    fullWidth
                    placeholder="Tell me what you're looking for... (e.g., 2 bedroom apartment near Central Park)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AIIcon color="primary" />
                        </InputAdornment>
                      ),
                      sx: { border: 'none', '& fieldset': { border: 'none' } }
                    }}
                  />
                  <IconButton
                    type="submit"
                    sx={{
                      p: 2,
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' },
                      mr: 1
                    }}
                  >
                    <SearchIcon />
                  </IconButton>
                </Paper>

                <Button
                  variant="contained"
                  size="large"
                  onClick={handleGetStarted}
                  sx={{
                    bgcolor: 'white',
                    color: 'primary.main',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    '&:hover': {
                      bgcolor: 'grey.100'
                    }
                  }}
                >
                  Get Started
                </Button>
              </motion.div>
            </Grid>
            <Grid item xs={12} sm={6}>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    textAlign: 'center'
                  }}
                >
                  <img
                    src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
                    alt="Modern Home"
                    style={{
                      width: '100%',
                      maxWidth: '500px',
                      borderRadius: '20px',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                    }}
                  />
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h3"
            component="h2"
            sx={{ mb: 2, fontWeight: 'bold' }}
          >
            Why Choose RentAI?
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ maxWidth: '600px', mx: 'auto' }}
          >
            Experience the future of rental search with our AI-powered platform
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <Card
                  sx={{
                    height: '100%',
                    textAlign: 'center',
                    p: 3,
                    transition: 'transform 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  <CardContent>
                    <Box sx={{ mb: 2 }}>
                      {feature.icon}
                    </Box>
                    <Typography variant="h5" component="h3" sx={{ mb: 2, fontWeight: 'bold' }}>
                      {feature.title}
                    </Typography>
                    <Typography color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Popular Searches Section */}
      <Box sx={{ bgcolor: 'grey.50', py: 6 }}>
        <Container maxWidth="lg">
          <Typography
            variant="h4"
            component="h2"
            textAlign="center"
            sx={{ mb: 4, fontWeight: 'bold' }}
          >
            Popular Searches
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
            {popularSearches.map((search, index) => (
              <Chip
                key={index}
                label={search}
                onClick={() => navigate(`/search?q=${encodeURIComponent(search)}`)}
                sx={{
                  fontSize: '1rem',
                  py: 2,
                  px: 1,
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'primary.main',
                    color: 'white'
                  }
                }}
              />
            ))}
          </Box>
        </Container>
      </Box>

      {/* CTA Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box
          sx={{
            textAlign: 'center',
            bgcolor: 'primary.main',
            color: 'white',
            p: 6,
            borderRadius: 4
          }}
        >
          <Typography variant="h4" component="h2" sx={{ mb: 2, fontWeight: 'bold' }}>
            Ready to Find Your Dream Home?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            Join thousands of renters who have found their perfect match with RentAI
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleGetStarted}
            sx={{
              bgcolor: 'white',
              color: 'primary.main',
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              '&:hover': {
                bgcolor: 'grey.100'
              }
            }}
          >
            Start Your Search
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default Home;
