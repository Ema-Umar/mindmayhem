import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Share2, Settings, Copy, Check, Crown, Users, AlertCircle } from 'lucide-react';
import './GameRoom.css';

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
            r.roomId === roomId || 
            r.id === roomId || 
            r._id === roomId
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
              isReady: true // Auto-ready for solo
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
        const isUserHost = String(hostId) === String(userId);
        setIsHost(isUserHost);
        
        const readyMap = {};
        formattedPlayers.forEach(p => {
          readyMap[p.id] = p.isReady !== undefined ? p.isReady : true;
        });
        setReadyStatus(readyMap);
        
        setIsSoloMode(formattedPlayers.length === 1);
        
      } catch (err) {
        console.error('Error fetching room:', err);
        setError('Failed to load room data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchRoomData();
  }, [roomId, navigate]);

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
          title: `Join my room: ${room?.roomName || 'Game Room'}`,
          text: `Join my room with code: ${code}`,
          url: roomLink
        });
      } else {
        await navigator.clipboard.writeText(`Join my room: ${roomLink}\nRoom Code: ${code}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.log('Share cancelled or failed');
    }
  };

  const handleToggleReady = () => {
    const userId = user?.id || user?._id;
    if (!userId) return;

    const newReadyStatus = !readyStatus[userId];
    
    setReadyStatus(prev => ({
      ...prev,
      [userId]: newReadyStatus
    }));

    setPlayers(prev => prev.map(p => {
      if (p.id === userId) {
        return { ...p, isReady: newReadyStatus };
      }
      return p;
    }));

    const currentRoom = JSON.parse(localStorage.getItem('currentRoom') || 'null');
    if (currentRoom) {
      currentRoom.players = currentRoom.players?.map(p => {
        const pId = p.id || p._id;
        if (pId === userId) {
          return { ...p, isReady: newReadyStatus };
        }
        return p;
      });
      localStorage.setItem('currentRoom', JSON.stringify(currentRoom));
    }
  };

  const allPlayersReady = () => {
    if (players.length === 0) return false;
    return players.every(p => p.isReady === true);
  };

  const hasMinimumPlayers = () => {
    return players.length >= 1;
  };

  const getReadyCount = () => {
    return players.filter(p => p.isReady).length;
  };const handleStartGame = () => {
  // Solo mode
  if (isSoloMode) {
    setGameStarting(true);
    
    const currentRoom = JSON.parse(localStorage.getItem('currentRoom') || 'null');
    if (currentRoom) {
      currentRoom.status = 'playing';
      localStorage.setItem('currentRoom', JSON.stringify(currentRoom));
    }

    const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');
    
    const gamePlayers = players.map(p => ({
      ...p,
      isYou: p.id === (currentUser.id || currentUser._id)
    }));

    setTimeout(() => {
      navigate(`/gameplay/${roomId}`, {
        state: {
          roomId: roomId,
          players: gamePlayers,
          gameMode: room?.gameMode || 'normal',
          rounds: room?.rounds || 5,
          isSolo: true,
          hostId: room?.host || currentUser.id || currentUser._id,
          currentUserId: currentUser.id || currentUser._id
        }
      });
    }, 500);
    return;
  }

  // Multiplayer
  if (!isHost) {
    alert('Only the host can start the game!');
    return;
  }

  if (!allPlayersReady()) {
    const notReady = players.filter(p => !p.isReady).map(p => p.name).join(', ');
    alert(`Not all players are ready! Waiting for: ${notReady}`);
    return;
  }

  if (!hasMinimumPlayers()) {
    alert('Need at least 2 players to start!');
    return;
  }

  setGameStarting(true);
  
  const currentRoom = JSON.parse(localStorage.getItem('currentRoom') || 'null');
  if (currentRoom) {
    currentRoom.status = 'playing';
    localStorage.setItem('currentRoom', JSON.stringify(currentRoom));
  }

  const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');
  
  const gamePlayers = players.map(p => ({
    ...p,
    isYou: p.id === (currentUser.id || currentUser._id)
  }));

  setTimeout(() => {
    navigate(`/gameplay/${roomId}`, {
      state: {
        roomId: roomId,
        players: gamePlayers,
        gameMode: room?.gameMode || 'normal',
        rounds: room?.rounds || 5,
        isSolo: false,
        hostId: room?.host || currentUser.id || currentUser._id,
        currentUserId: currentUser.id || currentUser._id
      }
    });
  }, 500);
};
  const handleLeaveRoom = () => {
    if (window.confirm('Are you sure you want to leave this room?')) {
      localStorage.removeItem('currentRoom');
      navigate('/Home');
    }
  };

  if (loading) {
    return (
      <div className="web-room-wrapper loading">
        <div className="loader">Loading room...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="web-room-wrapper error">
        <div className="error-container">
          <AlertCircle size={48} />
          <h2>Error loading room</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/Home')}>Return to Lobby</button>
        </div>
      </div>
    );
  }

  const displayTitle = room?.roomName || 'Game Room';
  const totalPlayers = players.length;
  const maxPlayers = room?.maxPlayers || 10;
  const allReady = allPlayersReady();
  const minPlayersMet = hasMinimumPlayers();
  const readyCount = getReadyCount();
  
  // SOLO: Always enabled, MULTIPLAYER: Check conditions
  const canStart = isSoloMode ? true : (isHost && allReady && minPlayersMet && !gameStarting && room?.status !== 'playing');

  return (
    <div className="web-room-wrapper">
      <div className="room-lobby-container">
        <header className="lobby-header">
          <button className="back-btn" onClick={handleLeaveRoom}>
            <ArrowLeft size={22} />
            <span>Leave Room</span>
          </button>
          
          <div className="room-title-area">
            <h1>
              {displayTitle} 
              {isHost && <Crown size={22} className="crown-icon-gold" />}
            </h1>
            <span className="room-status-badge">
              {room?.status === 'playing' ? '🔴 LIVE' : '🟢 WAITING'}
            </span>
            {isSoloMode && (
              <span className="solo-badge">🧪 SOLO MODE</span>
            )}
          </div>

          <div className="lobby-actions">
            <button className="action-circle-btn" onClick={handleShareRoom}>
              <Share2 size={20} />
            </button>
            <button className="action-circle-btn" onClick={() => alert('Settings coming soon!')}>
              <Settings size={20} />
            </button>
          </div>
        </header>

        <div className="lobby-workspace">
          <div className="lobby-left-panel">
            <div className="code-display-card">
              <span className="code-label">Room Code</span>
              <div className="code-box" onClick={handleCopyCode}>
                <span className="room-code">{room?.roomCode || 'XXXXXX'}</span>
                {copied ? <Check size={18} className="copied-icon" /> : <Copy size={18} />}
              </div>
            </div>

            <div className="match-status-card">
              <div className="status-indicator">
                <div className={`pulse-dot ${allReady && minPlayersMet ? 'ready' : 'waiting'}`}></div>
                <span>
                  {room?.status === 'playing' 
                    ? 'Game in progress...' 
                    : isSoloMode 
                      ? '🧪 Solo mode - Ready to test!' 
                      : allReady && minPlayersMet 
                        ? '🎮 All players ready! Start the game!' 
                        : minPlayersMet 
                          ? `⏳ ${players.filter(p => !p.isReady).length} player(s) not ready (${readyCount}/${totalPlayers} ready)` 
                          : `👤 Need ${2 - totalPlayers} more player(s) to start...`
                  }
                </span>
              </div>
              
              <div className="game-controls">
                {(isHost || isSoloMode) ? (
                  <button 
                    className={`start-game-btn ${canStart ? 'ready' : ''}`}
                    onClick={handleStartGame}
                    disabled={!canStart || gameStarting || room?.status === 'playing'}
                  >
                    {gameStarting ? 'STARTING...' : room?.status === 'playing' ? 'GAME IN PROGRESS' : isSoloMode ? '🧪 START SOLO' : 'START GAME'}
                  </button>
                ) : (
                  <button 
                    className={`ready-btn ${readyStatus[user?.id || user?._id] ? 'ready' : ''}`}
                    onClick={handleToggleReady}
                    disabled={room?.status === 'playing'}
                  >
                    {readyStatus[user?.id || user?._id] ? '✅ READY' : '⏳ NOT READY'}
                  </button>
                )}
              </div>
            </div>

            <div className="game-info-card">
              <div className="info-item">
                <span className="info-label">Game Mode:</span>
                <span className="info-value">{room?.gameMode || 'Normal'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Rounds:</span>
                <span className="info-value">{room?.rounds || 5}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Players:</span>
                <span className="info-value">{totalPlayers} / {maxPlayers}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Status:</span>
                <span className="info-value" style={{ color: allReady ? '#4ade80' : '#ffa500' }}>
                  {isSoloMode ? '🧪 Solo Ready' : allReady ? '✅ All Ready' : '⏳ Waiting...'}
                </span>
              </div>
            </div>

            {isSoloMode && (
              <div className="solo-hint">
                <p>💡 You're in solo mode! Great for testing.</p>
                <p>✅ Click "START SOLO" to begin the game.</p>
              </div>
            )}
          </div>

          <div className="lobby-right-panel">
            <div className="panel-header">
              <h3>Players</h3>
              <span className="counter-badge">
                ({totalPlayers} / {maxPlayers})
                <span className="ready-count"> • {readyCount} ready</span>
              </span>
            </div>

            <div className="player-list-scrollable">
              {players.length === 0 ? (
                <div className="empty-players">
                  <Users size={32} />
                  <p>No players yet. Share the room code!</p>
                </div>
              ) : (
                players.map((player) => {
                  const playerId = player.id;
                  const isReady = readyStatus[playerId] || false;
                  
                  return (
                    <div key={playerId} className={`player-row-item ${player.isYou ? 'highlight' : ''}`}>
                      <div className="player-left-info">
                        <img 
                          src={`https://api.dicebear.com/7.x/bottts/svg?seed=${player.avatarSeed || player.name}`}
                          alt={player.name} 
                          className="player-avatar"
                          onError={(e) => {
                            e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=default`;
                          }}
                        />
                        <span className="player-name">
                          {player.name} 
                          {player.isYou && <span className="you-tag"> (You)</span>}
                          {player.isHost && <Crown size={14} className="host-crown" />}
                          {isSoloMode && <span className="solo-tag"> 🧪</span>}
                        </span>
                      </div>

                      <div className="player-right-status">
                        {player.isHost ? (
                          <span className="status-lbl host">👑 Host</span>
                        ) : isReady ? (
                          <span className="status-lbl ready">✅ Ready</span>
                        ) : (
                          <span className="status-lbl not-ready">⏳ Waiting</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameRoom;