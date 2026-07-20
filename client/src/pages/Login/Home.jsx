import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Users, History, User, Bell, Settings, Crown, LogOut, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { connectSocket, getSocket, disconnectSocket } from '../../socket';
import './Home.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [activeTab, setActiveTab] = useState('lobby');
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const isMounted = useRef(true);

  const API_URL = 'http://localhost:5000/api';

  const getRoomEmoji = useCallback((gameMode) => {
    const emojis = {
      'normal': '🎨',
      'speed': '⚡',
      'dare': '😈',
      'trivia': '🧠',
      'draw & guess': '🎨',
      'truth or dare': '😈',
      'ai challenge': '🤖'
    };
    return emojis[gameMode?.toLowerCase()] || '🎮';
  }, []);

  const fetchUserData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return null;
      }

      const storedUser = localStorage.getItem('user');
      let userData = null;

      if (storedUser) {
        userData = JSON.parse(storedUser);
        setUser(userData);
      }

      try {
        const response = await axios.get(`${API_URL}/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.data.success) {
          userData = response.data.user;
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        }
      } catch (apiError) {
        console.log('Using cached user data');
      }

      return userData;
    } catch (error) {
      console.error('Error fetching user data:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
      return null;
    }
  }, [API_URL, navigate]);

  const fetchRooms = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return [];

      const response = await axios.get(`${API_URL}/rooms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success && response.data.rooms) {
        const formattedRooms = response.data.rooms.map(room => {
          const playerCount = room.players?.length || 1;
          const maxPlayers = room.maxPlayers || 10;

          return {
            id: room._id || room.id,
            roomId: room._id || room.id,
            name: room.roomName || room.name || 'Game Room',
            roomCode: room.roomCode || 'XXXXXX',
            emoji: getRoomEmoji(room.gameMode),
            round: `0 / ${room.rounds || 5}`,
            players: `${playerCount} / ${maxPlayers}`,
            hasCrown: room.host?._id === user?._id || room.host === user?._id,
            host: room.host?.username || room.hostName || 'Unknown',
            gameMode: room.gameMode || 'Normal',
            status: room.status || 'waiting',
            maxPlayers: maxPlayers,
            rounds: room.rounds || 5,
            playersList: room.players || []
          };
        });

        setRooms(formattedRooms);
        return formattedRooms;
      }
      return [];
    } catch (error) {
      console.error('Error fetching rooms:', error);
      return [];
    }
  }, [API_URL, user, getRoomEmoji]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setUnreadCount(res.data.notifications.filter(n => !n.isRead).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [API_URL]);

  const handleJoinRoom = useCallback((roomId, roomName) => {
    if (!roomId) return;
    const roomToJoin = rooms.find(r => r.id === roomId || r.roomId === roomId);

    if (roomToJoin) {
      const roomData = {
        roomId: String(roomId),
        id: String(roomId),
        roomName: roomToJoin.name || roomName || 'Game Room',
        roomCode: roomToJoin.roomCode || 'XXXXXX',
        gameMode: roomToJoin.gameMode || 'Normal',
        maxPlayers: roomToJoin.maxPlayers || 10,
        rounds: roomToJoin.rounds || 5,
        status: roomToJoin.status || 'waiting',
        host: roomToJoin.host || user?.id,
        hostName: roomToJoin.host || user?.username || 'Host',
        players: roomToJoin.playersList || []
      };

      localStorage.setItem('currentRoom', JSON.stringify(roomData));
      navigate(`/room/${roomId}`);
    }
  }, [rooms, user, navigate]);

  const handleCreateRoom = useCallback(() => {
    navigate('/create-room');
  }, [navigate]);

  const handleQuickPlay = useCallback(() => {
    const availableRooms = rooms.filter(room => {
      if (!room.players) return false;
      const [current, max] = room.players.split(' / ').map(Number);
      return current < max && room.status !== 'playing';
    });

    if (availableRooms.length > 0) {
      const randomRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];
      handleJoinRoom(randomRoom.id || randomRoom.roomId, randomRoom.name);
    } else {
      handleCreateRoom();
    }
  }, [rooms, handleJoinRoom, handleCreateRoom]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRooms();
    setTimeout(() => setRefreshing(false), 500);
  }, [fetchRooms]);

  const handleLogout = useCallback(() => {
    disconnectSocket();
    localStorage.clear();
    navigate('/login');
  }, [navigate]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await fetchUserData();
        await fetchRooms();
        await fetchUnreadCount();
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => { fetchRooms(); }, 30000);
    return () => clearInterval(interval);
  }, [loading, fetchRooms]);

  useEffect(() => {
    if (loading) return;
    const socket = connectSocket();
    if (socket) {
      socket.on('notification', () => { setUnreadCount(prev => prev + 1); });
    }
    return () => {
      const s = getSocket();
      if (s) s.off('notification');
    };
  }, [loading]);

  if (loading) {
    return (
      <div className="dashboard-layout loading-state">
        <div className="loader-spinner">Loading interface...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* 1. Top Navbar Layout Block */}
      <nav className="top-navigation-bar">
        <div className="brand-logo" onClick={() => navigate('/')}>
          MindMay<span>Hem</span>
        </div>
        
        <div className="center-menu-pills">
          <button className={`menu-pill ${activeTab === 'lobby' ? 'active' : ''}`} onClick={() => setActiveTab('lobby')}>
            <Home size={16} /> <span>Lobby</span>
          </button>
          <button className="menu-pill" onClick={() => navigate('/friends')}>
            <Users size={16} /> <span>Friends</span>
          </button>
          <button className="menu-pill" onClick={() => navigate('/history')}>
            <History size={16} /> <span>History</span>
          </button>
          <button className="menu-pill" onClick={() => navigate('/profile')}>
            <User size={16} /> <span>Profile</span>
          </button>
          <button className="menu-pill logout-pill" onClick={handleLogout}>
            <LogOut size={16} /> <span>Logout</span>
          </button>
        </div>

        <div className="navbar-right-avatar">
          <img 
            src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username || 'default'}`} 
            alt="User Graphic" 
          />
        </div>
      </nav>

      <div className="dashboard-content-frame">
        {/* 2. Sub-Header Profile Metrics Row */}
        <header className="player-sub-profile-header">
          <div className="player-meta-block">
            <div className="player-avatar-circle">
              <img 
                src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username || 'default'}`} 
                alt="Profile" 
              />
            </div>
            <div className="player-stats-column">
              <h3 className="player-display-name">{user?.username || 'Gamer'}</h3>
              <div className="player-level-row">
                <span>Level {Math.floor((user?.gamesWon || 0) / 5) + 1}</span>
                <span className="divider-dot">•</span>
                <span>{user?.gamesWon || 0} / 1200 XP</span>
              </div>
              <div className="mini-xp-bar-track">
                <div className="mini-xp-bar-fill" style={{ width: `${Math.min(((user?.gamesWon || 0) % 5) * 20 || 15, 100)}%` }}></div>
              </div>
            </div>
          </div>

          <div className="quick-system-actions">
            <button className="icon-circle-action-btn" onClick={() => navigate('/notifications')}>
              <Bell size={18} />
              {unreadCount > 0 && <span className="action-badge-dot">{unreadCount}</span>}
            </button>
            <button className="icon-circle-action-btn" onClick={() => navigate('/profile')}>
              <Settings size={18} />
            </button>
            <button className="icon-circle-action-btn refresh-sync-btn" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
            </button>
          </div>
        </header>

        {/* 3. Hero Card/Banner with Embedded Pill Buttons */}
        <section className="horizontal-hero-banner">
          <div className="hero-banner-left-content">
            <h2>Ready to Play?</h2>
            <p>Join a room or create your own and invite friends for a doodle showdown.</p>
            
            <div className="embedded-hero-actions-row">
              <button className="hero-action-pill quick-play-pink-btn" onClick={handleQuickPlay}>
                QUICK PLAY
              </button>
              <button className="hero-action-pill create-room-cyan-btn" onClick={handleCreateRoom}>
                CREATE ROOM
              </button>
            </div>
          </div>

          <div className="hero-banner-right-artwork">
            <div className="floating-palette-icon">🎨</div>
          </div>
        </section>

        {/* 4. Two-Column Active Rooms Grid Block */}
        <section className="active-rooms-grid-wrapper">
          <div className="rooms-section-headline">
            <h3>Active Rooms</h3>
            <span className="see-all-trigger-link" onClick={() => handleRefresh()}>See All</span>
          </div>

          <div className="two-column-rooms-grid">
            {rooms.length === 0 ? (
              <div className="empty-rooms-card">
                <p>No active rooms setup yet. Create one to begin!</p>
              </div>
            ) : (
              rooms.slice(0, 4).map((room) => {
                const isFull = room.players ? parseInt(room.players.split(' / ')[0]) >= parseInt(room.players.split(' / ')[1]) : false;
                const isPlaying = room.status === 'playing';
                const roomId = room.id || room.roomId;

                return (
                  <div key={roomId} className="grid-room-card-cell">
                    <div className="card-left-identity-group">
                      <div className={`card-avatar-emoji icon-bg-variant-${String(roomId).slice(-1) || '1'}`}>
                        {room.emoji || '🎨'}
                      </div>
                      <div className="card-room-meta-details">
                        <h4>
                          {room.name || 'Game Room'}
                          {room.hasCrown && <Crown size={12} className="meta-crown-icon" />}
                        </h4>
                        <p>Round {room.round?.split(' / ')[1] || 5} • {room.players || '0/10'} players</p>
                      </div>
                    </div>

                    <button 
                      className={`grid-join-action-btn ${isFull || isPlaying ? 'disabled-status' : ''}`}
                      disabled={isFull || isPlaying}
                      onClick={() => handleJoinRoom(roomId, room.name)}
                    >
                      {isPlaying ? 'PLAYING' : isFull ? 'FULL' : 'JOIN'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;