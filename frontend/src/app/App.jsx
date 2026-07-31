import { useState, useRef, useEffect } from 'react';
import './App.css';

// ─── API ────────────────────────────────────────────────────────────────────
const API_URL = '/api/compare';

const runBattle = async (problem) => {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problem }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(body.error || `Server error (${res.status})`);
  }

  return body;
};

// ─── Helpers ────────────────────────────────────────────────────────────────
// Render **bold** markdown inline
const renderMd = (text = '') =>
  text.split(/(\*\*[^*]+\*\*)/).map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : p
  );

// Verdict label derived from scores — never hardcoded
const verdictLabel = (j) =>
  j.solution_1_score > j.solution_2_score ? 'Solution 1 Preferred'
  : j.solution_1_score < j.solution_2_score ? 'Solution 2 Preferred'
  : 'Tie';

// ─── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [theme,   setTheme]   = useState(() => {
    const saved = localStorage.getItem('aq-theme');
    return saved === 'dark' ? 'dark' : 'light';
  });
  const [input,   setInput]   = useState('');
  const [chats,   setChats]   = useState([]);
  const [running, setRunning] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { localStorage.setItem('aq-theme', theme); }, [theme]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chats]);

  const submit = async (question) => {
    if (!question.trim() || running) return;
    const id = Date.now();
    setChats(prev => [...prev, { id, question, data: null, error: null }]);
    setInput('');
    setRunning(true);

    try {
      const data = await runBattle(question);
      setChats(prev => prev.map(c => c.id === id ? { ...c, data } : c));
    } catch (err) {
      setChats(prev => prev.map(c => c.id === id ? { ...c, error: err.message } : c));
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
          {/* <div className="brand-mark">
            <img src="/logoOrg.png" alt="Aequitas AI logo" className="brand-logo" />
          </div> */}
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
        </div>
      </nav>

      {/* ── Feed ── */}
      <main className="feed">
        <div className="feed-inner">
          {chats.length === 0 ? (
            <div className="welcome">
              {/* <div className="welcome-icon">
                <img src="/logoOrg.png" alt="Aequitas AI logo" className="brand-logo" />
              </div> */}
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
                {/* Divider between turns (not before first) */}
                {idx > 0 && (
                  <div className="turn-divider" style={{ marginBottom: 32 }}>
                    Round {idx + 1}
                  </div>
                )}

                <div className="turn">
                  {/* User bubble */}
                  <div className="turn-label">You</div>
                  <div className="user-bubble">{chat.question}</div>

                  {/* Loading */}
                  {!chat.data && !chat.error && (
                    <div className="loading">
                      <div className="dots">
                        <div className="dot" /><div className="dot" /><div className="dot" />
                      </div>
                      <span className="loading-txt">Running the battle: two models answering & an AI judge scoring…</span>
                    </div>
                  )}

                  {/* Error */}
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

                  {/* Solutions + Judge */}
                  {chat.data && (() => {
                    const { solution_1, solution_2, judge } = chat.data;
                    return (
                      <>
                        {/* Two solution cards */}
                        <div className="solutions-grid">
                          {[
                            { label: 'Solution 1', body: solution_1, score: judge.solution_1_score },
                            { label: 'Solution 2', body: solution_2, score: judge.solution_2_score },
                          ].map(({ label, body, score }) => (
                            <div className="sol-card" key={label}>
                              <div className="sol-header">
                                <span className="sol-title">{label}</span>
                                {/* Score comes from data — never hardcoded */}
                                <span className="score-badge">{score} / 10</span>
                              </div>
                              <div className="sol-body">{renderMd(body)}</div>
                            </div>
                          ))}
                        </div>

                        {/* Judge card */}
                        <div className="judge-card">
                          <div className="judge-header">
                            <div className="judge-title-row">
                              <span className="judge-icon">⚖️</span>
                              <span className="judge-title">Judge's Recommendation</span>
                            </div>
                            {/* Verdict derived from scores dynamically */}
                            <span className="verdict-pill">{verdictLabel(judge)}</span>
                          </div>

                          <div className="verdict-block">
                            <div className="verdict-label">Comparative Verdict</div>
                            <p className="verdict-text">{judge.comparative_verdict}</p>
                          </div>

                          <div className="reason-grid">
                            <div className="reason-col">
                              <span className="reason-header">
                                Solution 1 — {judge.solution_1_score}/10
                              </span>
                              <p className="reason-text">{judge.solution_1_reasoning}</p>
                            </div>
                            <div className="reason-col">
                              <span className="reason-header">
                                Solution 2 — {judge.solution_2_score}/10
                              </span>
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
