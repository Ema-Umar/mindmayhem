import React from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Import the hook

import { Home, Users, History, User, Bell, Settings, Crown } from 'lucide-react';
import './Home.css';

const Dashboard = () => {
  const navigate = useNavigate(); 
  const rooms = [
    { id: 1, name: 'FUN ROOM', emoji: '🐱', round: '2 / 5', players: '8 / 10', hasCrown: true },
    { id: 2, name: 'SKETCH SQUAD', emoji: '🙂', round: '1 / 5', players: '6 / 10', hasCrown: false },
    { id: 3, name: 'DARE DEVILS', emoji: '😈', round: '3 / 5', players: '4 / 10', hasCrown: false },
  ];

  return (
    <div className="dashboard-container">
      {/* Sidebar Navigation (Adapted for Web) */}
      <aside className="sidebar">
        <div className="logo">GAMESPACE</div>
        <nav className="nav-menu">
          <a href="#lobby" className="nav-item active">
            <Home size={22} />
            <span>Lobby</span>
          </a>
          <a href="#friends" className="nav-item">
            <Users size={22} />
            <span>Friends</span>
          </a>
          <a href="#history" className="nav-item">
            <History size={22} />
            <span>History</span>
          </a>
          <a href="#profile" className="nav-item">
            <User size={22} />
            <span>Profile</span>
          </a>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Header Profile Section */}
        <header className="header">
          <div className="profile-section">
            <div className="avatar-wrapper">
              <img 
                src="https://api.dicebear.com/7.x/bottts/svg?seed=ArtMaster" 
                alt="Avatar" 
                className="avatar" 
              />
            </div>
            <div className="profile-info">
              <div className="profile-meta">
                <span className="username">ArtMaster</span>
                <span className="level">Level 12</span>
              </div>
              <div className="progress-container">
                <div className="progress-bar" style={{ width: '70%' }}></div>
                <span className="progress-text">850 / 1200</span>
              </div>
            </div>
          </div>

          <div className="header-actions">
            <button className="action-btn"><Bell size={20} /></button>
            <button className="action-btn"><Settings size={20} /></button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="hero-card">
          <div className="hero-text">
            <h2>Ready to Play?</h2>
            <p>Join a room or create your own and invite friends!</p>
          </div>
          <div className="hero-art">
            {/* Minimalist fallback CSS artwork representing the splash/pencil */}
            <div className="splash-art">🎨</div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="action-cards">
          <div className="card quick-play">
            <h3>QUICK PLAY</h3>
            <p>Find a random room</p>
          </div>
         {/* 3. Add onClick handler here */}
          <div className="card create-room" onClick={() => navigate('/create-room')}>
            <h3>CREATE ROOM</h3>
            <p>Make your own room</p>
          </div>
        </section>

        {/* Rooms Section */}
        <section className="rooms-section">
          <div className="section-header">
            <h3>YOUR ROOMs</h3>
            <a href="#see-all" className="see-all">See All</a>
          </div>

          <div className="rooms-list">
            {rooms.map((room) => (
              <div key={room.id} className="room-row">
                <div className="room-details">
                  <div className={`room-icon icon-bg-${room.id}`}>
                    {room.emoji}
                  </div>
                  <div className="room-meta">
                    <h4>
                      {room.name} {room.hasCrown && <Crown size={14} className="crown-icon" />}
                    </h4>
                    <p>Round {room.round}</p>
                  </div>
                </div>
                
                <div className="room-status">
                  <span className="player-count">{room.players}</span>               
<button 
  className="join-btn" 
  onClick={() => navigate(`/room/${room.name.toLowerCase().replace(/\s+/g, '-')}`)}
>
  JOIN
</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;