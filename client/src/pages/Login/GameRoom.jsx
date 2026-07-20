import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Share2, Settings, Copy, Check, Crown, Users, AlertCircle, UserPlus, Send } from 'lucide-react';
import { connectSocket, getSocket } from '../../socket';
import './GameRoom.css';

const API_URL = 'http://localhost:5000/api';

const GameRoom = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [user, setUser] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');
  const [readyStatus, setReadyStatus] = useState({});
  const [gameStarting, setGameStarting] = useState(false);
  const [isSoloMode, setIsSoloMode] = useState(false);

  // Toggle drawer for the invitation panel since it's a single column look now!
  const [showInviteDrawer, setShowInviteDrawer] = useState(false);
  const [onlineFriends, setOnlineFriends] = useState([]);
  const [invitedIds, setInvitedIds] = useState(new Set());
  const [invitingId, setInvitingId] = useState(null);

  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  useEffect(() => {
    const fetchRoomData = () => {
      try {
        setLoading(true);
        setError('');

        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(storedUser);

        let foundRoom = JSON.parse(localStorage.getItem('currentRoom') || 'null');
        
        if (!foundRoom || (foundRoom.roomId !== roomId && foundRoom.id !== roomId && foundRoom._id !== roomId)) {
          const allRooms = JSON.parse(localStorage.getItem('rooms') || '[]');
          foundRoom = allRooms.find(r => 
            r.roomId === roomId || r.id === roomId || r._id === roomId
          );
          
          if (foundRoom) {
            localStorage.setItem('currentRoom', JSON.stringify(foundRoom));
          }
        }

        if (!foundRoom) {
          const userId = storedUser.id || storedUser._id || 'user_' + Date.now();
          const newRoom = {
            roomId: roomId,
            id: roomId,
            _id: roomId,
            roomName: roomId?.replace(/-/g, ' ') || 'Game Room',
            roomCode: 'ABCD12',
            gameMode: 'Normal',
            maxPlayers: 10,
            rounds: 5,
            status: 'waiting',
            host: userId,
            hostName: storedUser.username || 'You',
            players: [{
              id: userId,
              _id: userId,
              username: storedUser.username || 'You',
              name: storedUser.username || 'You',
              isHost: true,
              isReady: true
            }]
          };
          
          const allRooms = JSON.parse(localStorage.getItem('rooms') || '[]');
          allRooms.push(newRoom);
          localStorage.setItem('rooms', JSON.stringify(allRooms));
          localStorage.setItem('currentRoom', JSON.stringify(newRoom));
          foundRoom = newRoom;
        }

        setRoom(foundRoom);
        
        let roomPlayers = foundRoom.players || [];
        if (roomPlayers.length === 0 && foundRoom.host) {
          const hostId = foundRoom.host._id || foundRoom.host;
          roomPlayers = [{
            id: hostId,
            _id: hostId,
            username: foundRoom.hostName || foundRoom.host?.username || 'Host',
            name: foundRoom.hostName || foundRoom.host?.username || 'Host',
            isHost: true,
            isReady: true
          }];
        }

        const formattedPlayers = roomPlayers.map(p => {
          const playerId = p.id || p._id;
          const isYou = playerId === (storedUser.id || storedUser._id);
          return {
            id: playerId,
            name: p.username || p.name || 'Player',
            avatarSeed: p.username || p.name || 'Player',
            isHost: p.isHost || false,
            isReady: p.isReady !== undefined ? p.isReady : true,
            isYou: isYou
          };
        });

        setPlayers(formattedPlayers);
        
        const hostId = foundRoom.host?._id || foundRoom.host;
        const userId = storedUser.id || storedUser._id;
        setIsHost(String(hostId) === String(userId));
        
        const readyMap = {};
        formattedPlayers.forEach(p => {
          readyMap[p.id] = p.isReady !== undefined ? p.isReady : true;
        });
        setReadyStatus(readyMap);
        setIsSoloMode(formattedPlayers.length === 1);
        
      } catch (err) {
        console.error('Error fetching room:', err);
        setError('Failed to load room data.');
      } finally {
        setLoading(false);
      }
    };

    fetchRoomData();
  }, [roomId, navigate]);

  useEffect(() => {
    const loadOnlineFriends = async () => {
      try {
        const res = await axios.get(`${API_URL}/friends`, authHeaders());
        if (res.data.success) {
          setOnlineFriends((res.data.friends || []).filter(f => f.isOnline));
        }
      } catch (err) {
        console.error('Failed to load friends:', err);
      }
    };

    loadOnlineFriends();
    const socket = connectSocket();
    if (socket) {
      socket.on('friend-online', loadOnlineFriends);
      socket.on('friend-offline', loadOnlineFriends);
    }

    return () => {
      const s = getSocket();
      if (s) {
        s.off('friend-online', loadOnlineFriends);
        s.off('friend-offline', loadOnlineFriends);
      }
    };
  }, []);

  const handleInviteFriend = async (friendId) => {
    setInvitingId(friendId);
    try {
      await axios.post(`${API_URL}/rooms/${roomId}/invite/${friendId}`, {}, authHeaders());
      setInvitedIds(prev => new Set(prev).add(friendId));
    } catch (err) {
      console.error('Invite error:', err);
    } finally {
      setInvitingId(null);
    }
  };

  const handleCopyCode = () => {
    const code = room?.roomCode || 'XXXXXX';
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareRoom = async () => {
    const roomLink = `${window.location.origin}/room/${roomId}`;
    const code = room?.roomCode || 'XXXXXX';
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Join my room`,
          text: `Join with code: ${code}`,
          url: roomLink
        });
      } else {
        await navigator.clipboard.writeText(`Join: ${roomLink}\nCode: ${code}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.log('Share error');
    }
  };

  const handleToggleReady = () => {
    const userId = user?.id || user?._id;
    if (!userId) return;

    const newReadyStatus = !readyStatus[userId];
    setReadyStatus(prev => ({ ...prev, [userId]: newReadyStatus }));

    setPlayers(prev => prev.map(p => p.id === userId ? { ...p, isReady: newReadyStatus } : p));

    const currentRoom = JSON.parse(localStorage.getItem('currentRoom') || 'null');
    if (currentRoom) {
      currentRoom.players = currentRoom.players?.map(p => {
        const pId = p.id || p._id;
        return pId === userId ? { ...p, isReady: newReadyStatus } : p;
      });
      localStorage.setItem('currentRoom', JSON.stringify(currentRoom));
    }
  };

  const allPlayersReady = () => players.length > 0 && players.every(p => p.isReady);
  const hasMinimumPlayers = () => players.length >= 1;
  const getReadyCount = () => players.filter(p => p.isReady).length;

  const handleStartGame = () => {
    if (isSoloMode) {
      setGameStarting(true);
      setTimeout(() => {
        navigate(`/gameplay/${roomId}`, { state: { roomId, players, isSolo: true } });
      }, 500);
      return;
    }

    if (!isHost) return;
    if (!allPlayersReady() || !hasMinimumPlayers()) return;

    setGameStarting(true);
    setTimeout(() => {
      navigate(`/gameplay/${roomId}`, { state: { roomId, players, isSolo: false } });
    }, 500);
  };

  if (loading) return <div className="std-lobby-container central-status">Loading Room Pipeline...</div>;
  if (error) return <div className="std-lobby-container central-status">{error}</div>;

  return (
    <div className="std-lobby-container">
      {/* Top Header Buttons */}
      <header className="std-lobby-navbar">
        <button className="std-nav-icon-btn" onClick={() => navigate('/Home')}>
          <ArrowLeft size={24} />
        </button>
        <div className="std-nav-right-actions">
          <button className="std-nav-icon-btn" onClick={() => setShowInviteDrawer(true)}>
            <UserPlus size={22} />
          </button>
          <button className="std-nav-icon-btn" onClick={handleShareRoom}>
            <Share2 size={22} />
          </button>
          <button className="std-nav-icon-btn" onClick={() => alert('Settings coming soon!')}>
            <Settings size={22} />
          </button>
        </div>
      </header>

      {/* Main Column Content Dashboard */}
      <div className="std-lobby-centered-content">
        
        {/* Room Identity Branding */}
        <div className="std-lobby-identity-block">
          <Crown size={28} className="std-brand-crown" />
          <h1 className="std-room-heading-title">{room?.roomName || 'FUN ROOM'}</h1>
        </div>

        {/* Room Code Selector Component Box */}
        <div className="std-code-wrapper-stack">
          <span className="std-code-subheading-label">ROOM CODE</span>
          <div className="std-code-interactive-pill" onClick={handleCopyCode}>
            <span className="std-code-chars">{room?.roomCode || 'XXXXXX'}</span>
            {copied ? <Check size={16} className="cyan-tick" /> : <Copy size={16} />}
          </div>
        </div>

        {/* Players List Heading Count Row */}
        <div className="std-players-count-row">
          <h3>Players <span className="count-muted">({players.length}/{room?.maxPlayers || 10})</span></h3>
        </div>

        {/* Dynamic Connected Seat Row Stack list map */}
        <div className="std-players-vertical-list">
          {players.map((player) => {
            const isReady = readyStatus[player.id] || false;
            return (
              <div key={player.id} className={`std-player-row-card ${player.isYou ? 'self-identity' : ''}`}>
                <div className="std-player-row-left">
                  <img 
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${player.avatarSeed || player.name}`}
                    alt={player.name}
                    className="std-player-circle-avatar"
                  />
                  <span className="std-player-label-name">
                    {player.name} {player.isYou && '(You)'}
                  </span>
                </div>
                
                <div className="std-player-row-right">
                  {player.isHost ? (
                    <span className="std-row-status-text host-tag">ROOM OWNER</span>
                  ) : isReady ? (
                    <span className="std-row-status-text ready-tag">READY</span>
                  ) : (
                    <span className="std-row-status-text waiting-tag">NOT READY</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Absolute Lower Ticker Context message text layout info */}
        <div className="std-lobby-lower-footer-trigger-block">
          <p className="std-waiting-ticker-message">
            {room?.status === 'playing' ? 'Game in progress...' : allPlayersReady() ? 'Ready to launch sequence!' : 'Waiting for players...'}
          </p>

          {/* Large Fixed Styling Full Width Bottom Setup Action Button */}
          {(isHost || isSoloMode) ? (
            <button 
              className={`std-bottom-action-btn ${allPlayersReady() || isSoloMode ? 'action-active' : ''}`}
              onClick={handleStartGame}
              disabled={(!allPlayersReady() && !isSoloMode) || gameStarting}
            >
              {gameStarting ? 'STARTING...' : 'START GAME'}
            </button>
          ) : (
            <button 
              className={`std-bottom-action-btn action-active ${readyStatus[user?.id || user?._id] ? 'user-ready-state' : ''}`}
              onClick={handleToggleReady}
            >
              {readyStatus[user?.id || user?._id] ? 'NOT READY' : 'READY TO PLAY'}
            </button>
          )}
        </div>
      </div>

      {/* Slideout Overlay drawer list panel container box layout */}
      {showInviteDrawer && (
        <div className="std-drawer-back-blur" onClick={() => setShowInviteDrawer(false)}>
          <div className="std-drawer-panel-surface" onClick={(e) => e.stopPropagation()}>
            <div className="std-drawer-header-row">
              <h3>Invite Online Networks</h3>
              <button className="std-drawer-close" onClick={() => setShowInviteDrawer(false)}>×</button>
            </div>
            <div className="std-drawer-list-scroller">
              {onlineFriends.length === 0 ? (
                <p className="drawer-fallback">All connections offline.</p>
              ) : (
                onlineFriends.map(f => (
                  <div key={f._id} className="std-drawer-invite-row">
                    <span>{f.username}</span>
                    <button 
                      className="std-drawer-send-btn"
                      onClick={() => handleInviteFriend(f._id)}
                      disabled={invitedIds.has(f._id)}
                    >
                      {invitedIds.has(f._id) ? 'Sent' : 'Invite'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameRoom;