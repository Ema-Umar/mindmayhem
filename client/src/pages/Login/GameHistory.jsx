import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Users, History, User, LogOut, Trophy, Clock, Award, AlertCircle } from 'lucide-react';
import axios from 'axios';
import './GameHistory.css';

const GameHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = 'http://localhost:5000/api';

  // Fetch game history from backend ONLY
  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to view your history');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/game/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setHistory(response.data.history || []);
      } else {
        setError(response.data.message || 'Failed to load history');
      }
    } catch (error) {
      console.error('Error fetching game history:', error);
      if (error.response?.status === 401) {
        setError('Session expired. Please login again.');
        localStorage.removeItem('token');
        setTimeout(() => navigate('/login'), 2000);
      } else if (error.response?.status === 404) {
        setError('History endpoint not found. Please contact support.');
      } else if (error.code === 'ECONNABORTED' || error.message.includes('Network Error')) {
        setError('Cannot connect to server. Please check your connection.');
      } else {
        setError('Failed to load history. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Get rank emoji
  const getRankEmoji = (rank) => {
    if (!rank) return '🏅';
    const rankStr = String(rank).toLowerCase();
    if (rankStr.includes('1st') || rankStr.includes('1')) return '🥇';
    if (rankStr.includes('2nd') || rankStr.includes('2')) return '🥈';
    if (rankStr.includes('3rd') || rankStr.includes('3')) return '🥉';
    return '🏅';
  };

  // Get time ago string
  const getTimeAgo = (date) => {
    if (!date) return 'Recently';
    const diffMs = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    navigate('/login');
  };

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Show error state if there's an error
  if (error) {
    return (
      <div className="dashboard-layout">
        <header className="top-navigation-bar">
          <div className="brand-logo" onClick={() => navigate('/home')}>
            MindMey<span>Hem</span>
          </div>
          <nav className="center-menu-pills">
            <button className="menu-pill" onClick={() => navigate('/home')}>
              <Home size={18} />
              <span>Lobby</span>
            </button>
            <button className="menu-pill" onClick={() => navigate('/friends')}>
              <Users size={18} />
              <span>Friends</span>
            </button>
            <button className="menu-pill active">
              <History size={18} />
              <span>History</span>
            </button>
            <button className="menu-pill" onClick={() => navigate('/profile')}>
              <User size={18} />
              <span>Profile</span>
            </button>
            <button className="menu-pill logout-pill" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </nav>
          <div className="navbar-right-avatar" onClick={() => navigate('/profile')}>
            <img 
              src="https://api.dicebear.com/7.x/bottts/svg?seed=DoodleUser" 
              alt="User Profile" 
            />
          </div>
        </header>
        <main className="dashboard-content-frame">
          <div className="error-container">
            <AlertCircle size={48} />
            <h2>Error Loading History</h2>
            <p>{error}</p>
            <div className="error-actions">
              <button className="retry-btn" onClick={fetchHistory}>
                Try Again
              </button>
              <button className="home-btn" onClick={() => navigate('/home')}>
                Go to Lobby
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-layout">
        <header className="top-navigation-bar">
          <div className="brand-logo" onClick={() => navigate('/home')}>
            MindMey<span>Hem</span>
          </div>
          <nav className="center-menu-pills">
            <button className="menu-pill" onClick={() => navigate('/home')}>
              <Home size={18} />
              <span>Lobby</span>
            </button>
            <button className="menu-pill" onClick={() => navigate('/friends')}>
              <Users size={18} />
              <span>Friends</span>
            </button>
            <button className="menu-pill active">
              <History size={18} />
              <span>History</span>
            </button>
            <button className="menu-pill" onClick={() => navigate('/profile')}>
              <User size={18} />
              <span>Profile</span>
            </button>
            <button className="menu-pill logout-pill" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </nav>
          <div className="navbar-right-avatar" onClick={() => navigate('/profile')}>
            <img 
              src="https://api.dicebear.com/7.x/bottts/svg?seed=DoodleUser" 
              alt="User Profile" 
            />
          </div>
        </header>
        <main className="dashboard-content-frame">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading your history...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      
      {/* TOP NAVIGATION BAR */}
      <header className="top-navigation-bar">
        <div className="brand-logo" onClick={() => navigate('/home')}>
          MindMey<span>Hem</span>
        </div>

        <nav className="center-menu-pills">
          <button className="menu-pill" onClick={() => navigate('/home')}>
            <Home size={18} />
            <span>Lobby</span>
          </button>
          <button className="menu-pill" onClick={() => navigate('/friends')}>
            <Users size={18} />
            <span>Friends</span>
          </button>
          <button className="menu-pill active">
            <History size={18} />
            <span>History</span>
          </button>
          <button className="menu-pill" onClick={() => navigate('/profile')}>
            <User size={18} />
            <span>Profile</span>
          </button>
          <button className="menu-pill logout-pill" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </nav>

        <div className="navbar-right-avatar" onClick={() => navigate('/profile')}>
          <img 
            src="https://api.dicebear.com/7.x/bottts/svg?seed=DoodleUser" 
            alt="User Profile" 
          />
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="dashboard-content-frame">
        
        {/* Page Title */}
        <div className="history-header">
          <div>
            <h1 className="history-title">History</h1>
            <p className="history-subtitle">Your last games</p>
          </div>
          {history.length > 0 && (
            <div className="history-stats">
              <div className="stat-item">
                <Trophy size={18} />
                <span>{history.filter(g => g.rank === '1st').length} Wins</span>
              </div>
              <div className="stat-item">
                <Clock size={18} />
                <span>{history.length} Games</span>
              </div>
            </div>
          )}
        </div>

        {history.length === 0 ? (
          <div className="empty-state">
            <History size={48} />
            <p>No games played yet!</p>
            <p className="empty-sub">Start a game and your history will appear here.</p>
            <button className="play-now-btn" onClick={() => navigate('/home')}>
              Play Now
            </button>
          </div>
        ) : (
          <div className="two-column-rooms-grid">
            {history.map((game, idx) => (
              <div key={game.id || game._id || idx} className="grid-room-card-cell">
                
                {/* Left Side: Icon & Meta */}
                <div className="card-left-identity-group">
                  <div className={`card-avatar-emoji icon-bg-variant-${idx % 5}`}>
                    {getRankEmoji(game.rank)}
                  </div>
                  <div className="card-room-meta-details">
                    <h4>{game.roomName || 'Unknown Room'}</h4>
                    <p>{getTimeAgo(game.date)}</p>
                    <span className="game-mode-tag">{game.gameMode || 'Draw & Guess'}</span>
                  </div>
                </div>

                {/* Right Side: Rank & Points */}
                <div className="card-right-stats">
                  <div className="rank-display">
                    <span className="rank-number">{game.rank || 'N/A'}</span>
                  </div>
                  <div className="score-display">
                    <Award size={14} />
                    <span>{game.score || '0 pts'}</span>
                  </div>
                  <div className="players-count">
                    <Users size={12} />
                    <span>{game.players || 0}</span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </main>

    </div>
  );
};

export default GameHistory;