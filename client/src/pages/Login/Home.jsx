import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Users, History, User, Bell, Settings, Crown, LogOut, Plus, Gamepad2, RefreshCw } from 'lucide-react';
import axios from 'axios';
import './Home.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [activeTab, setActiveTab] = useState('lobby');
  const [refreshing, setRefreshing] = useState(false);
  const isMounted = useRef(true);

  const API_URL = 'http://localhost:5000/api';

  // Get emoji based on game mode
  const getRoomEmoji = useCallback((gameMode) => {
    const emojis = {
      'normal': '🎨',
      'speed': '⚡',
      'dare': '😈',
      'trivia': '🧠',
      'Draw & Guess': '🎨',
      'Truth or Dare': '😈',
      'AI Challenge': '🤖'
    };
    return emojis[gameMode?.toLowerCase()] || '🎮';
  }, []);

  // Fetch user data
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
          headers: {
            'Authorization': `Bearer ${token}`
          }
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

  // Fetch rooms from BACKEND
  const fetchRooms = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Try to fetch from backend API
      const response = await axios.get(`${API_URL}/rooms`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success && response.data.rooms) {
        // Format rooms from backend
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
        console.log('✅ Rooms fetched from backend:', formattedRooms.length);
      } else {
        // If backend returns no rooms, try localStorage as fallback
        const localRooms = JSON.parse(localStorage.getItem('rooms') || '[]');
        if (localRooms.length > 0) {
          const formattedLocalRooms = localRooms.map(room => {
            const playerCount = room.players?.length || 1;
            const maxPlayers = room.maxPlayers || 10;
            
            return {
              id: room.id || room.roomId,
              roomId: room.roomId || room.id,
              name: room.roomName || room.name || 'Game Room',
              roomCode: room.roomCode || 'XXXXXX',
              emoji: getRoomEmoji(room.gameMode),
              round: `0 / ${room.rounds || 5}`,
              players: `${playerCount} / ${maxPlayers}`,
              hasCrown: room.host === user?._id || room.host === user?.id,
              host: room.hostName || room.host?.username || 'Unknown',
              gameMode: room.gameMode || 'Normal',
              status: room.status || 'waiting',
              maxPlayers: maxPlayers,
              rounds: room.rounds || 5,
              playersList: room.players || []
            };
          });
          setRooms(formattedLocalRooms);
          console.log('📦 Rooms fetched from localStorage:', formattedLocalRooms.length);
        } else {
          setRooms([]);
        }
      }
    } catch (error) {
      console.error('Error fetching rooms from backend:', error);
      
      // Fallback to localStorage
      try {
        const localRooms = JSON.parse(localStorage.getItem('rooms') || '[]');
        if (localRooms.length > 0) {
          const formattedLocalRooms = localRooms.map(room => {
            const playerCount = room.players?.length || 1;
            const maxPlayers = room.maxPlayers || 10;
            
            return {
              id: room.id || room.roomId,
              roomId: room.roomId || room.id,
              name: room.roomName || room.name || 'Game Room',
              roomCode: room.roomCode || 'XXXXXX',
              emoji: getRoomEmoji(room.gameMode),
              round: `0 / ${room.rounds || 5}`,
              players: `${playerCount} / ${maxPlayers}`,
              hasCrown: room.host === user?._id || room.host === user?.id,
              host: room.hostName || room.host?.username || 'Unknown',
              gameMode: room.gameMode || 'Normal',
              status: room.status || 'waiting',
              maxPlayers: maxPlayers,
              rounds: room.rounds || 5,
              playersList: room.players || []
            };
          });
          setRooms(formattedLocalRooms);
          console.log('📦 Fallback: Rooms from localStorage:', formattedLocalRooms.length);
        } else {
          setRooms([]);
        }
      } catch (localError) {
        console.error('Error reading localStorage:', localError);
        setRooms([]);
      }
    }
  }, [API_URL, user, getRoomEmoji]);

  // Handle join room
  const handleJoinRoom = useCallback((roomId, roomName) => {
    if (!roomId) {
      alert('Invalid room ID');
      return;
    }

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
    } else {
      alert('Room not found. Please try again.');
    }
  }, [rooms, user, navigate]);

  // Handle create room
  const handleCreateRoom = useCallback(() => {
    navigate('/create-room');
  }, [navigate]);

  // Handle quick play
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
      alert('No rooms available! Create a new room.');
      handleCreateRoom();
    }
  }, [rooms, handleJoinRoom, handleCreateRoom]);

  // Refresh rooms manually
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRooms();
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  }, [fetchRooms]);

  // Handle logout
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('currentRoom');
    navigate('/login');
  }, [navigate]);

  // Load data on mount
  useEffect(() => {
    isMounted.current = true;
    
    const loadData = async () => {
      setLoading(true);
      await fetchUserData();
      await fetchRooms();
      setLoading(false);
    };
    
    loadData();

    return () => {
      isMounted.current = false;
    };
  }, []);

  // Refresh rooms every 30 seconds
  useEffect(() => {
    if (loading) return;
    
    const interval = setInterval(() => {
      fetchRooms();
    }, 30000);

    return () => clearInterval(interval);
  }, [loading, fetchRooms]);

  if (loading) {
    return (
      <div className="dashboard-container loading">
        <div className="loader">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo">🎮 MINDMAYHEM</div>
        <nav className="nav-menu">
          <button 
            className={`nav-item ${activeTab === 'lobby' ? 'active' : ''}`}
            onClick={() => setActiveTab('lobby')}
          >
            <Home size={22} />
            <span>Lobby</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            <Users size={22} />
            <span>Friends</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={22} />
            <span>History</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={22} />
            <span>Profile</span>
          </button>
          <button 
            className="nav-item logout-btn"
            onClick={handleLogout}
          >
            <LogOut size={22} />
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Header Profile Section */}
        <header className="header">
          <div className="profile-section">
            <div className="avatar-wrapper">
              <img 
                src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username || 'default'}`}
                alt={user?.username || 'Avatar'} 
                className="avatar" 
              />
              <span className="online-status"></span>
            </div>
            <div className="profile-info">
              <div className="profile-meta">
                <span className="username">{user?.username || 'Guest'}</span>
                <span className="level">Level {Math.floor((user?.gamesWon || 0) / 5) + 1}</span>
                <span className="games-played">{user?.gamesPlayed || 0} games played</span>
              </div>
              <div className="progress-container">
                <div className="progress-bar" style={{ width: `${Math.min(((user?.gamesWon || 0) % 5) * 20, 100)}%` }}></div>
                <span className="progress-text">{user?.gamesWon || 0} wins</span>
              </div>
            </div>
          </div>

          <div className="header-actions">
            <button className="action-btn" onClick={() => alert('Notifications coming soon!')}>
              <Bell size={20} />
              <span className="notification-badge">3</span>
            </button>
            <button className="action-btn" onClick={() => setActiveTab('profile')}>
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="hero-card">
          <div className="hero-text">
            <h2>Ready to Play, {user?.username || 'Gamer'}? 🎯</h2>
            <p>Join a room or create your own and invite friends!</p>
            <div className="hero-stats">
              <span>🏆 {user?.gamesWon || 0} Wins</span>
              <span>🎮 {user?.gamesPlayed || 0} Games</span>
              <span>📊 {rooms.length} Active Rooms</span>
            </div>
          </div>
          <div className="hero-art">
            <div className="splash-art">🎨</div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="action-cards">
          <div className="card quick-play" onClick={handleQuickPlay}>
            <Gamepad2 size={30} />
            <h3>QUICK PLAY</h3>
            <p>Find a random room</p>
          </div>
          <div className="card create-room" onClick={handleCreateRoom}>
            <Plus size={30} />
            <h3>CREATE ROOM</h3>
            <p>Make your own room</p>
          </div>
        </section>

        {/* Rooms Section */}
        <section className="rooms-section">
          <div className="section-header">
            <h3>AVAILABLE ROOMS ({rooms.filter(r => r.status !== 'playing').length})</h3>
            <div className="header-actions-right">
              <button 
                className="refresh-btn" 
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
                <span>Refresh</span>
              </button>
              <button className="see-all" onClick={() => setActiveTab('lobby')}>
                See All
              </button>
            </div>
          </div>

          <div className="rooms-list">
            {rooms.length === 0 ? (
              <div className="empty-state">
                <p>No rooms available. Create one!</p>
                <button className="create-room-btn" onClick={handleCreateRoom}>
                  Create Room
                </button>
              </div>
            ) : (
              rooms.map((room) => {
                const isFull = room.players ? parseInt(room.players.split(' / ')[0]) >= parseInt(room.players.split(' / ')[1]) : false;
                const isPlaying = room.status === 'playing';
                const roomId = room.id || room.roomId;
                
                return (
                  <div key={roomId} className={`room-row ${isPlaying ? 'room-playing' : ''}`}>
                    <div className="room-details">
                      <div className={`room-icon icon-bg-${String(roomId).slice(-1) || 1}`}>
                        {room.emoji || '🎮'}
                      </div>
                      <div className="room-meta">
                        <h4>
                          {room.name || 'Game Room'} 
                          {room.hasCrown && <Crown size={14} className="crown-icon" />}
                          {isPlaying && <span className="status-badge playing">🔴 LIVE</span>}
                          {isFull && <span className="status-badge full">FULL</span>}
                        </h4>
                        <p>Round {room.round || '0 / 5'} • {room.gameMode || 'Normal'}</p>
                        <p className="room-host">Host: {room.host || 'Unknown'}</p>
                      </div>
                    </div>
                    
                    <div className="room-status">
                      <span className="player-count">{room.players || '0 / 10'}</span>
                      <button 
                        className={`join-btn ${isFull || isPlaying ? 'disabled' : ''}`}
                        onClick={() => {
                          if (!isFull && !isPlaying) {
                            handleJoinRoom(roomId, room.name);
                          } else if (isFull) {
                            alert('This room is full!');
                          } else if (isPlaying) {
                            alert('Game already started!');
                          }
                        }}
                        disabled={isFull || isPlaying}
                      >
                        {isPlaying ? 'PLAYING' : isFull ? 'FULL' : 'JOIN'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;