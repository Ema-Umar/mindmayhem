import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Import useNavigate
import { ArrowLeft, Camera, Lock, Unlock } from 'lucide-react';
import './CreateRoom.css';

const CreateRoom = () => {
  const navigate = useNavigate(); // 2. Initialize the navigation hook

  const [roomName, setRoomName] = useState('');
  const [gameMode, setGameMode] = useState('normal');
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [rounds, setRounds] = useState('5');
  const [roomType, setRoomType] = useState('public');

  return (
    <div className="web-page-wrapper">
      <div className="create-room-container">
        
        {/* Top Header / Back Button functioning correctly */}
        <header className="form-header">
          <button className="back-btn" onClick={() => navigate('/Home')}>
            <ArrowLeft size={22} />
            <span>Back to Lobby</span>
          </button>
          <h2>Create New Room</h2>
          <div style={{ width: 100 }} className="header-spacer"></div>
        </header>

        <form className="create-room-form" onSubmit={(e) => e.preventDefault()}>
          
          {/* Left Column: Visuals & Basics */}
          <div className="form-column column-left">
            <div className="image-upload-section">
              <div className="image-upload-circle">
                <Camera size={32} />
              </div>
              <span>Room Image (Optional)</span>
            </div>

            <div className="form-group">
              <label>Room Name</label>
              <input 
                type="text" 
                placeholder="Enter a catchy room name..." 
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="text-input"
              />
            </div>

            {/* Room Type Row (Public vs Private) */}
            <div className="form-group">
              <label>Room Type</label>
              <div className="options-grid grid-2">
                <div 
                  className={`option-card row-layout ${roomType === 'public' ? 'active' : ''}`}
                  onClick={() => setRoomType('public')}
                >
                  <Unlock size={20} className="type-icon yellow-icon" />
                  <div>
                    <div className="option-title">Public</div>
                    <div className="option-desc">Anyone can join</div>
                  </div>
                </div>
                <div 
                  className={`option-card row-layout ${roomType === 'private' ? 'active' : ''}`}
                  onClick={() => setRoomType('private')}
                >
                  <Lock size={20} className="type-icon muted-icon" />
                  <div>
                    <div className="option-title">Private</div>
                    <div className="option-desc">Invite only</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Game Setup Configurations */}
          <div className="form-column column-right">
            {/* Game Mode Selector */}
            <div className="form-group">
              <label>Game Mode</label>
              <div className="options-grid grid-3">
                <div 
                  className={`option-card ${gameMode === 'normal' ? 'active' : ''}`}
                  onClick={() => setGameMode('normal')}
                >
                  <div className="option-title">Normal</div>
                  <div className="option-desc">Classic rules</div>
                </div>
                <div 
                  className={`option-card ${gameMode === 'speed' ? 'active' : ''}`}
                  onClick={() => setGameMode('speed')}
                >
                  <div className="option-title">Speed</div>
                  <div className="option-desc">Fast rounds</div>
                </div>
                <div 
                  className={`option-card ${gameMode === 'dare' ? 'active' : ''}`}
                  onClick={() => setGameMode('dare')}
                >
                  <div className="option-title">Dare Mode</div>
                  <div className="option-desc">Truth or Dare</div>
                </div>
              </div>
            </div>

            {/* Range Slider for Players */}
            <div className="form-group">
              <label>Max Players</label>
              <div className="slider-container">
                <span className="slider-limit">4</span>
                <div className="slider-wrapper">
                  <input 
                    type="range" 
                    min="4" 
                    max="20" 
                    value={maxPlayers} 
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    className="range-slider"
                  />
                  <div className="slider-value-bubble" style={{ left: `${((maxPlayers - 4) / 16) * 100}%` }}>
                    {maxPlayers}
                  </div>
                </div>
                <span className="slider-limit">20</span>
              </div>
            </div>

            {/* Rounds Selector */}
            <div className="form-group">
              <label>Rounds</label>
              <div className="options-grid grid-3">
                <div 
                  className={`option-card center-text ${rounds === '5' ? 'active' : ''}`}
                  onClick={() => setRounds('5')}
                >
                  <div className="option-title">5 Rounds</div>
                </div>
                <div 
                  className={`option-card center-text ${rounds === '10' ? 'active' : ''}`}
                  onClick={() => setRounds('10')}
                >
                  <div className="option-title">10 Rounds</div>
                </div>
                <div 
                  className={`option-card center-text ${rounds === 'custom' ? 'active' : ''}`}
                  onClick={() => setRounds('custom')}
                >
                  <div className="option-title">Custom</div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button type="submit" className="submit-btn">
              CREATE ROOM
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateRoom;