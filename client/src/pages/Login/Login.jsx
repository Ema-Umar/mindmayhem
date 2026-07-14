import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock } from 'lucide-react';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Perform verification checks here if needed
    navigate('/Home');
  };

  return (
    <div className="web-auth-wrapper">
      <div className="login-card-container">
        
        {/* Decorative Brand/Art Split Panel */}
        <div className="auth-art-panel">
          <div className="doodle-branding">
            <div className="logo-title">
              MindMayHem<span className="highlight-up"></span>
              <span className="crown-doodle">👑</span>
            </div>
            <p className="tagline">Draw. Guess. Dare!</p>
          </div>
          
          <div className="main-illustration-box">
            {/* Embedded custom CSS/Emoji representation matching your screen illustration */}
            <div className="notebook-art">
              <div className="notebook-spine">
                <span></span><span></span><span></span><span></span><span></span>
              </div>
              <div className="notebook-page">
                <span className="kitty-doodle">🐱✏️</span>
              </div>
            </div>
            <div className="splash-bg pink-splash"></div>
            <div className="splash-bg teal-splash"></div>
          </div>
        </div>

        {/* Form Interactive Split Panel */}
        <div className="auth-form-panel">
          <form onSubmit={handleSubmit} className="actual-form">
            
            <div className="input-field-group">
              <div className="input-icon-wrapper">
                <User size={20} className="field-icon" />
                <input 
                  type="text" 
                  placeholder="Email or Username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="input-field-group">
              <div className="input-icon-wrapper">
                <Lock size={20} className="field-icon" />
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="forgot-password-row">
              <a href="#forgot" className="forgot-link">Forgot Password?</a>
            </div>

            <button type="submit" className="login-submit-btn">
              LOGIN
            </button>

            <div className="divider-row">
              <span>or continue with</span>
            </div>

            {/* Social Oauth Buttons Panel Row */}
            <div className="social-grid-row">
              <button type="button" className="social-oauth-btn">
                {/* Google Icon Native SVG */}
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.227C18.416 1.424 15.558 0 12.24 0 5.58 0 0 5.37 0 12s5.58 12 12.24 12c6.96 0 11.57-4.854 11.57-11.79 0-.795-.085-1.4-.19-1.925H12.24z"/>
                </svg>
              </button>
              
              <button type="button" className="social-oauth-btn">
                {/* Discord Icon Native SVG */}
                <svg viewBox="0 0 127.14 96.36" width="22" height="22" fill="#5865F2">
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a74.37,74.37,0,0,0,6.71-10.93,68.6,68.6,0,0,1-10.64-5.12c.91-.67,1.81-1.37,2.67-2.1a75.22,75.22,0,0,0,72.68,0c.87.73,1.76,1.43,2.67,2.1a68.86,68.86,0,0,1-10.64,5.12,74.74,74.74,0,0,0,6.71,10.93,105.54,105.54,0,0,0,31.05-18.83C129.55,50.11,123.75,27.23,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
                </svg>
              </button>

              <button type="button" className="social-oauth-btn">
                {/* Apple Icon Native SVG */}
                <svg viewBox="0 0 170 170" width="18" height="18" fill="#FFFFFF">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.34.13-9.04-1.92-14.12-6.13-3.34-2.79-7.23-7.51-11.66-14.14-7.29-10.97-12.87-23.23-16.73-36.8-3.86-13.56-5.79-26.28-5.79-38.15 0-14.87 3.96-26.81 11.88-35.8 7.92-9 17.52-13.54 28.79-13.65 5.7.11 11.56 1.62 17.59 4.54 6.02 2.93 10.15 4.39 12.38 4.39 1.89 0 6.02-1.5 12.38-4.5 6.35-3 11.97-4.53 17.87-4.58 13.9.56 24.66 5.62 32.28 15.2-11.25 6.84-16.77 16.14-16.57 27.9.22 9.47 3.86 17.39 10.92 23.73 7.07 6.35 15.42 9.8 25.07 10.37-2.34 6.94-5.69 13.84-10.03 20.72zm-22.15-112.96c0 7.84-2.88 15.03-8.64 21.58-5.76 6.56-12.79 10.66-21.08 12.33.22-7.17 3.01-14.28 8.37-21.32 5.36-7.04 12.44-11.45 21.26-13.23.06.22.09.43.09.64z"/>
                </svg>
              </button>
            </div>

            <div className="register-redirect-text">
              Don't have an account? <a href="#register" className="teal-link"><span className="cyan-link" onClick={() => navigate('/register')}>Register</span></a>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
};

export default Login;