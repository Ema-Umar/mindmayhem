import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader } from 'lucide-react';
import axios from 'axios';
import './Login.css';
import catMascot from '../../images/cat23.png'; 

// Go up two levels // Adjust relative path to where the file lives
const Login = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false); 
  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    // Kept blank to maintain original behavior
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Please enter both email/username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isEmail = identifier.includes('@');
      const loginData = {
        [isEmail ? 'email' : 'username']: identifier,
        password: password
      };

      const response = await axios.post(`${API_URL}/login`, loginData);

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }
        navigate('/Home');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.response) {
        setError(error.response.data.message || 'Login failed. Please try again.');
      } else if (error.request) {
        setError('Cannot connect to server. Please check your connection.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="doodle-page-bg">
      <div className="doodle-main-layout">
        
        {/* Left Floating Content Panel */}
        <div className="doodle-left-content">
          <div className="brand-header-block">
            <h1 className="doodle-logo">
              MindMay<span className="pink-text">Hem</span>
              <span className="crown-emoji">👑</span>
            </h1>
            <p className="doodle-tagline">Draw. Guess. Dare.</p>
            <p className="doodle-description">
              A playful multiplayer drawing & guessing party game. Create rooms, 
              doodle with friends, and take on truth-or-dare rounds between rounds.
            </p>
          </div>
          
          {/* Rounded box holding the cat image */}
          <div className="mascot-box-container">       
    <div className="mascot-inner-card">
      <img src={catMascot} alt="Cat Mascot" className="cat-mascot-image" />
    </div>
 
            <div className="diagonal-pencil">✏️</div>
          </div>
        </div>

        {/* Right Standalone Form Card Component */}
        <div className="doodle-right-card">
          <form onSubmit={handleSubmit} className="auth-form-body">
            
            <div className="auth-title-group">
              <h2 className="welcome-back-title">Welcome back</h2>
              <p className="signin-subtitle">Sign in to keep doodling.</p>
            </div>
            
            {error && <div className="error-banner">{error}</div>}

            <div className="input-row-group">
              <div className="pill-input-wrapper">
                <Mail size={16} className="input-icon-left" />
                <input 
                  type="text" 
                  placeholder="Email or Username"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError('');
                  }}
                  disabled={loading}
                  required 
                />
              </div>
            </div>

            <div className="input-row-group">
              <div className="pill-input-wrapper">
                <Lock size={16} className="input-icon-left" />
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-actions-row">
              <input 
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ display: 'none' }} 
              />
              <a href="#forgot" className="pink-forgot-link">Forgot Password?</a>
            </div>

            <button type="submit" className="neon-login-btn" disabled={loading}>
              {loading ? (
                <div className="loading-inside-btn">
                  <Loader size={18} className="spin-animate" />
                  SIGNING IN...
                </div>
              ) : (
                'LOGIN'
              )}
            </button>

            <div className="signup-footer-text">
              Don't have an account? <span className="pink-register-link" onClick={() => navigate('/register')}>Register</span>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
};

export default Login;