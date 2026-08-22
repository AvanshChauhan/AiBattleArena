import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import AuthPage from './AuthPage.jsx';

// ─── Token storage ────────────────────────────────────────────────────────────
// Access token lives in module scope (memory) — never written to localStorage
// Refresh token lives in httpOnly cookie (set by backend, never accessible to JS)
// Username is persisted in localStorage for UI display across refreshes
let memoryToken = localStorage.getItem('aq-token') || '';

// ─── API helpers ──────────────────────────────────────────────────────────────
const API_URL = '/api/compare';

/** Silently get a new access token using the httpOnly refresh token cookie */
async function refreshAccessToken() {
  const res = await fetch('/auth/refresh', {
    method: 'POST',
    credentials: 'include', // browser sends the httpOnly cookie automatically
  });
  if (!res.ok) return null;
  const body = await res.json().catch(() => ({}));
  return body?.token || null;
}

/** Run a battle — auto-refreshes access token once on 401 */
async function runBattle(problem, getToken, onTokenRefreshed, onUnauthorized) {
  const doRequest = (token) =>
    fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify({ problem }),
    });

  let res = await doRequest(getToken());

  // One silent refresh attempt on 401
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      onUnauthorized();
      const err = new Error('Session expired. Please log in again.');
      err.code = 'UNAUTHORIZED';
      throw err;
    }
    onTokenRefreshed(newToken);
    res = await doRequest(newToken); // retry with fresh token
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Server error (${res.status})`);
  }
  return body;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const renderMd = (text = '') =>
  text.split(/(\*\*[^*]+\*\*)/).map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : p
  );

const verdictLabel = (j) =>
  j.solution_1_score > j.solution_2_score ? 'Solution 1 Preferred'
  : j.solution_1_score < j.solution_2_score ? 'Solution 2 Preferred'
  : 'Tie';

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('aq-theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  // Access token is kept in a ref (memory) — survives re-renders, not persisted
  const tokenRef = useRef(memoryToken);
  const [username, setUsername] = useState(() => localStorage.getItem('aq-username') || '');
  // isAuthed drives whether to show auth page; initialised from whether we have any token
  const [isAuthed, setIsAuthed] = useState(() => !!memoryToken);

  const [input,   setInput]   = useState('');
  const [chats,   setChats]   = useState([]);
  const [running, setRunning] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { localStorage.setItem('aq-theme', theme); }, [theme]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chats]);

  // On first load, if we have no token in memory try a silent refresh (cookie may exist)
  useEffect(() => {
    if (!tokenRef.current) {
      refreshAccessToken().then(newToken => {
        if (newToken) {
          tokenRef.current = newToken;
          memoryToken = newToken;
          setIsAuthed(true);
        }
      });
    }
  }, []);

  // ── Auth handlers ───────────────────────────────────────────────────────────
  const handleAuthSuccess = useCallback((newToken, newUsername) => {
    tokenRef.current = newToken;
    memoryToken = newToken;
    localStorage.setItem('aq-token', newToken);
    localStorage.setItem('aq-username', newUsername);
    setUsername(newUsername);
    setIsAuthed(true);
    setChats([]);
  }, []);

  const handleUnauthorized = useCallback(() => {
    tokenRef.current = '';
    memoryToken = '';
    localStorage.removeItem('aq-token');
    localStorage.removeItem('aq-username');
    setUsername('');
    setIsAuthed(false);
  }, []);

  const handleLogout = useCallback(async () => {
    // Tell the server to delete the refresh token from DB and clear cookie
    await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(console.error);
    handleUnauthorized();
    setChats([]);
    setInput('');
  }, [handleUnauthorized]);

  // ── Show auth page if not logged in ─────────────────────────────────────────
  if (!isAuthed) {
    return <AuthPage onSuccess={handleAuthSuccess} theme={theme} />;
  }

  // ── Battle logic ─────────────────────────────────────────────────────────────
  const submit = async (question) => {
    if (!question.trim() || running) return;
    const id = Date.now();
    setChats(prev => [...prev, { id, question, data: null, error: null }]);
    setInput('');
    setRunning(true);

    try {
      const data = await runBattle(
        question,
        () => tokenRef.current,
        (newToken) => {
          tokenRef.current = newToken;
          memoryToken = newToken;
          localStorage.setItem('aq-token', newToken);
        },
        handleUnauthorized
      );
      setChats(prev => prev.map(c => c.id === id ? { ...c, data } : c));
    } catch (err) {
      if (err.code !== 'UNAUTHORIZED') {
        setChats(prev => prev.map(c => c.id === id ? { ...c, error: err.message } : c));
      }
    } finally {
      setRunning(false);
    }
  };

  const retry = (id, question) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, data: null, error: null } : c));
    submit(question);
  };

  const onSubmit = (e) => { e.preventDefault(); submit(input); };

  return (
    <div className="app" data-theme={theme}>

      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="brand">
          <span className="brand-name">Aequitas AI</span>
        </div>

        <div className="nav-controls">
          {/* New Chat */}
          <button className="btn-new-chat" onClick={() => setChats([])} title="New comparison">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Chat
          </button>

          {/* Theme */}
          <div className="theme-group">
            {[['light','☀️'],['dark','🌙']].map(([t, icon]) => (
              <button key={t} className={`theme-btn${theme === t ? ' active' : ''}`}
                onClick={() => setTheme(t)} title={`${t} theme`}>{icon}</button>
            ))}
          </div>

          {/* Status */}
          <div className={`status-pill${running ? ' running' : ''}`}>
            <span className="status-dot" />
            {running ? 'Battle in progress…' : 'Model Judge Active'}
          </div>

          {/* User chip + Logout */}
          <div className="user-chip">
            <span className="user-avatar">{username.charAt(0).toUpperCase()}</span>
            <span className="user-name">{username}</span>
            <button className="btn-logout" onClick={handleLogout} title="Sign out">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Feed ── */}
      <main className="feed">
        <div className="feed-inner">
          {chats.length === 0 ? (
            <div className="welcome">
              <h1>Compare AI Responses</h1>
              <p>Submit any question and instantly compare two AI solutions side-by-side, scored and evaluated by a neutral judge.</p>
              <div className="suggestions">
                {[
                  ['🇮🇳', 'What is the capital city of India?'],
                  ['⚛️',  'Explain quantum computing in simple terms.'],
                  ['🐍',  'Compare Python and JavaScript for data science.'],
                ].map(([emoji, q]) => (
                  <button key={q} className="suggestion" onClick={() => submit(q)}>
                    {emoji}&nbsp; {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            chats.map((chat, idx) => (
              <div key={chat.id}>
                {idx > 0 && (
                  <div className="turn-divider" style={{ marginBottom: 32 }}>
                    Round {idx + 1}
                  </div>
                )}

                <div className="turn">
                  <div className="turn-label">You</div>
                  <div className="user-bubble">{chat.question}</div>

                  {!chat.data && !chat.error && (
                    <div className="loading">
                      <div className="dots">
                        <div className="dot" /><div className="dot" /><div className="dot" />
                      </div>
                      <span className="loading-txt">Running the battle: two models answering &amp; an AI judge scoring…</span>
                    </div>
                  )}

                  {!chat.data && chat.error && (
                    <div className="error-card">
                      <span className="error-icon">⚠️</span>
                      <div className="error-body">
                        <span className="error-title">Battle failed</span>
                        <p className="error-text">{chat.error}</p>
                      </div>
                      <button className="btn-retry" onClick={() => retry(chat.id, chat.question)}>
                        Retry
                      </button>
                    </div>
                  )}

                  {chat.data && (() => {
                    const { solution_1, solution_2, judge } = chat.data;
                    return (
                      <>
                        <div className="solutions-grid">
                          {[
                            { label: 'Solution 1', body: solution_1, score: judge.solution_1_score },
                            { label: 'Solution 2', body: solution_2, score: judge.solution_2_score },
                          ].map(({ label, body, score }) => (
                            <div className="sol-card" key={label}>
                              <div className="sol-header">
                                <span className="sol-title">{label}</span>
                                <span className="score-badge">{score} / 10</span>
                              </div>
                              <div className="sol-body">{renderMd(body)}</div>
                            </div>
                          ))}
                        </div>

                        <div className="judge-card">
                          <div className="judge-header">
                            <div className="judge-title-row">
                              <span className="judge-icon">⚖️</span>
                              <span className="judge-title">Judge's Recommendation</span>
                            </div>
                            <span className="verdict-pill">{verdictLabel(judge)}</span>
                          </div>

                          <div className="verdict-block">
                            <div className="verdict-label">Comparative Verdict</div>
                            <p className="verdict-text">{judge.comparative_verdict}</p>
                          </div>

                          <div className="reason-grid">
                            <div className="reason-col">
                              <span className="reason-header">Solution 1 — {judge.solution_1_score}/10</span>
                              <p className="reason-text">{judge.solution_1_reasoning}</p>
                            </div>
                            <div className="reason-col">
                              <span className="reason-header">Solution 2 — {judge.solution_2_score}/10</span>
                              <p className="reason-text">{judge.solution_2_reasoning}</p>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* ── Input bar ── */}
      <footer className="input-bar">
        <form className="input-form" onSubmit={onSubmit}>
          <input
            className="chat-input"
            placeholder="Ask anything to compare two AI models…"
            value={input}
            onChange={e => setInput(e.target.value)}
            autoFocus
          />
          <button className="send-btn" type="submit" disabled={!input.trim() || running}>
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
          </button>
        </form>
      </footer>
    </div>
  );
}
