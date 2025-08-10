import React, { useState, useCallback } from 'react';
import {
  Box,
  IconButton,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Paper,
  Typography
} from '@mui/material';
import { Delete as DeleteIcon, AddPhotoAlternate as AddPhotoIcon } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import api from '../utils/axiosConfig';

const PropertyImageGallery = ({ propertyId, images: propImages, isOwner, onUpdate }) => {
  const [images, setImages] = useState(propImages || []);
  const [uploading, setUploading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles.length) return;
    
    const formData = new FormData();
    acceptedFiles.forEach(file => {
      formData.append('images', file);
    });

    try {
      setUploading(true);
      const response = await api.post(
        `/api/properties/${propertyId}/images`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      const updatedImages = [...propImages, ...response.data.images];
      setImages(updatedImages);
      onUpdate && onUpdate(updatedImages);
    } catch (error) {
      console.error('Error uploading images:', error);
      throw new Error('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [propertyId, propImages, onUpdate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: 'image/*',
    multiple: true,
    disabled: !isOwner || uploading
  });

  const handleDeleteImage = async (imageId) => {
    try {
      await api.delete(`/api/properties/${propertyId}/images/${imageId}`);
      const updatedImages = images.filter(img => img._id !== imageId);
      setImages(updatedImages);
      onUpdate && onUpdate(updatedImages);
    } catch (error) {
      console.error('Error deleting image:', error);
      throw new Error('Failed to delete image. Please try again.');
    }
  };

  const openImageDialog = (image) => {
    setSelectedImage(image);
    setOpenDialog(true);
  };

  const closeImageDialog = () => {
    setOpenDialog(false);
    setSelectedImage(null);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Property Images
        </Typography>
        {isOwner && (
          <Box {...getRootProps()}>
            <input {...getInputProps()} />
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddPhotoIcon />}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Add Images'}
            </Button>
          </Box>
        )}
      </Box>

      {isDragActive && (
        <Paper
          elevation={3}
          sx={{
            p: 4,
            border: '2px dashed #1976d2',
            textAlign: 'center',
            mb: 3,
            backgroundColor: 'rgba(25, 118, 210, 0.05)'
          }}
        >
          <Typography>Drop the images here</Typography>
        </Paper>
      )}

      <Grid container spacing={2}>
        {images.map((image, index) => (
          <Grid item xs={12} sm={6} md={4} key={image._id || index}>
            <Box sx={{ position: 'relative', borderRadius: 1, overflow: 'hidden' }}>
              <motion.div whileHover={{ scale: 1.02 }}>
                <img
                  src={image.url}
                  alt={`Property ${index + 1}`}
                  style={{
                    width: '100%',
                    height: 200,
                    objectFit: 'cover',
                    cursor: 'pointer',
                    borderRadius: 4,
                  }}
                  onClick={() => openImageDialog(image)}
                />
              </motion.div>
              {isOwner && (
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteImage(image._id);
                  }}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(0,0,0,0.7)',
                    },
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={closeImageDialog} maxWidth="md">
        <DialogContent>
          {selectedImage && (
            <img
              src={selectedImage.url}
              alt="Full size"
              style={{ width: '100%', height: 'auto', maxHeight: '80vh' }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeImageDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PropertyImageGallery;
