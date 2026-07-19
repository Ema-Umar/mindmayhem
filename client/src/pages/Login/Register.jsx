import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, Camera, ArrowLeft, Loader, CheckCircle } from 'lucide-react';
import axios from 'axios';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  
  // Form fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(
    'https://api.dicebear.com/7.x/bottts/svg?seed=defaultRegister'
  );

  const API_URL = 'http://localhost:5000/api';

  // Validation
  const validateForm = () => {
    const newErrors = {};

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match!";
    }

    if (!agreeTerms) {
      newErrors.agreeTerms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle avatar upload
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, avatar: 'File size must be less than 5MB' });
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('confirmPassword', confirmPassword);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const response = await axios.post(
        `${API_URL}/register`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        // Show success message
        setSuccess(true);
        
        // Clear form fields
        setUsername('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setAvatarFile(null);
        setAvatarPreview('https://api.dicebear.com/7.x/bottts/svg?seed=defaultRegister');
        setAgreeTerms(false);
        
        // DO NOT save token or user data here!
        // User must login separately
        
        // Auto redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }

    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.response) {
        setErrors({ 
          submit: error.response.data.message || 'Registration failed' 
        });
      } else if (error.request) {
        setErrors({ submit: 'Network error. Please check your connection.' });
      } else {
        setErrors({ submit: 'An unexpected error occurred.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="web-auth-wrapper">
      <div className="register-card-container">
        
        {/* Left Panel */}
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
                  src={avatarPreview} 
                  alt="Avatar Preview" 
                  className="register-avatar-img"
                />
              </div>
              <label htmlFor="avatar-file" className="avatar-camera-badge">
                <Camera size={16} />
              </label>
              <input 
                type="file" 
                id="avatar-file" 
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }} 
              />
            </div>
            <span className="upload-label">Choose Avatar</span>
            {errors.avatar && <span className="error-text">{errors.avatar}</span>}
          </div>
        </div>

        {/* Right Panel */}
        <div className="auth-form-panel">
          <form onSubmit={handleSubmit} className="actual-form" noValidate>
            <h2 className="form-desktop-header">Create Account</h2>

            {/* Success Message */}
            {success && (
              <div className="success-message-global">
                <CheckCircle size={20} />
                <span>Registration successful! Redirecting to login...</span>
              </div>
            )}

            {errors.submit && (
              <div className="error-message-global">{errors.submit}</div>
            )}

            {/* Username */}
            <div className="input-field-group">
              <div className={`input-icon-wrapper ${errors.username ? 'has-error' : ''}`}>
                <User size={20} className="field-icon" />
                <input 
                  type="text" 
                  placeholder="Username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errors.username) setErrors({ ...errors, username: '' });
                  }}
                  disabled={loading || success}
                  required 
                />
              </div>
              {errors.username && <span className="error-text">{errors.username}</span>}
            </div>

            {/* Email */}
            <div className="input-field-group">
              <div className={`input-icon-wrapper ${errors.email ? 'has-error' : ''}`}>
                <Mail size={20} className="field-icon" />
                <input 
                  type="email" 
                  placeholder="Email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  disabled={loading || success}
                  required 
                />
              </div>
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            {/* Password */}
            <div className="input-field-group">
              <div className={`input-icon-wrapper ${errors.password ? 'has-error' : ''}`}>
                <Lock size={20} className="field-icon" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: '' });
                  }}
                  disabled={loading || success}
                  required
                />
                <button 
                  type="button" 
                  className="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading || success}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            {/* Confirm Password */}
            <div className="input-field-group">
              <div className={`input-icon-wrapper ${errors.confirmPassword ? 'has-error' : ''}`}>
                <Lock size={20} className="field-icon" />
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  placeholder="Confirm Password" 
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                  }}
                  disabled={loading || success}
                  required
                />
                <button 
                  type="button" 
                  className="toggle-password-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading || success}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
            </div>

            {/* Terms */}
            <div className={`terms-checkbox-row ${errors.agreeTerms ? 'has-error' : ''}`}>
              <label className="checkbox-custom-container">
                <input 
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => {
                    setAgreeTerms(e.target.checked);
                    if (errors.agreeTerms) setErrors({ ...errors, agreeTerms: '' });
                  }}
                  disabled={loading || success}
                />
                <span className="checkmark"></span>
                <span className="terms-text">
                  I agree to the <span className="cyan-highlight">Terms of Service</span> & <span className="cyan-highlight">Privacy Policy</span>
                </span>
              </label>
              {errors.agreeTerms && <span className="error-text">{errors.agreeTerms}</span>}
            </div>

            {/* Submit */}
            <button type="submit" className="register-submit-btn" disabled={loading || success}>
              {loading ? (
                <>
                  <Loader size={20} className="spinning" />
                  REGISTERING...
                </>
              ) : success ? (
                <>
                  <CheckCircle size={20} />
                  REGISTERED!
                </>
              ) : (
                'REGISTER'
              )}
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