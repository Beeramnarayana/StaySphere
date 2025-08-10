import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Home as HomeIcon,
  Add as AddIcon,
  Analytics as AnalyticsIcon,
  Psychology as AIIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/axiosConfig';

const LandlordDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProperties: 0,
    activeProperties: 0,
    totalViews: 0,
    totalInquiries: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch dashboard analytics from the new analytics endpoint
      const response = await api.get('/analytics/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      console.error('Error response:', error.response?.data);
    }
    setLoading(false);
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
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>
        Landlord Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Welcome, {user?.name}! Manage your properties with AI-powered tools.
      </Typography>

      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {stats.totalProperties}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Properties
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                ${stats.averageRent?.toLocaleString() || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average Rent
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                {stats.totalViews}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Views
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                {stats.totalInquiries}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Inquiries
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <HomeIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 2 }}>My Properties</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                View and manage your {stats.totalProperties} rental properties
              </Typography>
              <Button 
                variant="contained"
                onClick={() => navigate('/my-properties')}
                fullWidth
              >
                View Properties
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AddIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 2 }}>Add Property</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                List a new property for rent with AI assistance
              </Typography>
              <Button 
                variant="outlined"
                onClick={() => navigate('/add-property')}
                fullWidth
              >
                Add Property
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AnalyticsIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 2 }}>Analytics</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                View property performance and market insights
              </Typography>
              <Button 
                variant="outlined"
                onClick={() => navigate('/analytics')}
                disabled={stats.totalProperties === 0}
                fullWidth
              >
                View Analytics
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AIIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 2 }}>AI Tools</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Use AI for pricing, descriptions, and tenant matching
              </Typography>
              <Button 
                variant="outlined"
                onClick={() => navigate('/ai-tools')}
                fullWidth
              >
                AI Tools
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {stats.totalProperties === 0 && (
        <Alert severity="info" sx={{ mt: 4 }}>
          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
            Get started by adding your first property!
          </Typography>
          <Typography variant="body2">
            Use our AI-powered tools to create compelling listings and attract quality tenants.
          </Typography>
        </Alert>
      )}
    </Container>
  );
};

export default LandlordDashboard;
