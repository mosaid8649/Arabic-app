import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { practiceApi, lessonsApi } from '../../utils/api.js';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [daily, setDaily] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      practiceApi.getStats().catch(() => null),
      practiceApi.getDailyProgress().catch(() => []),
      lessonsApi.getAll().catch(() => []),
    ]).then(([s, d, l]) => {
      setStats(s);
      setDaily(d || []);
      setLessons(l || []);
      if (!s) setError('Cannot connect to backend. Make sure the backend server is running on port 5001.');
    }).catch(e => {
      setError('Cannot connect to backend: ' + e.message);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 32, height: 32, marginBottom: 16 }} />
          <p>Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 560, margin: '60px auto', textAlign: 'center' }}>
        <div className="card">
          <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⚠️</div>
          <h2 style={{ marginBottom: 12 }}>Backend not connected</h2>
          <p style={{ marginBottom: 20, color: 'var(--accent-red)' }}>{error}</p>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 20, textAlign: 'left', fontFamily: 'var(--mono-font)', fontSize: '0.85rem' }}>
            <div style={{ marginBottom: 8, color: 'var(--text-muted)' }}># In a terminal, run:</div>
            <div style={{ color: 'var(--accent-green)' }}>cd arabic-app/backend</div>
            <div style={{ color: 'var(--accent-green)' }}>npm install</div>
            <div style={{ color: 'var(--accent-green)' }}>node src/server.js</div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const overall = stats?.overall || {};
  const accuracy = overall.total_attempts > 0
    ? Math.round((overall.total_correct / overall.total_attempts) * 100)
    : 0;

  const chartData = daily.map(d => ({
    date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    attempts: d.attempts,
    correct: d.correct,
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your Arabic learning progress at a glance</p>
        </div>
        <Link to="/practice" className="btn btn-primary btn-lg">
          ✦ Start Practice
        </Link>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard value={overall.total_words || 0} label="Total Words" sub="in your library" accent="gold" icon="◇" />
        <StatCard value={overall.practiced_words || 0} label="Words Practiced"
          sub={`${overall.total_words ? Math.round((overall.practiced_words / overall.total_words) * 100) : 0}% of library`}
          accent="blue" icon="✓" />
        <StatCard value={`${accuracy}%`} label="Overall Accuracy"
          sub={`${overall.total_attempts || 0} total attempts`}
          accent={accuracy >= 70 ? 'green' : accuracy >= 40 ? 'orange' : 'red'} icon="◈" />
        <StatCard value={stats?.dueForReview || 0} label="Due for Review" sub="spaced repetition" accent="purple" icon="↻" />
        <StatCard value={overall.today_attempts || 0} label="Today's Attempts"
          sub={`${overall.practice_days || 0} days practiced`} accent="orange" icon="★" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>30-Day Practice Activity</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAttempts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4a853" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d4a853" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCorrect" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3fb950" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3fb950" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#484f58" tick={{ fontSize: 11 }} />
                <YAxis stroke="#484f58" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1c2128', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="attempts" stroke="#d4a853" fill="url(#colorAttempts)" strokeWidth={2} name="Attempts" />
                <Area type="monotone" dataKey="correct" stroke="#3fb950" fill="url(#colorCorrect)" strokeWidth={2} name="Correct" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon">📊</div>
              <p>No practice data yet. Start practicing to see your progress!</p>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Lessons ({lessons.length})
          </h3>
          {lessons.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lessons.slice(0, 8).map(l => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{l.name}</span>
                  <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>{l.word_count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '30px 10px' }}>
              <p>No lessons yet. <Link to="/upload">Upload a file</Link> to get started.</p>
            </div>
          )}
        </div>
      </div>

      {stats?.weakWords?.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Words Needing Work</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {stats.weakWords.map((w, i) => (
              <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', minWidth: 140 }}>
                <span className="arabic-text" style={{ fontSize: '1.1em' }}>{w.arabic}</span>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{w.english}</div>
                <div style={{ fontSize: '0.72rem', color: w.accuracy < 40 ? 'var(--accent-red)' : 'var(--accent-orange)' }}>{w.accuracy}% accuracy</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(overall.total_words || 0) === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '48px', marginTop: 20 }}>
          <div style={{ fontFamily: 'var(--arabic-font)', fontSize: '3rem', color: 'var(--accent-gold)', opacity: 0.7, marginBottom: 16 }}>ع</div>
          <h2 style={{ marginBottom: 8 }}>Welcome to Arabic Studio</h2>
          <p style={{ marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
            Get started by uploading your Excel vocabulary files.
          </p>
          <Link to="/upload" className="btn btn-primary btn-lg">↑ Upload Your First File</Link>
        </div>
      )}
    </div>
  );
}

function StatCard({ value, label, sub, accent = 'gold', icon }) {
  const colors = { gold: 'var(--accent-gold)', blue: 'var(--accent-blue)', green: 'var(--accent-green)', red: 'var(--accent-red)', orange: 'var(--accent-orange)', purple: 'var(--accent-purple)' };
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="stat-value" style={{ color: colors[accent] }}>{value}</div>
          <div className="stat-label" style={{ marginTop: 6 }}>{label}</div>
          {sub && <div className="stat-sub" style={{ marginTop: 3 }}>{sub}</div>}
        </div>
        <div style={{ fontSize: '1.2rem', color: colors[accent], opacity: 0.5 }}>{icon}</div>
      </div>
    </div>
  );
}
