import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress
} from '@mui/material';
import { Edit as EditIcon, MyLocation as MyLocationIcon } from '@mui/icons-material';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { useSnackbar } from 'notistack';

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '8px',
  overflow: 'hidden'
};

const defaultCenter = {
  lat: 20.5937, // Default to India
  lng: 78.9629
};

const normalizeLocation = (loc) => {
  if (!loc) return defaultCenter;
  
  // Handle case where coordinates are in a nested object
  const coords = loc.coordinates || loc;
  
  if (Array.isArray(coords) && coords.length >= 2) {
    return {
      lat: parseFloat(coords[1]), // Note: MongoDB uses [longitude, latitude]
      lng: parseFloat(coords[0])
    };
  }
  
  // Handle case where we have lat/lng directly
  if (loc.lat && loc.lng) {
    return {
      lat: parseFloat(loc.lat),
      lng: parseFloat(loc.lng)
    };
  }
  
  return defaultCenter;
};

const PropertyLocationMap = ({ 
  propertyId, 
  initialLocation, 
  isOwner, 
  onLocationUpdate,
  address = ''
}) => {
  const [mapCenter, setMapCenter] = useState(normalizeLocation(initialLocation));
  // Location is kept in state to track changes but not directly used in render
  const [, setLocation] = useState(normalizeLocation(initialLocation));
  const [openEdit, setOpenEdit] = useState(false);

  const [loading, setLoading] = useState(false);
  const [markerPosition, setMarkerPosition] = useState(normalizeLocation(initialLocation));
  const [showInfo, setShowInfo] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const newLocation = normalizeLocation(initialLocation);
    setLocation(newLocation);
    setMapCenter(newLocation);
    setMarkerPosition(newLocation);
  }, [initialLocation]);

  const handleMapClick = (event) => {
    if (!openEdit) return;
    
    const newLocation = {
      lat: parseFloat(event.latLng.lat().toFixed(6)),
      lng: parseFloat(event.latLng.lng().toFixed(6))
    };
    
    setMarkerPosition(newLocation);
    setLocation(newLocation);
  };

  const handleMarkerDragEnd = (event) => {
    const newPosition = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };
    setMarkerPosition(newPosition);
    setLocation(newPosition);
  };

  const handleSaveLocation = async () => {
    // Validate marker position exists
    if (!markerPosition) {
      enqueueSnackbar('Please select a location on the map', { variant: 'warning' });
      return;
    }

    // Validate coordinates are valid numbers
    const lng = parseFloat(markerPosition.lng);
    const lat = parseFloat(markerPosition.lat);
    
    if (isNaN(lng) || isNaN(lat)) {
      enqueueSnackbar('Invalid coordinates. Please select a valid location on the map.', { variant: 'error' });
      return;
    }

    // Validate coordinate ranges (approximate valid world coordinates)
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      enqueueSnackbar('Coordinates are out of valid range. Please select a location on the map.', { variant: 'error' });
      return;
    }
    
    try {
      setLoading(true);
      
      const locationData = {
        type: 'Point',
        coordinates: [lng, lat] // Use the parsed numbers
      };
      
      // Additional validation before sending to server
      if (!Array.isArray(locationData.coordinates) || 
          locationData.coordinates.length !== 2 || 
          !locationData.coordinates.every(coord => typeof coord === 'number' && !isNaN(coord))) {
        throw new Error('Invalid coordinate values');
      }
      
      const response = await fetch(`/api/properties/${propertyId}/location`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          location: locationData,
          address: {
            coordinates: locationData.coordinates
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update location');
      }

      const data = await response.json();
      enqueueSnackbar('Location updated successfully', { variant: 'success' });
      setOpenEdit(false);
      
      if (onLocationUpdate) {
        onLocationUpdate(data.location || data.address?.coordinates);
      }
    } catch (error) {
      console.error('Error updating location:', error);
      enqueueSnackbar(error.message || 'Failed to update location', { 
        variant: 'error',
        autoHideDuration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const [mapError, setMapError] = useState(null);

  const handleMapError = (error) => {
    console.error('Google Maps error:', error);
    setMapError('Failed to load Google Maps. Please check your API key and internet connection.');
  };

  const renderMap = () => {
    if (mapError) {
      return (
        <Box 
          sx={{ 
            height: 400, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: '#f5f5f5',
            borderRadius: 1,
            p: 3,
            textAlign: 'center'
          }}
        >
          <Typography variant="h6" color="error" gutterBottom>
            Map Unavailable
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {mapError}
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => window.location.reload()}
            sx={{ mt: 2 }}
          >
            Retry
          </Button>
        </Box>
      );
    }

    if (!process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
      return (
        <Box 
          sx={{ 
            height: 400, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: '#f5f5f5',
            borderRadius: 1,
            p: 3,
            textAlign: 'center'
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Google Maps API Key Required
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please add a valid Google Maps API key to your environment variables.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            href="https://developers.google.com/maps/documentation/javascript/get-api-key"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ mt: 1 }}
          >
            Get API Key
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Add it to client/.env as REACT_APP_GOOGLE_MAPS_API_KEY=your_api_key
          </Typography>
        </Box>
      );
    }

    return (
      <LoadScript
        googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
        libraries={['places']}
        onError={handleMapError}
        loadingElement={
          <Box sx={{ 
            height: 400, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: '#f5f5f5',
            borderRadius: 1
          }}>
            <CircularProgress />
          </Box>
        }
      >
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter}
          zoom={markerPosition ? 15 : 10}
          onClick={handleMapClick}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            zoomControl: true,
            gestureHandling: 'auto',
            clickableIcons: openEdit,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              }
            ]
          }}
        >
          {markerPosition && (
            <Marker
              position={markerPosition}
              draggable={openEdit}
              onDragEnd={handleMarkerDragEnd}
              onClick={() => setShowInfo(true)}
            >
              {showInfo && (
                <InfoWindow
                  position={markerPosition}
                  onCloseClick={() => setShowInfo(false)}
                >
                  <Box sx={{ p: 1 }}>
                    <Typography variant="body2">
                      {address || 'Property Location'}
                    </Typography>
                  </Box>
                </InfoWindow>
              )}
            </Marker>
          )}
        </GoogleMap>
      </LoadScript>
    );
  };

  return (
    <Box sx={{ mt: 3, mb: 4, position: 'relative' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h3">
          Property Location
        </Typography>
        {isOwner && (
          <Button 
            size="small" 
            startIcon={<EditIcon />}
            onClick={() => setOpenEdit(!openEdit)}
            variant={openEdit ? 'contained' : 'outlined'}
            disabled={!!mapError || !process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
          >
            {openEdit ? 'Cancel' : 'Edit Location'}
          </Button>
        )}
      </Box>
      
      {renderMap()}
      
      {openEdit && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button 
            variant="outlined" 
            onClick={() => setOpenEdit(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveLocation}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Saving...' : 'Save Location'}
          </Button>
        </Box>
      )}
      
      {!openEdit && address && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {address}
        </Typography>
      )}

      {!openEdit && isOwner && (
        <Button
          size="small"
          startIcon={<MyLocationIcon />}
          onClick={() => setMapCenter(markerPosition)}
          sx={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            backgroundColor: 'white',
            '&:hover': { backgroundColor: 'white' },
            boxShadow: 2,
            zIndex: 1
          }}
        >
          Reset View
        </Button>
      )}
    </Box>
  );
};

export default PropertyLocationMap;
