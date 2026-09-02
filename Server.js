const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Initialize Express
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Verify the JWT sent from socket.js's `auth: { token }` on every connection
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});
// Tracks each user's open sockets (handles multiple tabs/devices per person)
const onlineSockets = new Map(); // userId -> Set of socket.id

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// ============================================
// DATABASE CONNECTION
// ============================================
mongoose.connect('mongodb://new_atlas_provider:MindMayHem2024@ac-p5vlpuu-shard-00-00.eey0e9z.mongodb.net:27017,ac-p5vlpuu-shard-00-01.eey0e9z.mongodb.net:27017,ac-p5vlpuu-shard-00-02.eey0e9z.mongodb.net:27017/?ssl=true&replicaSet=atlas-4cfrio-shard-0&authSource=admin&appName=mindmayhem-cluster')
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err);
  process.exit(1);
});

// ============================================
// USER SCHEMA
// ============================================
const UserSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true, 
    minlength: 3,
    maxlength: 20
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  password: { 
    type: String, 
    required: true, 
    minlength: 6 
  },
  avatar: { 
    type: String, 
    default: '' 
  },
  isOnline: { 
    type: Boolean, 
    default: false 
  },
  lastSeen: { 
    type: Date, 
    default: Date.now 
  },
  gamesPlayed: { 
    type: Number, 
    default: 0 
  },
  gamesWon: { 
    type: Number, 
    default: 0 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

const User = mongoose.model('User', UserSchema);

// ============================================
// FRIEND SCHEMA
// ============================================
const FriendSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  friend: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Friend = mongoose.model('Friend', FriendSchema);

// ============================================
// NOTIFICATION SCHEMA - ADD THIS
// ============================================
const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['friend_request', 'friend_accept', 'room_invite'], 
    required: true 
  },
  message: { type: String, required: true },
  data: { type: Object, default: {} },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', NotificationSchema);

// ============================================
// ROOM SCHEMA
// ============================================
const RoomSchema = new mongoose.Schema({
  roomName: { type: String, required: true, trim: true },
  roomCode: { type: String, required: true, unique: true },
  gameMode: { type: String, required: true },
  maxPlayers: { type: Number, required: true, min: 4, max: 20 },
  rounds: { type: Number, required: true },
  roomType: { type: String, enum: ['public', 'private'], default: 'public' },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hostName: { type: String, required: true },
  status: { type: String, enum: ['waiting', 'playing', 'finished'], default: 'waiting' },
  players: [{
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String },
    avatar: { type: String },
    isHost: { type: Boolean, default: false },
    isReady: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  finishedAt: { type: Date }
});

const Room = mongoose.model('Room', RoomSchema);

// ============================================
// FILE UPLOAD CONFIGURATION
// ============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const isValid = allowedTypes.test(file.mimetype) && 
                   allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (isValid) {
      cb(null, true);
    } else {
      cb(new Error('Only images (jpeg, jpg, png, gif, webp) are allowed'));
    }
  }
});

// ============================================
// AUTH MIDDLEWARE - MOVED UP BEFORE ROUTES
// ============================================
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    req.user = user;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

// ============================================
// CREATE UPLOADS FOLDER
// ============================================
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// ============================================
// API ROUTES
// ============================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================
// AUTH ROUTES
// ============================================

// REGISTER
app.post('/api/register', upload.single('avatar'), async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: "Passwords don't match!" 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters' 
      });
    }

    const existingUser = await User.findOne({ 
      $or: [{ email: email.toLowerCase() }, { username }] 
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email already registered' 
        });
      }
      if (existingUser.username === username) {
        return res.status(400).json({ 
          success: false, 
          message: 'Username already taken' 
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      avatar: req.file ? `/uploads/${req.file.filename}` : '',
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
});

// LOGIN
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isOnline: user.isOnline,
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

// GET USER PROFILE
app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update Profile
app.put('/api/profile/update', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
      user.username = username;
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
      user.email = email.toLowerCase();
    }

    if (req.file) {
      user.avatar = `/uploads/${req.file.filename}`;
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to change password'
        });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters'
        });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

    const updatedUser = await User.findById(userId).select('-password');
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// LOGOUT
app.post('/api/logout', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, { isOnline: false });
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ============================================
// GAME STATS ROUTES
// ============================================

// Update Game Stats
app.post('/api/game/stats', authMiddleware, async (req, res) => {
  try {
    const { gamesPlayed, gamesWon } = req.body;
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (gamesPlayed !== undefined) {
      user.gamesPlayed = (user.gamesPlayed || 0) + gamesPlayed;
    }
    if (gamesWon !== undefined) {
      user.gamesWon = (user.gamesWon || 0) + gamesWon;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Stats updated successfully',
      user: {
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon
      }
    });
  } catch (error) {
    console.error('Update stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stats'
    });
  }
});

// Get Game Stats
app.get('/api/game/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      stats: {
        gamesPlayed: user.gamesPlayed || 0,
        gamesWon: user.gamesWon || 0
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stats'
    });
  }
});


// ============================================
// FRIEND ROUTES
// ============================================

// Get Friends List
app.get('/api/friends', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    const friends = await Friend.find({
      $or: [{ user: userId }, { friend: userId }],
      status: 'accepted'
    })
    .populate('user', 'username avatar isOnline')
    .populate('friend', 'username avatar isOnline');

    const friendList = friends.map(f => {
      const friendData = f.user._id.toString() === userId ? f.friend : f.user;
      return {
        _id: friendData._id,
        username: friendData.username,
        avatar: friendData.avatar,
        isOnline: friendData.isOnline || false
      };
    });

    const incomingRequests = await Friend.find({
      friend: userId,
      status: 'pending'
    }).populate('user', 'username avatar');

    const outgoingRequests = await Friend.find({
      user: userId,
      status: 'pending'
    }).populate('friend', 'username avatar');

    res.json({
      success: true,
      friends: friendList,
      incomingRequests: incomingRequests.map(r => ({
        id: r._id,
        user: r.user,
        createdAt: r.createdAt
      })),
      outgoingRequests: outgoingRequests.map(r => ({
        id: r._id,
        user: r.friend,
        createdAt: r.createdAt
      }))
    });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ success: false, message: 'Failed to get friends' });
  }
});

// Get User Suggestions
app.get('/api/users/suggestions', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    const allUsers = await User.find({ _id: { $ne: userId } })
      .select('username avatar isOnline')
      .limit(20);

    const existingFriends = await Friend.find({
      $or: [{ user: userId }, { friend: userId }]
    });

    const excludedIds = new Set();
    excludedIds.add(userId);
    existingFriends.forEach(f => {
      excludedIds.add(f.user.toString());
      excludedIds.add(f.friend.toString());
    });

    const suggestions = allUsers.filter(u => !excludedIds.has(u._id.toString()));

    res.json({
      success: true,
      users: suggestions
    });
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ success: false, message: 'Failed to get suggestions' });
  }
});

// Search Users
app.get('/api/users/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.userId;

    if (!q || q.length < 1) {
      return res.json({ success: true, users: [] });
    }

    const users = await User.find({
      _id: { $ne: userId },
      username: { $regex: q, $options: 'i' }
    })
    .select('username avatar isOnline')
    .limit(10);

    res.json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ success: false, message: 'Failed to search users' });
  }
});

// Send Friend Request
app.post('/api/friends/request/:userId', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const friendId = req.params.userId;

    if (userId === friendId) {
      return res.status(400).json({ success: false, message: 'Cannot add yourself' });
    }

    const existingRequest = await Friend.findOne({
      $or: [
        { user: userId, friend: friendId },
        { user: friendId, friend: userId }
      ]
    });

    if (existingRequest) {
      return res.status(400).json({ success: false, message: 'Request already exists' });
    }

    const friendRequest = new Friend({
      user: userId,
      friend: friendId,
      status: 'pending'
    });

    await friendRequest.save();

    const sender = await User.findById(userId);
    const notification = new Notification({
      user: friendId,
      type: 'friend_request',
      message: `${sender.username} sent you a friend request`,
      data: { requestId: friendRequest._id, userId: userId }
    });
    await notification.save();

    io.to(`user_${friendId}`).emit('notification', notification);

    res.json({
      success: true,
      message: 'Friend request sent'
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ success: false, message: 'Failed to send friend request' });
  }
});
app.get('/api/users/online', authMiddleware, async (req, res) => {
  try {
    const count = await User.countDocuments({ isOnline: true });
    const users = await User.find({ isOnline: true, _id: { $ne: req.userId } })
      .select('username avatar')
      .limit(50);
    res.json({ success: true, count, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get online users' });
  }
});
// Accept Friend Request
app.post('/api/friends/accept/:requestId', authMiddleware, async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const userId = req.userId;

    const request = await Friend.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.friend.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    request.status = 'accepted';
    await request.save();

    const receiver = await User.findById(userId);
    const notification = new Notification({
      user: request.user,
      type: 'friend_accept',
      message: `${receiver.username} accepted your friend request`,
      data: { friendId: userId }
    });
    await notification.save();

io.to(`user_${request.user.toString()}`).emit('notification', notification);

    res.json({
      success: true,
      message: 'Friend request accepted'
    });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ success: false, message: 'Failed to accept request' });
  }
});

// Reject Friend Request
app.post('/api/friends/reject/:requestId', authMiddleware, async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const userId = req.userId;

    const request = await Friend.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.friend.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Friend.findByIdAndDelete(requestId);

    res.json({
      success: true,
      message: 'Friend request rejected'
    });
  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject request' });
  }
});

// Cancel Friend Request
app.delete('/api/friends/request/:requestId', authMiddleware, async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const userId = req.userId;

    const request = await Friend.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Friend.findByIdAndDelete(requestId);

    res.json({
      success: true,
      message: 'Friend request cancelled'
    });
  } catch (error) {
    console.error('Cancel friend request error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel request' });
  }
});

// Check if friend request exists
app.get('/api/friends/request/:requestId', authMiddleware, async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const request = await Friend.findById(requestId);
    
    res.json({
      success: true,
      exists: !!request,
      status: request?.status || null
    });
  } catch (error) {
    console.error('Check friend request error:', error);
    res.json({
      success: true,
      exists: false
    });
  }
});

// ============================================
// NOTIFICATION ROUTES
// ============================================

// Get Notifications
app.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to get notifications' });
  }
});

// Mark Notification as Read
app.post('/api/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.userId;

    const notification = await Notification.findOne({ _id: notificationId, user: userId });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    // Also delete if it's a friend request that was already handled
    if (notification.type === 'friend_request' && notification.data?.requestId) {
      const request = await Friend.findById(notification.data.requestId);
      if (!request) {
        await Notification.findByIdAndDelete(notificationId);
        return res.json({
          success: true,
          message: 'Notification removed'
        });
      }
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
});

// Delete Notification
app.delete('/api/notifications/:id', authMiddleware, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.userId;

    const notification = await Notification.findOne({ _id: notificationId, user: userId });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await Notification.findByIdAndDelete(notificationId);

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
});

// ============================================
// GAME HISTORY ROUTES
// ============================================

// Get Game History
app.get('/api/game/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Find all rooms where user was a player
    const rooms = await Room.find({
      'players.id': userId,
      status: 'finished'
    })
    .populate('host', 'username avatar')
    .sort({ finishedAt: -1 })
    .limit(50);

    // Format history
    const history = rooms.map(room => {
      // Find user's rank in this room
      const sortedPlayers = [...room.players].sort((a, b) => {
        // Sort by score if available, otherwise by join time
        return (a.score || 0) - (b.score || 0);
      });
      
      const userIndex = sortedPlayers.findIndex(p => 
        p.id.toString() === userId
      );
      
      const rank = userIndex !== -1 ? `${userIndex + 1}${getRankSuffix(userIndex + 1)}` : 'N/A';
      const score = sortedPlayers[userIndex]?.score || 0;
      
      return {
        id: room._id,
        roomName: room.roomName,
        gameMode: room.gameMode,
        rank: rank,
        score: `${score} pts`,
        players: room.players.length,
        date: room.finishedAt || room.createdAt,
        timeAgo: getTimeAgo(room.finishedAt || room.createdAt)
      };
    });

    res.json({
      success: true,
      history: history
    });

  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch history'
    });
  }
});

// Helper function for rank suffix
function getRankSuffix(n) {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}

// Helper function for time ago
function getTimeAgo(date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
} 

// Mark All Notifications as Read
app.post('/api/notifications/read-all', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark all notifications as read' });
  }
});

// ============================================
// ROOM ROUTES
// ============================================

// Create Room
app.post('/api/rooms/create', authMiddleware, async (req, res) => {
  try {
    const { roomName, gameMode, maxPlayers, rounds, roomType } = req.body;
    const userId = req.userId;
    const user = req.user;

    if (!roomName || roomName.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Room name must be at least 3 characters'
      });
    }

    if (roomName.length > 30) {
      return res.status(400).json({
        success: false,
        message: 'Room name must be less than 30 characters'
      });
    }

    const generateRoomCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let roomCode;
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      roomCode = generateRoomCode();
      const existingRoom = await Room.findOne({ roomCode });
      if (!existingRoom) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate unique room code'
      });
    }

    const room = new Room({
      roomName: roomName.trim(),
      roomCode,
      gameMode,
      maxPlayers,
      rounds: parseInt(rounds) || 5,
      roomType: roomType || 'public',
      host: userId,
      hostName: user.username,
      players: [{
        id: userId,
        username: user.username,
        avatar: user.avatar || '',
        isHost: true,
        isReady: false
      }],
      status: 'waiting'
    });

    await room.save();

    const populatedRoom = await Room.findById(room._id)
      .populate('players.id', 'username avatar');

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      room: {
        id: room._id,
        roomId: room._id,
        roomName: room.roomName,
        roomCode: room.roomCode,
        gameMode: room.gameMode,
        maxPlayers: room.maxPlayers,
        rounds: room.rounds,
        roomType: room.roomType,
        host: {
          id: user._id,
          username: user.username,
          avatar: user.avatar
        },
        players: room.players.map(p => ({
          id: p.id?._id || p.id,
          username: p.username,
          avatar: p.avatar,
          isHost: p.isHost,
          isReady: p.isReady
        })),
        status: room.status,
        createdAt: room.createdAt
      }
    });

  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create room'
    });
  }
});

// Get All Rooms
app.get('/api/rooms', authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find({ 
      status: 'waiting',
      roomType: 'public'
    })
    .populate('host', 'username avatar')
    .populate('players.id', 'username avatar')
    .sort({ createdAt: -1 })
    .limit(50);

    const formattedRooms = rooms.map(room => ({
      _id: room._id,
      roomName: room.roomName,
      roomCode: room.roomCode,
      gameMode: room.gameMode,
      maxPlayers: room.maxPlayers,
      players: room.players,
      host: room.host,
      hostName: room.hostName,
      status: room.status,
      rounds: room.rounds,
      createdAt: room.createdAt
    }));

    res.json({
      success: true,
      rooms: formattedRooms
    });

  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rooms'
    });
  }
});

// Get Room by ID
app.get('/api/rooms/:roomId', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId)
      .populate('host', 'username avatar')
      .populate('players.id', 'username avatar');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.json({
      success: true,
      room: {
        id: room._id,
        roomName: room.roomName,
        roomCode: room.roomCode,
        gameMode: room.gameMode,
        maxPlayers: room.maxPlayers,
        rounds: room.rounds,
        roomType: room.roomType,
        host: room.host,
        players: room.players,
        status: room.status,
        createdAt: room.createdAt
      }
    });

  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch room'
    });
  }
});

// Join Room
app.post('/api/rooms/:roomId/join', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId;
    const user = req.user;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (room.players.length >= room.maxPlayers) {
      return res.status(400).json({
        success: false,
        message: 'Room is full'
      });
    }

    if (room.status !== 'waiting') {
      return res.status(400).json({
        success: false,
        message: 'Game already started'
      });
    }

  if (room.players.some(p => p.id.toString() === userId)) {
  return res.status(400).json({ success: false, message: 'Already in room' });
}
    room.players.push({
      id: userId,
      username: user.username,
      avatar: user.avatar || '',
      isHost: false,
      isReady: false
    });

    await room.save();

    const populatedRoom = await Room.findById(roomId)
      .populate('players.id', 'username avatar');

    res.json({
      success: true,
      message: 'Joined room successfully',
      room: populatedRoom
    });

  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join room'
    });
  }
});
app.post('/api/rooms/:roomId/ready', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId;
    const { isReady } = req.body;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const player = room.players.find(p => p.id.toString() === userId);
    if (!player) {
      return res.status(403).json({ success: false, message: 'Not in this room' });
    }

    player.isReady = !!isReady;
    await room.save();

    res.json({ success: true, isReady: player.isReady });
  } catch (error) {
    console.error('Toggle ready error:', error);
    res.status(500).json({ success: false, message: 'Failed to update ready status' });
  }
});
// Same as /leave, but reachable via sendBeacon (no custom headers allowed on unload)
app.post('/api/rooms/:roomId/leave-beacon', express.json(), async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).end();
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const userId = decoded.userId;

    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).end();

    room.players = room.players.filter(p => p.id.toString() !== userId);
    if (room.host.toString() === userId) {
      if (room.players.length > 0) {
        room.host = room.players[0].id;
        room.players[0].isHost = true;
      } else {
        await Room.findByIdAndDelete(req.params.roomId);
        return res.status(204).end();
      }
    }
    await room.save();
    res.status(204).end();
  } catch (error) {
    console.error('Leave-beacon error:', error);
    res.status(500).end();
  }
});
// Leave Room
app.post('/api/rooms/:roomId/leave', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    room.players = room.players.filter(p => p.id.toString() !== userId);
    
    if (room.host.toString() === userId) {
      if (room.players.length > 0) {
        room.host = room.players[0].id;
        room.players[0].isHost = true;
      } else {
        await Room.findByIdAndDelete(roomId);
        return res.json({
          success: true,
          message: 'Room deleted as host left'
        });
      }
    }

    await room.save();

    res.json({
      success: true,
      message: 'Left room successfully'
    });

  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave room'
    });
  }
});

// Start Game
// Start Game — any player in the room can start it once everyone's ready
// (not just the host, since the host may not be online/available)
app.post('/api/rooms/:roomId/start', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const isPlayerInRoom = room.players.some(p => p.id.toString() === userId);
    if (!isPlayerInRoom) {
      return res.status(403).json({ success: false, message: 'You must join the room before starting it' });
    }

    if (room.players.length < 2) {
      return res.status(400).json({ success: false, message: 'Need at least 2 players to start' });
    }

    const allReady = room.players.every(p => p.isReady === true);
    if (!allReady) {
      return res.status(400).json({ success: false, message: 'Not all players are ready' });
    }

    room.status = 'playing';
    room.startedAt = new Date();
    await room.save();

    res.json({ success: true, message: 'Game started successfully', room });
  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ success: false, message: 'Failed to start game' });
  }
});

// Invite Friend to Room
app.post('/api/rooms/:roomId/invite/:friendId', authMiddleware, async (req, res) => {
  try {
    const { roomId, friendId } = req.params;
    const userId = req.userId;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Any player already in the room can invite — not just the host
    const isPlayerInRoom = room.players.some(p => p.id.toString() === userId);
    if (!isPlayerInRoom) {
      return res.status(403).json({ success: false, message: 'You must be in the room to invite others' });
    }

    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({ success: false, message: 'Friend not found' });
    }

    const notification = new Notification({
      user: friendId,
      type: 'room_invite',
      message: `${req.user.username} invited you to join room: ${room.roomName}`,
      data: { roomId: roomId, roomName: room.roomName, inviter: userId }
    });
    await notification.save();

    io.to(`user_${friendId}`).emit('notification', notification);

    res.json({ success: true, message: 'Invitation sent' });
  } catch (error) {
    console.error('Invite friend error:', error);
    res.status(500).json({ success: false, message: 'Failed to send invitation' });
  }
});

 
// In-memory per-room game state. NOTE: resets if the server restarts —
// for production this should live in Redis or similar so long games
// survive a redeploy. Fine for local testing.
const ROUND_DURATION = 60; // seconds — MUST match ROUND_DURATION in GamePlay.jsx
const gameRooms = new Map(); // roomId -> gameState
 
const WORDS_BY_DIFFICULTY = {
  easy: ['CAT', 'DOG', 'HOUSE', 'CAR', 'APPLE', 'TREE', 'SUN', 'BOOK', 'PHONE', 'BALLOON', 'FISH', 'STAR']
};
const getWordChoices = (count = 3) => {
  const pool = [...WORDS_BY_DIFFICULTY.easy];
  const choices = [];
  while (choices.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    choices.push(pool.splice(idx, 1)[0]);
  }
  return choices;
};
 
const normalizeGuess = (text) =>
  (text || '').toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
 
const guessMatches = (guess, answer) => {
  const g = normalizeGuess(guess);
  const a = normalizeGuess(answer);
  if (!g || !a) return false;
  if (g === a) return true;
  if (g === a + 's' || g + 's' === a) return true;
  return false;
};
 
// Builds/fetches the authoritative state for a room, seeded from the real
// Room document (so player list + round count come from the DB, not the client).
const getOrCreateGameState = async (roomId) => {
  if (gameRooms.has(roomId)) return gameRooms.get(roomId);
 
  const room = await Room.findById(roomId).populate('players.id', 'username avatar');
  if (!room) return null;
 
  const artistOrder = room.players.map(p => (p.id?._id || p.id).toString());
 
  const state = {
    roomId,
    players: room.players.map(p => ({
      id: (p.id?._id || p.id).toString(),
      name: p.username || p.id?.username || 'Player'
    })),
    totalRounds: room.rounds || 5,
    currentRound: 1,
    artistOrder,
    artistIndex: 0,
    currentArtistId: artistOrder[0] || null,
    phase: 'wordSelect', // 'wordSelect' | 'playing' | 'roundEnd' | 'gameOver'
    word: null,
    roundStartAt: null,
    scores: {},
    roundScores: {},
    correctGuessers: [],
    tokens: {},
    timeoutHandle: null
  };
  state.players.forEach(p => { state.scores[p.id] = 0; state.tokens[p.id] = 0; });
 
  gameRooms.set(roomId, state);
  return state;
};
 
// What we broadcast to everyone — deliberately EXCLUDES `word`.
// Only the current artist's socket gets the word, sent separately.
const publicState = (state) => ({
  roomId: state.roomId,
  players: state.players,
  totalRounds: state.totalRounds,
  currentRound: state.currentRound,
  currentArtistId: state.currentArtistId,
  phase: state.phase,
  roundStartAt: state.roundStartAt,
  scores: state.scores,
  roundScores: state.roundScores,
  correctGuessers: state.correctGuessers,
  tokens: state.tokens
});
 
const endRound = (io, state, reason) => {
  if (state.phase === 'roundEnd' || state.phase === 'gameOver') return;
  if (state.timeoutHandle) { clearTimeout(state.timeoutHandle); state.timeoutHandle = null; }
 
  // Drawer points = average of what correct guessers scored (consolation floor if nobody guessed)
  const guesserScores = state.correctGuessers.map(id => state.roundScores[id] || 0);
  let drawerPts;
  if (guesserScores.length > 0) {
    drawerPts = Math.round(guesserScores.reduce((a, b) => a + b, 0) / guesserScores.length);
    drawerPts = Math.min(drawerPts, 800);
    const nonArtistCount = state.players.length - 1;
    if (nonArtistCount > 0 && state.correctGuessers.length === nonArtistCount) drawerPts += 300; // perfect bonus
  } else {
    drawerPts = 100;
  }
  if (state.currentArtistId) {
    state.scores[state.currentArtistId] = (state.scores[state.currentArtistId] || 0) + drawerPts;
    state.roundScores[state.currentArtistId] = (state.roundScores[state.currentArtistId] || 0) + drawerPts;
  }
 
  // Round winner (highest roundScore) earns a reward token
  let winnerId = null, winnerScore = -1;
  Object.entries(state.roundScores).forEach(([pid, pts]) => {
    if (pts > winnerScore) { winnerScore = pts; winnerId = pid; }
  });
  if (winnerId && winnerScore > 0) {
    state.tokens[winnerId] = (state.tokens[winnerId] || 0) + 1;
  }
 
  state.phase = 'roundEnd';
  io.to(`game_${state.roomId}`).emit('round-ended', {
    ...publicState(state),
    word: state.word, // safe to reveal now — round is over
    reason,
    roundWinnerId: winnerId
  });
};
 

// ============================================
// SOCKET.IO CONNECTION HANDLING
// ============================================
io.on('connection', async (socket) => {
  const userId = socket.userId; // set by the auth middleware above
  console.log('🟢 Client connected:', socket.id, 'user:', userId);

  socket.join(`user_${userId}`);

  if (!onlineSockets.has(userId)) onlineSockets.set(userId, new Set());
  const wasOffline = onlineSockets.get(userId).size === 0;
  onlineSockets.get(userId).add(socket.id);

  if (wasOffline) {
    try {
      await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
      socket.broadcast.emit('friend-online', userId);
    } catch (error) {
      console.error('User online error:', error);
    }
  }

  socket.on('disconnect', async () => {
    console.log('🔴 Client disconnected:', socket.id);
    const set = onlineSockets.get(userId);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) {
        onlineSockets.delete(userId);
        try {
          await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
          socket.broadcast.emit('friend-offline', userId);
        } catch (error) {
          console.error('User offline error:', error);
        }
      }
    }
  });

  
socket.on('join-game-room', async ({ roomId }) => {
  try {
    socket.join(`game_${roomId}`);
    socket.currentGameRoomId = roomId;
 
    const state = await getOrCreateGameState(roomId);
    if (!state) return;
 
    // Send the joiner the CURRENT state — this is what makes a mid-game
    // join land on round 2/3/etc instead of restarting at round 1.
    const isArtist = state.currentArtistId === userId;
    socket.emit('game-state-sync', {
      ...publicState(state),
      wordChoices: (isArtist && state.phase === 'wordSelect') ? getWordChoices() : undefined,
      word: isArtist ? state.word : undefined
    });
 
    socket.to(`game_${roomId}`).emit('player-joined-game', { userId });
  } catch (err) {
    console.error('join-game-room error:', err);
  }
});
 
socket.on('select-word', ({ roomId, word }) => {
  const state = gameRooms.get(roomId);
  if (!state || state.currentArtistId !== userId || state.phase !== 'wordSelect') return;
 
  state.word = word;
  state.phase = 'playing';
  state.roundStartAt = Date.now();
  state.correctGuessers = [];
  state.roundScores = {};
 
  io.to(`game_${roomId}`).emit('round-started', publicState(state));
 
  if (state.timeoutHandle) clearTimeout(state.timeoutHandle);
  state.timeoutHandle = setTimeout(() => endRound(io, state, 'timeout'), ROUND_DURATION * 1000);
});
 
socket.on('submit-guess', ({ roomId, guess }) => {
  const state = gameRooms.get(roomId);
  if (!state || state.phase !== 'playing') return;
  if (userId === state.currentArtistId) return; // drawer can never score a guess
  if (state.correctGuessers.includes(userId)) return; // already guessed correctly this round
 
  const player = state.players.find(p => p.id === userId);
  const isCorrect = guessMatches(guess, state.word || '');
 
  if (!isCorrect) {
    io.to(`game_${roomId}`).emit('guess-result', {
      playerId: userId, playerName: player?.name, guess, isCorrect: false
    });
    return;
  }
 
  const elapsed = Math.floor((Date.now() - state.roundStartAt) / 1000);
  const remaining = Math.max(ROUND_DURATION - elapsed, 0);
  let base = Math.round((1000 * remaining) / ROUND_DURATION);
  base = Math.max(base, 100);
  let bonus = 0;
  if (state.correctGuessers.length === 0) bonus += 200; // first guess
  if (elapsed <= 10) bonus += 150; // fast guess
  const total = base + bonus;
 
  state.correctGuessers.push(userId);
  state.scores[userId] = (state.scores[userId] || 0) + total;
  state.roundScores[userId] = (state.roundScores[userId] || 0) + total;
 
  io.to(`game_${roomId}`).emit('guess-result', {
    playerId: userId, playerName: player?.name, guess: state.word, isCorrect: true, points: total
  });
 
  const nonArtistCount = state.players.length - 1;
  if (state.correctGuessers.length >= nonArtistCount) {
    endRound(io, state, 'correct');
  }
});
 
socket.on('drawer-chat', ({ roomId, message }) => {
  const state = gameRooms.get(roomId);
  if (!state) return;
  const player = state.players.find(p => p.id === userId);
  io.to(`game_${roomId}`).emit('chat-message', { playerId: userId, playerName: player?.name, message });
});
 
// Relays drawing strokes to everyone else in the room (unchanged behavior,
// just moved under the authenticated `userId` naming for consistency)
socket.on('drawing-data', ({ roomId, ...strokeData }) => {
  socket.to(`game_${roomId}`).emit('drawing-data', strokeData);
});
 
socket.on('request-next-round', ({ roomId }) => {
  const state = gameRooms.get(roomId);
  if (!state || state.phase === 'gameOver') return;
 
  if (state.currentRound >= state.totalRounds) {
    state.phase = 'gameOver';
    io.to(`game_${roomId}`).emit('game-over', publicState(state));
    gameRooms.delete(roomId); // drop in-memory state once the game is over
    return;
  }
 
  state.currentRound += 1;
  state.artistIndex = (state.artistIndex + 1) % state.artistOrder.length;
  state.currentArtistId = state.artistOrder[state.artistIndex];
  state.phase = 'wordSelect';
  state.word = null;
  state.roundStartAt = null;
  state.correctGuessers = [];
  state.roundScores = {};
 
  // Only the new artist's socket(s) get word choices — send per-player
  state.players.forEach(p => {
    io.to(`user_${p.id}`).emit('next-round-ready', {
      ...publicState(state),
      wordChoices: p.id === state.currentArtistId ? getWordChoices() : undefined
    });
  });
});
 
socket.on('challenge-sent', ({ roomId, targetId, type, text }) => {
  io.to(`game_${roomId}`).emit('challenge-sent', { fromId: userId, targetId, type, text });
});
 
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });
});