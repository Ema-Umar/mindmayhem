import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Camera, ArrowLeft, Loader, CheckCircle } from 'lucide-react';
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
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(
    'https://api.dicebear.com/7.x/bottts/svg?seed=defaultRegister'
  );

  const API_URL = 'http://localhost:5000/api';

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
        setSuccess(true);
        setUsername('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setAvatarFile(null);
        setAvatarPreview('https://api.dicebear.com/7.x/bottts/svg?seed=defaultRegister');
        setAgreeTerms(false);
        
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
    <div className="register-page-bg">
      {/* Top Left Independent Back Arrow Button */}
      <button className="top-back-arrow-btn" onClick={() => navigate('/login')}>
        <ArrowLeft size={24} />
      </button>

      <div className="register-central-wrapper">
        <form onSubmit={handleSubmit} className="register-form-flow" noValidate>
          
          <div className="register-header-section">
            <h2 className="register-main-title">Create Account</h2>
            <p className="register-subtitle">Let's get you in!</p>
          </div>

          {/* Centered Avatar Display Box */}
          <div className="centered-avatar-uploader">
            <div className="avatar-circle-frame">
              <img 
                src={avatarPreview} 
                alt="Avatar Preview" 
                className="main-avatar-element"
              />
              <label htmlFor="avatar-file-input" className="pink-camera-badge">
                <Camera size={14} />
              </label>
              <input 
                type="file" 
                id="avatar-file-input" 
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }} 
              />
            </div>
            {errors.avatar && <span className="field-error-msg">{errors.avatar}</span>}
          </div>

          {/* Global Alert Notification Boxes */}
          {success && (
            <div className="register-success-alert">
              <CheckCircle size={18} />
              <span>Registration successful! Redirecting to login...</span>
            </div>
          )}

          {errors.submit && (
            <div className="register-error-alert">{errors.submit}</div>
          )}

          {/* Form Fields Elements */}
          <div className="register-input-row">
            <div className={`wide-pill-input ${errors.username ? 'has-error' : ''}`}>
              <User size={18} className="input-left-icon" />
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
            {errors.username && <span className="field-error-msg">{errors.username}</span>}
          </div>

          <div className="register-input-row">
            <div className={`wide-pill-input ${errors.email ? 'has-error' : ''}`}>
              <Mail size={18} className="input-left-icon" />
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
            {errors.email && <span className="field-error-msg">{errors.email}</span>}
          </div>

          <div className="register-input-row">
            <div className={`wide-pill-input ${errors.password ? 'has-error' : ''}`}>
              <Lock size={18} className="input-left-icon" />
              <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: '' });
                }}
                disabled={loading || success}
                required
              />
            </div>
            {errors.password && <span className="field-error-msg">{errors.password}</span>}
          </div>

          <div className="register-input-row">
            <div className={`wide-pill-input ${errors.confirmPassword ? 'has-error' : ''}`}>
              <Lock size={18} className="input-left-icon" />
              <input 
                type="password" 
                placeholder="Confirm Password" 
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                }}
                disabled={loading || success}
                required
              />
            </div>
            {errors.confirmPassword && <span className="field-error-msg">{errors.confirmPassword}</span>}
          </div>

          {/* Legal Terms Checkbox Row */}
          <div className="legal-checkbox-container">
            <label className="flat-checkbox-label">
              <input 
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => {
                  setAgreeTerms(e.target.checked);
                  if (errors.agreeTerms) setErrors({ ...errors, agreeTerms: '' });
                }}
                disabled={loading || success}
              />
              <span className="checkbox-text-span">
                I agree to the <span className="pink-highlight">Terms of Service</span> & <span className="pink-highlight">Privacy Policy</span>
              </span>
            </label>
            {errors.agreeTerms && <span className="field-error-msg blocks-error">{errors.agreeTerms}</span>}
          </div>

          {/* Action Button */}
          <button type="submit" className="neon-pink-register-btn" disabled={loading || success}>
            {loading ? (
              <div className="btn-loading-align">
                <Loader size={18} className="spin-effect" />
                REGISTERING...
              </div>
            ) : success ? (
              'REGISTERED!'
            ) : (
              'REGISTER'
            )}
          </button>

          {/* Redirect Footer Link */}
          <div className="already-account-footer">
            Already have an account? <span className="pink-login-trigger" onClick={() => navigate('/login')}>Login</span>
          </div>

        </form>
      </div>
    </div>
  );
};

export default Register;