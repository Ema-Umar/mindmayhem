import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Share2, Settings, Copy, Check, Crown } from 'lucide-react';
import './GameRoom.css';

const GameRoom = () => {
  const navigate = useNavigate();
  const { roomSlug } = useParams();
  const [copied, setCopied] = useState(false);

  // Formatting the dynamic header title cleanly based on the route slug
  const displayTitle = roomSlug ? roomSlug.replace(/-/g, ' ').toUpperCase() : 'FUN ROOM';

  const players = [
    { id: 1, name: 'ArtMaster', tag: '(You)', role: 'Room Owner', isReady: true, avatarSeed: 'ArtMaster' },
    { id: 2, name: 'Sketchy', role: '', isReady: true, avatarSeed: 'Sketchy' },
    { id: 3, name: 'ColourKing', role: '', isReady: true, avatarSeed: 'ColourKing' },
    { id: 4, name: 'DoodleQueen', role: '', isReady: true, avatarSeed: 'DoodleQueen' },
    { id: 5, name: 'FunnyGuy', role: '', isReady: false, avatarSeed: 'FunnyGuy' },
    { id: 6, name: 'StarGazer', role: '', isReady: true, avatarSeed: 'StarGazer' },
    { id: 7, name: 'Mischief', role: '', isReady: false, avatarSeed: 'Mischief' },
    { id: 8, name: 'PixelPanda', role: '', isReady: true, avatarSeed: 'PixelPanda' },
  ];

  const handleCopyCode = () => {
    navigator.clipboard.writeText('ABCD12');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = () => {
    // If you want to include the room slug in the URL (e.g., /game/my-room-name):
    // navigate(`/game/${roomSlug}`); 
    
    // Or just a flat route:
    navigate('/game'); 
  }; 

  return (
    <div className="web-room-wrapper">
      <div className="room-lobby-container">
        
        {/* Header section optimized for desktop */}
        <header className="lobby-header">
          <button className="back-btn" onClick={() => navigate('/Home')}>
            <ArrowLeft size={22} />
            <span>Leave Room</span>
          </button>
          
          <div className="room-title-area">
            <h1>{displayTitle} <Crown size={22} className="crown-icon-gold" /></h1>
          </div>

          <div className="lobby-actions">
            <button className="action-circle-btn"><Share2 size={20} /></button>
            <button className="action-circle-btn"><Settings size={20} /></button>
          </div>
        </header>

        {/* Dynamic 2-Column Web Layout Split */}
        <div className="lobby-workspace">
          
          {/* Left Column: Room Code Display Box & Match Status Controls */}
          <div className="lobby-left-panel">
            <div className="code-display-card">
              <span className="code-label">Room Code</span>
              <div className="code-box" onClick={handleCopyCode}>
                <span className="room-code">ABCD12</span>
                {copied ? <Check size={18} className="copied-icon" /> : <Copy size={18} />}
              </div>
            </div>

        <div className="match-status-card">
              <div className="status-indicator">
                <div className="pulse-dot"></div>
                <span>Waiting for players...</span>
              </div>
              {/* 2. Added onClick handler here */}
             
<button className="start-game-btn" onClick={() => navigate('/game')}>
  START GAME
</button>
            </div>
          </div>

          {/* Right Column: Interactive Player Roster list wrapper */}
          <div className="lobby-right-panel">
            <div className="panel-header">
              <h3>Players</h3>
              <span className="counter-badge">({players.length} / 10)</span>
            </div>

            <div className="player-list-scrollable">
              {players.map((player) => (
                <div key={player.id} className="player-row-item">
                  <div className="player-left-info">
                    <img 
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${player.avatarSeed}`} 
                      alt="Player Profile Avatar" 
                      className="player-avatar"
                    />
                    <span className="player-name">
                      {player.name} {player.tag && <span className="you-tag">{player.tag}</span>}
                    </span>
                  </div>

                  <div className="player-right-status">
                    {player.role ? (
                      <span className="owner-badge">{player.role}</span>
                    ) : player.isReady ? (
                      <span className="status-lbl ready">Ready</span>
                    ) : (
                      <span className="status-lbl not-ready">Not Ready</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default GameRoom;