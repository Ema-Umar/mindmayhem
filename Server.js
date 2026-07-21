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

    io.to(friendId).emit('notification', notification);

    res.json({
      success: true,
      message: 'Friend request sent'
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ success: false, message: 'Failed to send friend request' });
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

    io.to(request.user.toString()).emit('notification', notification);

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
      return res.status(400).json({
        success: false,
        message: 'Already in room'
      });
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
app.post('/api/rooms/:roomId/start', authMiddleware, async (req, res) => {
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

    if (room.host.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the host can start the game'
      });
    }

    if (room.players.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Need at least 2 players to start'
      });
    }

    const allReady = room.players.every(p => p.isReady === true);
    if (!allReady) {
      return res.status(400).json({
        success: false,
        message: 'Not all players are ready'
      });
    }

    room.status = 'playing';
    room.startedAt = new Date();
    await room.save();

    res.json({
      success: true,
      message: 'Game started successfully',
      room: room
    });

  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start game'
    });
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

    if (room.host.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Only the host can invite' });
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

    io.to(friendId).emit('notification', notification);

    res.json({
      success: true,
      message: 'Invitation sent'
    });
  } catch (error) {
    console.error('Invite friend error:', error);
    res.status(500).json({ success: false, message: 'Failed to send invitation' });
  }
});

// ============================================
// SOCKET.IO CONNECTION HANDLING
// ============================================
io.on('connection', (socket) => {
  console.log('🟢 Client connected:', socket.id);

  socket.on('userOnline', async (userId) => {
    try {
      await User.findByIdAndUpdate(userId, { isOnline: true });
      socket.userId = userId;
      socket.join(`user_${userId}`);
      socket.broadcast.emit('friend-online', userId);
    } catch (error) {
      console.error('User online error:', error);
    }
  });

  socket.on('disconnect', async () => {
    console.log('🔴 Client disconnected:', socket.id);
    if (socket.userId) {
      try {
        await User.findByIdAndUpdate(socket.userId, { isOnline: false });
        socket.broadcast.emit('friend-offline', socket.userId);
      } catch (error) {
        console.error('User offline error:', error);
      }
    }
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