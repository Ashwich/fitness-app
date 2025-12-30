# Backend Notification Setup for Community Chat Join Requests

This document outlines what needs to be added to the backend to send notifications when gym admins send community chat join requests.

## Overview

When a gym admin sends a join request to a user, the backend should:
1. Create the join request in the database
2. Emit a socket event to notify the user in real-time
3. Create a notification record in the users-service database
4. Send the notification through the users-service notification system

## Backend Structure

The backend has two services:
- **Gym Management Service** (port 4000) - Handles gym admin operations
- **Users Service** (port 8081) - Handles user operations and notifications

## Required Backend Code

### 1. Gym Management Service - Community Chat Handler

**File:** `gym-management-service/src/handlers/communityChatHandler.js`

Add notification emission when sending join request:

```javascript
const sendJoinRequest = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, message } = req.body;
    const gymOwnerId = req.user.id; // From auth middleware

    // 1. Create join request in database
    const joinRequest = await JoinRequest.create({
      roomId,
      userId,
      gymOwnerId,
      message,
      status: 'pending',
    });

    // 2. Get room and gym information
    const room = await Room.findById(roomId);
    const gym = await Gym.findOne({ ownerId: gymOwnerId });

    // 3. Call users-service to create notification (internal API call)
    const axios = require('axios');
    const USER_SERVICE_URL = process.env.INTERNAL_USER_SERVICE_URL || 'http://localhost:8081';
    
    try {
      await axios.post(`${USER_SERVICE_URL}/api/users/internal/notifications`, {
        userId: userId,
        type: 'COMMUNITY_JOIN_REQUEST',
        title: `Join ${room.name}`,
        message: message || `${gym.name} invited you to join "${room.name}"`,
        data: {
          requestId: joinRequest._id.toString(),
          roomId: roomId,
          roomName: room.name,
          gymName: gym.name,
          gymId: gym._id.toString(),
        },
      }, {
        headers: {
          'X-Internal-Request': 'true',
        },
      });
    } catch (error) {
      console.error('[CommunityChat] Error creating notification:', error);
      // Don't fail the request if notification fails
    }

    // 4. Emit socket event to user (if users-service has socket connection)
    // This should be done through users-service, but we can also emit directly
    // if we have access to the socket instance
    const io = req.app.get('io'); // If socket.io is attached to app
    if (io) {
      io.to(`user:${userId}`).emit('community-join-request', {
        requestId: joinRequest._id.toString(),
        roomId: roomId,
        roomName: room.name,
        gymName: gym.name,
        message: message,
        createdAt: joinRequest.createdAt,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Join request sent successfully',
      data: joinRequest,
    });
  } catch (error) {
    console.error('[CommunityChat] Error sending join request:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
```

### 2. Users Service - Internal Notification Endpoint

**File:** `users-service/src/routes/internalRoutes.js` or similar

Add endpoint to receive notification creation requests from gym-service:

```javascript
const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const authenticateInternalRequest = require('../middleware/internalAuth');

// Create notification from internal service (gym-service)
router.post('/notifications', authenticateInternalRequest, async (req, res) => {
  try {
    const { userId, type, title, message, data } = req.body;

    // Create notification
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      data,
      read: false,
    });

    // Emit socket event to user
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('new-notification', {
        id: notification._id.toString(),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        read: notification.read,
        createdAt: notification.createdAt,
      });

      // Also emit community-join-request event for specific handling
      if (type === 'COMMUNITY_JOIN_REQUEST') {
        io.to(`user:${userId}`).emit('community-join-request', {
          requestId: data.requestId,
          roomId: data.roomId,
          roomName: data.roomName,
          gymName: data.gymName,
          message: message,
          createdAt: notification.createdAt,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Notification created',
      data: notification,
    });
  } catch (error) {
    console.error('[Internal] Error creating notification:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
```

### 3. Users Service - Socket.IO Setup

**File:** `users-service/src/app.js` or `users-service/src/server.js`

Ensure Socket.IO is properly set up and users are joined to their rooms:

```javascript
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Socket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    // Verify token and get user
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.userId = user._id.toString();
    socket.join(`user:${user._id}`);
    
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket] User connected: ${socket.userId}`);
  
  socket.on('disconnect', () => {
    console.log(`[Socket] User disconnected: ${socket.userId}`);
  });
});

// Make io available to routes
app.set('io', io);
```

### 4. Users Service - Accept/Reject Join Request Endpoints

**File:** `users-service/src/routes/userRoutes.js` or similar

Add endpoints for users to accept/reject join requests:

```javascript
const axios = require('axios');
const GYM_SERVICE_URL = process.env.INTERNAL_GYM_SERVICE_URL || 'http://localhost:4000';

// Accept join request
router.post('/community-chat/requests/accept', authenticateUser, async (req, res) => {
  try {
    const { requestId } = req.body;
    const userId = req.user.id;

    // Call gym-service to accept the request
    const response = await axios.post(
      `${GYM_SERVICE_URL}/community-chat/internal/requests/accept`,
      { requestId, userId },
      {
        headers: {
          'X-Internal-Request': 'true',
        },
      }
    );

    // Remove notification
    await Notification.deleteOne({
      userId,
      'data.requestId': requestId,
    });

    res.json({
      success: true,
      message: 'Join request accepted',
      data: response.data,
    });
  } catch (error) {
    console.error('[User] Error accepting join request:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Reject join request
router.post('/community-chat/requests/reject', authenticateUser, async (req, res) => {
  try {
    const { requestId } = req.body;
    const userId = req.user.id;

    // Call gym-service to reject the request
    const response = await axios.post(
      `${GYM_SERVICE_URL}/community-chat/internal/requests/reject`,
      { requestId, userId },
      {
        headers: {
          'X-Internal-Request': 'true',
        },
      }
    );

    // Remove notification
    await Notification.deleteOne({
      userId,
      'data.requestId': requestId,
    });

    res.json({
      success: true,
      message: 'Join request rejected',
      data: response.data,
    });
  } catch (error) {
    console.error('[User] Error rejecting join request:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
```

### 5. Gym Service - Internal Accept/Reject Endpoints

**File:** `gym-management-service/src/routes/internalRoutes.js`

Add internal endpoints for accepting/rejecting requests:

```javascript
const authenticateInternalRequest = require('../middleware/internalAuth');

// Accept join request (internal)
router.post('/community-chat/requests/accept', authenticateInternalRequest, async (req, res) => {
  try {
    const { requestId, userId } = req.body;

    const joinRequest = await JoinRequest.findById(requestId);
    if (!joinRequest) {
      return res.status(404).json({
        success: false,
        error: 'Join request not found',
      });
    }

    if (joinRequest.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Add user to room
    await Room.findByIdAndUpdate(joinRequest.roomId, {
      $addToSet: { members: userId },
    });

    // Update request status
    joinRequest.status = 'accepted';
    await joinRequest.save();

    res.json({
      success: true,
      message: 'Join request accepted',
      data: joinRequest,
    });
  } catch (error) {
    console.error('[Internal] Error accepting join request:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Reject join request (internal)
router.post('/community-chat/requests/reject', authenticateInternalRequest, async (req, res) => {
  try {
    const { requestId, userId } = req.body;

    const joinRequest = await JoinRequest.findById(requestId);
    if (!joinRequest) {
      return res.status(404).json({
        success: false,
        error: 'Join request not found',
      });
    }

    if (joinRequest.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Update request status
    joinRequest.status = 'rejected';
    await joinRequest.save();

    res.json({
      success: true,
      message: 'Join request rejected',
      data: joinRequest,
    });
  } catch (error) {
    console.error('[Internal] Error rejecting join request:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
```

## Environment Variables

Make sure these are set in both services:

**Gym Management Service (.env):**
```env
INTERNAL_USER_SERVICE_URL=http://localhost:8081
```

**Users Service (.env):**
```env
INTERNAL_GYM_SERVICE_URL=http://localhost:4000
```

## Testing

1. **Test notification creation:**
   ```bash
   curl -X POST http://localhost:8081/api/users/internal/notifications \
     -H "Content-Type: application/json" \
     -H "X-Internal-Request: true" \
     -d '{
       "userId": "user-id-here",
       "type": "COMMUNITY_JOIN_REQUEST",
       "title": "Join Test Room",
       "message": "You've been invited to join Test Room",
       "data": {
         "requestId": "request-id",
         "roomId": "room-id",
         "roomName": "Test Room",
         "gymName": "Test Gym"
       }
     }'
   ```

2. **Test socket connection:**
   - Connect to socket with user token
   - Send join request from gym admin
   - Verify socket event is received

## Summary

The key points are:
1. When gym admin sends join request → Create notification via internal API call to users-service
2. Users-service creates notification and emits socket event
3. Frontend listens for socket events and displays notifications
4. User accepts/rejects → Frontend calls users-service → Users-service calls gym-service internally

This ensures proper separation of concerns while maintaining real-time notifications.

