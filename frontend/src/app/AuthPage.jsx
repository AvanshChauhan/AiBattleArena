import { useState, useRef, useEffect } from 'react';
import './AuthPage.css';

const API_BASE = import.meta.env.VITE_API_URL || '';
const AUTH_URL = {
  login: `${API_BASE}/auth/login`,
  register: `${API_BASE}/auth/register`,
};

export default function AuthPage({ onSuccess, theme: initialTheme = 'dark' }) {
  const [tab, setTab]                 = useState('login'); // 'login' | 'register'
  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [shaking, setShaking]         = useState(false);
  const [theme, setTheme]             = useState(() => {
    return localStorage.getItem('aq-theme') || initialTheme || 'dark';
  });

  const usernameInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('aq-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanUsername = username.trim().toLowerCase();

    if (cleanUsername.length < 3) {
      setError('Username must be at least 3 characters.');
      triggerShake();
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      triggerShake();
      return;
    }

    if (tab === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.');
      triggerShake();
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(AUTH_URL[tab], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: cleanUsername, password }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error || `Authentication failed (${res.status})`);
        triggerShake();
        return;
      }

      // Store in localStorage & propagate
      localStorage.setItem('aq-token', body.token);
      localStorage.setItem('aq-username', body.username);
      onSuccess(body.token, body.username);
    } catch {
      setError('Unable to reach server. Please check connection.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (nextTab) => {
    if (nextTab === tab) return;
    setTab(nextTab);
    setError('');
    setPassword('');
    setConfirmPassword('');
    usernameInputRef.current?.focus();
  };

  return (
    <div className="ios-auth-root" data-theme={theme}>
      {/* iOS Ambient Dynamic Wallpaper Mesh */}
      <div className="ios-mesh-bg">
        <div className="ios-mesh-orb ios-orb-1" />
        <div className="ios-mesh-orb ios-orb-2" />
        <div className="ios-mesh-orb ios-orb-3" />
        <div className="ios-mesh-noise" />
      </div>

      {/* Top Bar Navigation / Status Control */}
      <header className="ios-top-bar">
        <div className="ios-carrier-pill">
          <span className="ios-signal-bars">
            <span /><span /><span /><span />
          </span>
          <span className="ios-carrier-text">Aequitas AI</span>
        </div>

        <button
          className="ios-glass-btn"
          onClick={toggleTheme}
          type="button"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </header>

      {/* Main iPhone Style Glass Modal Sheet */}
      <main className="ios-auth-wrapper">
        <div className={`ios-glass-card ${shaking ? 'ios-shake' : ''}`}>
          
          {/* iOS Card Grabber / Sheet indicator */}
          <div className="ios-sheet-handle" />

          {/* Apple ID App Icon & Header */}
          <div className="ios-header-group">
            <div className="ios-app-icon-squircle">
              <div className="ios-icon-inner-glow" />
              <svg className="ios-app-logo-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>

            <h1 className="ios-title">
              {tab === 'login' ? 'Sign in with Aequitas ID' : 'Create Aequitas ID'}
            </h1>
            <p className="ios-subtitle">
              {tab === 'login'
                ? 'Sign in to access your models, battles, and evaluation history.'
                : 'One ID for all your AI battles and comparative scoring.'}
            </p>
          </div>

          {/* Apple Style Segmented Picker */}
          <div className="ios-segmented-control" role="tablist">
            <div
              className="ios-segment-slider"
              style={{
                transform: tab === 'login' ? 'translateX(0%)' : 'translateX(100%)',
              }}
            />
            <button
              className={`ios-segment-btn ${tab === 'login' ? 'active' : ''}`}
              type="button"
              role="tab"
              aria-selected={tab === 'login'}
              onClick={() => switchTab('login')}
            >
              Sign In
            </button>
            <button
              className={`ios-segment-btn ${tab === 'register' ? 'active' : ''}`}
              type="button"
              role="tab"
              aria-selected={tab === 'register'}
              onClick={() => switchTab('register')}
            >
              Create Account
            </button>
          </div>

          {/* Apple Inset Grouped Form List */}
          <form className="ios-form" onSubmit={handleSubmit} noValidate>
            <div className="ios-inset-group">
              
              {/* Row 1: Username / Apple ID */}
              <div className="ios-cell">
                <div className="ios-cell-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="ios-cell-content">
                  <label htmlFor="ios-username" className="ios-cell-label">Username</label>
                  <input
                    id="ios-username"
                    ref={usernameInputRef}
                    className="ios-input"
                    type="text"
                    placeholder="Username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    autoComplete="username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                {username && (
                  <button
                    type="button"
                    className="ios-clear-btn"
                    onClick={() => setUsername('')}
                    aria-label="Clear username"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Row 2: Password */}
              <div className="ios-cell">
                <div className="ios-cell-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div className="ios-cell-content">
                  <label htmlFor="ios-password" className="ios-cell-label">Password</label>
                  <input
                    id="ios-password"
                    className="ios-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={tab === 'register' ? 'At least 6 characters' : 'Required'}
                    autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <button
                  type="button"
                  className="ios-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Row 3 (Register only): Confirm Password */}
              {tab === 'register' && (
                <div className="ios-cell ios-cell-animate">
                  <div className="ios-cell-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <polyline points="9 12 11 14 15 10" />
                    </svg>
                  </div>
                  <div className="ios-cell-content">
                    <label htmlFor="ios-confirm-password" className="ios-cell-label">Confirm Password</label>
                    <input
                      id="ios-confirm-password"
                      className="ios-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            {/* iOS System Error Banner */}
            {error && (
              <div className="ios-error-banner" role="alert">
                <div className="ios-error-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                </div>
                <span className="ios-error-text">{error}</span>
              </div>
            )}

            {/* Apple Primary Action Button */}
            <button
              className="ios-primary-btn"
              type="submit"
              disabled={loading || !username.trim() || !password}
            >
              {loading ? (
                <div className="ios-spinner" aria-label="Loading">
                  <div className="ios-spinner-blade" />
                  <div className="ios-spinner-blade" />
                  <div className="ios-spinner-blade" />
                  <div className="ios-spinner-blade" />
                  <div className="ios-spinner-blade" />
                  <div className="ios-spinner-blade" />
                  <div className="ios-spinner-blade" />
                  <div className="ios-spinner-blade" />
                </div>
              ) : (
                <>
                  <span>{tab === 'login' ? 'Continue' : 'Create ID'}</span>
                  <svg className="ios-btn-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Apple Privacy Footer */}
          <footer className="ios-privacy-footer">
            <div className="ios-privacy-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Encrypted with JWT &amp; Secure Cookies</span>
            </div>
            <p className="ios-footer-note">
              {tab === 'login' ? (
                <>
                  Don&apos;t have an Aequitas ID?{' '}
                  <button type="button" className="ios-link-btn" onClick={() => switchTab('register')}>
                    Create yours now
                  </button>
                </>
              ) : (
                <>
                  Already have an Aequitas ID?{' '}
                  <button type="button" className="ios-link-btn" onClick={() => switchTab('login')}>
                    Sign In
                  </button>
                </>
              )}
            </p>
          </footer>

        </div>
      </main>
    </div>
  );
}
