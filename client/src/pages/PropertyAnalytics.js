import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Box,
  LinearProgress,
  CircularProgress,
  Alert,
  Container,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  useTheme,
  IconButton
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Visibility as ViewIcon,
  Favorite as FavoriteIcon,
  Email as EmailIcon,
  Home as HomeIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../utils/axiosConfig';

const PropertyAnalytics = () => {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPortfolioView, setIsPortfolioView] = useState(!id);

  const fetchAnalytics = useCallback(async () => {
    try {
      if (id) {
        // Fetch data for a specific property
        const [propertyResponse, analyticsResponse] = await Promise.all([
          api.get(`/properties/${id}`),
          api.get(`/analytics/property/${id}`)
        ]);
        
        setProperty(propertyResponse.data);
        setAnalytics(analyticsResponse.data);
      } else {
        // Fetch portfolio-wide analytics
        const response = await api.get('/analytics/dashboard');
        setAnalytics(response.data);
        setIsPortfolioView(true);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        if (error.response.status === 401) {
          // Token might be expired, log the user out
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }
      }
      setError('Failed to load analytics data. ' + (error.response?.data?.message || ''));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setIsPortfolioView(!id);
    fetchAnalytics();
  }, [id, fetchAnalytics]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || (id && !property)) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Property not found'}</Alert>
      </Container>
    );
  }

  const MetricCard = ({ title, value, trend, icon, color = 'primary' }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {icon}
            <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold' }}>
              {title}
            </Typography>
          </Box>
          <Chip 
            label={trend} 
            color={trend.startsWith('+') ? 'success' : 'error'} 
            size="small" 
          />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: `${color}.main` }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            {isPortfolioView ? 'Portfolio Analytics' : 'Property Analytics'}
          </Typography>
          {!isPortfolioView && property && (
            <>
              <Typography variant="h6" color="text.secondary">
                {property.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {property.address.city}, {property.address.state}
              </Typography>
            </>
          )}
          {isPortfolioView && (
            <Typography variant="body1" color="text.secondary">
              Overview of all your rental properties
            </Typography>
          )}
        </Box>

        {/* Key Metrics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {analytics && isPortfolioView ? (
            // Portfolio metrics
            <>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Total Properties"
                  value={analytics.totalProperties || 0}
                  trend="+0%"
                  icon={<HomeIcon color="primary" />}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Average Rent"
                  value={`$${analytics.averageRent?.toLocaleString() || 0}`}
                  trend="+0%"
                  icon={<MoneyIcon color="success" />}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Total Views"
                  value={analytics.totalViews || 0}
                  trend="+0%"
                  icon={<ViewIcon color="info" />}
                  color="info"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Total Inquiries"
                  value={analytics.totalInquiries || 0}
                  trend="+0%"
                  icon={<EmailIcon color="warning" />}
                  color="warning"
                />
              </Grid>
            </>
          ) : analytics ? (
            // Individual property metrics
            <>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Views"
                  value={analytics.views?.total || 0}
                  trend={analytics.views?.trend || "+0%"}
                  icon={<ViewIcon color="primary" />}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Saves"
                  value={analytics.saves?.total || 0}
                  trend={analytics.saves?.trend || "+0%"}
                  icon={<FavoriteIcon color="error" />}
                  color="error"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Inquiries"
                  value={analytics.inquiries?.total || 0}
                  trend={analytics.inquiries?.trend || "+0%"}
                  icon={<EmailIcon color="info" />}
                  color="info"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Applications"
                  value={analytics.applications?.total || 0}
                  trend={analytics.applications?.trend || "+0%"}
                  icon={<TrendingUpIcon color="success" />}
                  color="success"
                />
              </Grid>
            </>
          ) : (
            // Loading state when analytics is null
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            </Grid>
          )}
        </Grid>

        {/* Detailed Analytics - Only for individual property view */}
        {!isPortfolioView && analytics && (
          <Grid container spacing={3}>
            {/* Conversion Rates */}
            {analytics.conversionRate && (
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
                      Conversion Funnel
                    </Typography>
                    
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">View to Save</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {typeof analytics.conversionRate.viewToSave === 'number' 
                            ? `${analytics.conversionRate.viewToSave}%` 
                            : 'N/A'}
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={typeof analytics.conversionRate.viewToSave === 'number' 
                          ? analytics.conversionRate.viewToSave 
                          : 0} 
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>

                    {analytics.demographics?.searchSources?.length > 0 && (
                      <Box sx={{ mb: 3 }}>
                        {analytics.demographics.searchSources.map((source, index) => (
                          <Box key={index} sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2">
                                {source.source || 'Unknown Source'}
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {typeof source.percentage === 'number' ? `${source.percentage}%` : 'N/A'}
                              </Typography>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={typeof source.percentage === 'number' ? source.percentage : 0} 
                              color="secondary"
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        )}
      </motion.div>
    </Container>
  );
};

export default PropertyAnalytics;
