import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Users, History, User, LogOut, Palette } from 'lucide-react';
import axios from 'axios';

const GameHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        if (!token) {
          // Fallback mock data matching your UI screenshot
          const mockData = [
            { id: '1', roomName: 'FUN ROOM', timeAgo: '2h ago', rank: '2nd', score: '320 pts' },
            { id: '2', roomName: 'SKETCH SQUAD', timeAgo: 'Yesterday', rank: '1st', score: '480 pts' },
            { id: '3', roomName: 'DARE DEVILS', timeAgo: '3 days ago', rank: '4th', score: '180 pts' }
          ];
          setHistory(mockData);
          return;
        }

        const response = await axios.get(`${API_URL}/game/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setHistory(response.data || []);
      } catch (error) {
        console.error('Error fetching game history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="dashboard-layout">
      
      {/* 1. TOP NAVIGATION BAR */}
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

      {/* 2. MAIN CONTENT AREA */}
      <main className="dashboard-content-frame">
        
        {/* Page Title Header */}
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 700, margin: '0 0 0.3rem 0' }}>
            History
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
            Your last games
          </p>
        </div>

        {loading ? (
          <div className="loading-state" style={{ color: 'var(--text-muted)' }}>
            Loading history...
          </div>
        ) : history.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', paddingTop: '1rem' }}>
            No games played yet!
          </div>
        ) : (
          /* 3. TWO-COLUMN MATCH CARDS GRID */
          <div className="two-column-rooms-grid">
            {history.map((game, idx) => (
              <div key={game.id || game._id} className="grid-room-card-cell">
                
                {/* Left Side: Icon & Meta */}
                <div className="card-left-identity-group">
                  <div className={`card-avatar-emoji icon-bg-variant-${idx % 5}`}>
                    <Palette size={22} />
                  </div>
                  <div className="card-room-meta-details">
                    <h4>{game.roomName}</h4>
                    <p>{game.timeAgo || 'Recently'}</p>
                  </div>
                </div>

                {/* Right Side: Rank & Points */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: 700, 
                    color: 'var(--neon-cyan)' 
                  }}>
                    {game.rank || '1st'}
                  </div>
                  <div style={{ 
                    fontSize: '0.85rem', 
                    color: 'var(--text-muted)', 
                    marginTop: '2px' 
                  }}>
                    {game.score || `${game.pts || 0} pts`}
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