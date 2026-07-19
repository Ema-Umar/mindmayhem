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
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mindmayhem')
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
// AUTH MIDDLEWARE
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

// REGISTER
app.post('/api/register', upload.single('avatar'), async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // Validation
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

    // Check existing user
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

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      avatar: req.file ? `/uploads/${req.file.filename}` : '',
    });

    await user.save();

    // Generate JWT
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

    // Update online status
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

// GET USER PROFILE (Protected)
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
// CREATE UPLOADS FOLDER
// ============================================
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

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
// ROOM ROUTES
// ============================================

// Create Room
app.post('/api/rooms/create', authMiddleware, async (req, res) => {
  try {
    const { roomName, gameMode, maxPlayers, rounds, roomType } = req.body;
    const userId = req.userId;
    const user = req.user;

    // Validation
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

    // Generate unique room code
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

    // Create room
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

    // Populate player data
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
      id: room._id,
      roomId: room._id,
      roomName: room.roomName,
      roomCode: room.roomCode,
      gameMode: room.gameMode,
      maxPlayers: room.maxPlayers,
      currentPlayers: room.players.length,
      roomType: room.roomType,
      host: room.host,
      players: room.players,
      status: room.status,
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

    // Check if room is full
    if (room.players.length >= room.maxPlayers) {
      return res.status(400).json({
        success: false,
        message: 'Room is full'
      });
    }

    // Check if room is still waiting
    if (room.status !== 'waiting') {
      return res.status(400).json({
        success: false,
        message: 'Game already started'
      });
    }

    // Check if user already in room
    if (room.players.some(p => p.id.toString() === userId)) {
      return res.status(400).json({
        success: false,
        message: 'Already in room'
      });
    }

    // Add player to room
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

    // Remove player from room
    room.players = room.players.filter(p => p.id.toString() !== userId);
    
    // If host leaves, assign new host or delete room
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