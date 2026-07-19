import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Lock, Unlock, Loader, Users, Gamepad2, Trophy } from 'lucide-react';
import axios from 'axios';
import './CreateRoom.css';

const CreateRoom = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form fields
  const [roomName, setRoomName] = useState('');
  const [gameMode, setGameMode] = useState('normal');
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [rounds, setRounds] = useState('5');
  const [roomType, setRoomType] = useState('public');
  const [roomImage, setRoomImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const API_URL = 'http://localhost:5000/api';

  // Handle room image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      setRoomImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Validation
  const validateForm = () => {
    if (!roomName.trim()) {
      setError('Please enter a room name');
      return false;
    }
    if (roomName.length < 3) {
      setError('Room name must be at least 3 characters');
      return false;
    }
    if (roomName.length > 30) {
      setError('Room name must be less than 30 characters');
      return false;
    }
    if (maxPlayers < 4 || maxPlayers > 20) {
      setError('Max players must be between 4 and 20');
      return false;
    }
    return true;
  };

  // Generate room code
  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

 // Replace the handleSubmit function with this updated version

const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) {
    return;
  }

  setLoading(true);
  setError('');
  setSuccess(false);

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login first');
      navigate('/login');
      return;
    }

    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const roomCode = generateRoomCode();

    const roomData = {
      roomName: roomName.trim(),
      roomCode,
      gameMode,
      maxPlayers,
      rounds: parseInt(rounds) || 5,
      roomType,
      host: userData.id || userData._id,
      hostName: userData.username || 'Unknown',
    };

    let response;
    try {
      // Try to create room via backend
      response = await axios.post(
        `${API_URL}/rooms/create`,
        roomData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (apiError) {
      console.log('Backend not available, using localStorage fallback');
      
      // Fallback: Store in localStorage
      const existingRooms = JSON.parse(localStorage.getItem('rooms') || '[]');
      const newRoom = {
        ...roomData,
        id: Date.now(),
        roomId: `room_${Date.now()}`,
        players: [{
          id: userData.id || userData._id,
          username: userData.username,
          avatar: userData.avatar,
          isHost: true,
          isReady: false
        }],
        status: 'waiting',
        createdAt: new Date().toISOString()
      };
      existingRooms.push(newRoom);
      localStorage.setItem('rooms', JSON.stringify(existingRooms));
      localStorage.setItem('currentRoom', JSON.stringify(newRoom));
      
      response = {
        data: {
          success: true,
          room: newRoom
        }
      };
    }

    if (response.data.success) {
      setSuccess(true);
      
      // Save room info
      localStorage.setItem('currentRoom', JSON.stringify(response.data.room));
      
      setTimeout(() => {
        const roomId = response.data.room.roomId || response.data.room.id;
        navigate(`/room/${roomId}`);
      }, 1500);
    }

  } catch (error) {
    console.error('Create room error:', error);
    setError(error.response?.data?.message || 'Failed to create room. Please try again.');
  } finally {
    setLoading(false);
  }
};
  // Game mode options
  const gameModes = {
    normal: { icon: '🎨', label: 'Normal', desc: 'Classic Draw & Guess' },
    speed: { icon: '⚡', label: 'Speed', desc: 'Fast-paced rounds' },
    dare: { icon: '😈', label: 'Dare Mode', desc: 'Truth or Dare' },
    trivia: { icon: '🧠', label: 'Trivia', desc: 'Knowledge Challenge' }
  };

  return (
    <div className="web-page-wrapper">
      <div className="create-room-container">
        
        {/* Top Header */}
        <header className="form-header">
          <button className="back-btn" onClick={() => navigate('/Home')}>
            <ArrowLeft size={22} />
            <span>Back to Lobby</span>
          </button>
          <h2>Create New Room</h2>
          <div style={{ width: 100 }} className="header-spacer"></div>
        </header>

        <form className="create-room-form" onSubmit={handleSubmit}>
          
          {/* Left Column: Visuals & Basics */}
          <div className="form-column column-left">
            <div className="image-upload-section">
              <div 
                className="image-upload-circle"
                onClick={() => document.getElementById('roomImageInput').click()}
                style={{ cursor: 'pointer' }}
              >
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Room" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  />
                ) : (
                  <Camera size={32} />
                )}
              </div>
              <input 
                type="file" 
                id="roomImageInput"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <span className="upload-hint">Click to upload room image</span>
            </div>

            <div className="form-group">
              <label>Room Name <span className="required">*</span></label>
              <input 
                type="text" 
                placeholder="Enter a catchy room name..." 
                value={roomName}
                onChange={(e) => {
                  setRoomName(e.target.value);
                  setError('');
                }}
                className="text-input"
                maxLength={30}
                required
              />
              <div className="input-hint">
                <span>{roomName.length}/30 characters</span>
                {roomName.length > 0 && roomName.length < 3 && (
                  <span className="hint-error">Minimum 3 characters</span>
                )}
              </div>
            </div>

            {/* Room Type Row */}
            <div className="form-group">
              <label>Room Type</label>
              <div className="options-grid grid-2">
                <div 
                  className={`option-card row-layout ${roomType === 'public' ? 'active' : ''}`}
                  onClick={() => setRoomType('public')}
                >
                  <Unlock size={20} className="type-icon public-icon" />
                  <div>
                    <div className="option-title">Public</div>
                    <div className="option-desc">Anyone can join</div>
                  </div>
                </div>
                <div 
                  className={`option-card row-layout ${roomType === 'private' ? 'active' : ''}`}
                  onClick={() => setRoomType('private')}
                >
                  <Lock size={20} className="type-icon private-icon" />
                  <div>
                    <div className="option-title">Private</div>
                    <div className="option-desc">Invite only</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Game Setup */}
          <div className="form-column column-right">
            {/* Game Mode Selector */}
            <div className="form-group">
              <label>Game Mode</label>
              <div className="options-grid grid-3">
                {Object.entries(gameModes).map(([key, mode]) => (
                  <div 
                    key={key}
                    className={`option-card ${gameMode === key ? 'active' : ''}`}
                    onClick={() => setGameMode(key)}
                  >
                    <div className="mode-icon">{mode.icon}</div>
                    <div className="option-title">{mode.label}</div>
                    <div className="option-desc">{mode.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Max Players Slider */}
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
                    style={{
                      background: `linear-gradient(to right, #00d4ff 0%, #00d4ff ${((maxPlayers - 4) / 16) * 100}%, #2a2a4a ${((maxPlayers - 4) / 16) * 100}%, #2a2a4a 100%)`
                    }}
                  />
                  <div 
                    className="slider-value-bubble" 
                    style={{ left: `${((maxPlayers - 4) / 16) * 100}%` }}
                  >
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
                {['5', '10', 'custom'].map((value) => (
                  <div 
                    key={value}
                    className={`option-card center-text ${rounds === value ? 'active' : ''}`}
                    onClick={() => setRounds(value)}
                  >
                    <div className="option-title">
                      {value === 'custom' ? '♾️' : `${value} Rounds`}
                    </div>
                    {value !== 'custom' && (
                      <div className="option-desc">
                        {value === '5' ? 'Quick game' : 'Extended'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Room Preview */}
            <div className="room-preview">
              <div className="preview-header">
                <Users size={16} />
                <span>Room Preview</span>
              </div>
              <div className="preview-details">
                <div className="preview-item">
                  <span className="preview-label">Name:</span>
                  <span className="preview-value">{roomName || 'Untitled Room'}</span>
                </div>
                <div className="preview-item">
                  <span className="preview-label">Mode:</span>
                  <span className="preview-value">{gameModes[gameMode]?.label || 'Normal'}</span>
                </div>
                <div className="preview-item">
                  <span className="preview-label">Players:</span>
                  <span className="preview-value">{maxPlayers}</span>
                </div>
                <div className="preview-item">
                  <span className="preview-label">Type:</span>
                  <span className="preview-value">{roomType === 'public' ? '🌍 Public' : '🔒 Private'}</span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="error-message">{error}</div>
            )}

            {/* Success Message */}
            {success && (
              <div className="success-message">
                <div className="success-icon">✅</div>
                <span>Room created successfully! Redirecting...</span>
              </div>
            )}

            {/* Action Button */}
            <button 
              type="submit" 
              className="submit-btn"
              disabled={loading || success}
            >
              {loading ? (
                <>
                  <Loader size={20} className="spinning" />
                  CREATING...
                </>
              ) : success ? (
                <>
                  <Trophy size={20} />
                  ROOM CREATED!
                </>
              ) : (
                'CREATE ROOM'
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateRoom;