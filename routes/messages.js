const express = require('express');
const Message = require('../models/Message');
const Property = require('../models/Property');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all messages for the current user (landlord)
router.get('/', auth, async (req, res) => {
  try {
    const messages = await Message.find({ to: req.user.userId })
      .populate('property', 'title address')
      .sort({ createdAt: -1 });
      
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

// Get a single message by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      $or: [
        { to: req.user.userId },
        { 'from.email': req.user.email }
      ]
    }).populate('property', 'title address');
    
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    
    // Mark as read when fetched
    if (message.status === 'unread' && message.to.toString() === req.user.userId) {
      message.status = 'read';
      await message.save();
    }
    
    res.json({ success: true, data: message });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch message' });
  }
});

// Update message status (e.g., mark as read, archived)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['read', 'unread', 'archived', 'replied'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, to: req.user.userId },
      { status },
      { new: true }
    );
    
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    
    res.json({ success: true, data: message });
  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({ success: false, message: 'Failed to update message status' });
  }
});

// Delete a message (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, to: req.user.userId },
      { status: 'archived' },
      { new: true }
    );
    
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    
    res.json({ success: true, message: 'Message archived successfully' });
  } catch (error) {
    console.error('Error archiving message:', error);
    res.status(500).json({ success: false, message: 'Failed to archive message' });
  }
});

module.exports = router;
