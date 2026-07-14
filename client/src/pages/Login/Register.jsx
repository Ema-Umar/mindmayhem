import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, Camera, ArrowLeft } from 'lucide-react';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords don't match!");
      return;
    }
    if (!agreeTerms) {
      alert("Please agree to the Terms of Service & Privacy Policy.");
      return;
    }
    // Perform authentication logic here
    navigate('/Home');
  };

  return (
    <div className="web-auth-wrapper">
      <div className="register-card-container">
        
        {/* Left Panel: Aesthetic Branding Split */}
        <div className="auth-art-panel">
          <button className="lobby-back-btn" onClick={() => navigate('/login')}>
            <ArrowLeft size={18} />
            <span>Back to Login</span>
          </button>

          <div className="doodle-branding">
            <div className="logo-title">
              Doodle <span className="highlight-up">Up!</span>
              <span className="crown-doodle">👑</span>
            </div>
            <p className="tagline">Let's get you in!</p>
          </div>

          <div className="avatar-upload-container">
            <div className="avatar-preview-ring">
              <div className="avatar-gradient-bg">
                <img 
                  src="https://api.dicebear.com/7.x/bottts/svg?seed=defaultRegister" 
                  alt="Default Avatar" 
                  className="register-avatar-img"
                />
              </div>
              <label htmlFor="avatar-file" className="avatar-camera-badge">
                <Camera size={16} />
              </label>
              <input type="file" id="avatar-file" style={{ display: 'none' }} />
            </div>
            <span className="upload-label">Choose Avatar</span>
          </div>
        </div>

        {/* Right Panel: Interactive Form Fields */}
        <div className="auth-form-panel">
          <form onSubmit={handleSubmit} className="actual-form">
            <h2 className="form-desktop-header">Create Account</h2>

            {/* Username */}
            <div className="input-field-group">
              <div className="input-icon-wrapper">
                <User size={20} className="field-icon" />
                <input 
                  type="text" 
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required 
                />
              </div>
            </div>

            {/* Email */}
            <div className="input-field-group">
              <div className="input-icon-wrapper">
                <Mail size={20} className="field-icon" />
                <input 
                  type="email" 
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>

            {/* Password */}
            <div className="input-field-group">
              <div className="input-icon-wrapper">
                <Lock size={20} className="field-icon" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  className="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="input-field-group">
              <div className="input-icon-wrapper">
                <Lock size={20} className="field-icon" />
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  placeholder="Confirm Password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  className="toggle-password-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Terms and Conditions Checkbox */}
            <div className="terms-checkbox-row">
              <label className="checkbox-custom-container">
                <input 
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                />
                <span className="checkmark"></span>
                <span className="terms-text">
                  I agree to the <span className="cyan-highlight">Terms of Service</span> & <span className="cyan-highlight">Privacy Policy</span>
                </span>
              </label>
            </div>

            {/* Submit Register */}
            <button type="submit" className="register-submit-btn">
              REGISTER
            </button>

            <div className="register-redirect-text">
              Already have an account? <span className="cyan-link" onClick={() => navigate('/login')}>Login</span>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
};

export default Register;