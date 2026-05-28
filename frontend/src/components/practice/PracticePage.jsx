import React, { useState, useEffect, useRef } from 'react';
import { wordsApi, practiceApi, lessonsApi } from '../../utils/api.js';
import { useToast } from '../../hooks/useToast.jsx';
import DifficultyDots from '../common/DifficultyDots.jsx';

const MODES = [
  { id: 'sentence', label: 'Sentence Building', icon: '✍', desc: 'Write a sentence using the word' },
  { id: 'flashcard', label: 'Flashcard', icon: '◈', desc: 'See Arabic, recall meaning' },
  { id: 'quiz', label: 'Quick Quiz', icon: '⚡', desc: 'Mark correct or incorrect' },
];

export default function PracticePage() {
  const [phase, setPhase] = useState('setup'); // setup | practice | done
  const [mode, setMode] = useState('sentence');
  const [lessonId, setLessonId] = useState('');
  const [lessons, setLessons] = useState([]);
  const [dueOnly, setDueOnly] = useState(false);

  const [session, setSession] = useState(null);
  const [currentWord, setCurrentWord] = useState(null);
  const [shown, setShown] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0, skipped: 0 });
  const [seenIds, setSeenIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [wordLoading, setWordLoading] = useState(false);

  const inputRef = useRef();
  const toast = useToast();

  useEffect(() => {
    lessonsApi.getAll().then(setLessons).catch(() => {});
  }, []);

  const startSession = async () => {
    setLoading(true);
    try {
      const sess = await practiceApi.createSession(mode);
      setSession(sess);
      setSessionStats({ correct: 0, incorrect: 0, skipped: 0 });
      setSeenIds([]);
      setPhase('practice');
      await loadNextWord([], sess.id);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadNextWord = async (exclude = seenIds, sessionId) => {
    setWordLoading(true);
    setSubmitted(false);
    setShown(false);
    setUserInput('');
    try {
      const word = await wordsApi.getRandom({
        lessonId: lessonId || undefined,
        dueOnly,
        exclude: exclude.join(','),
      });
      setCurrentWord(word);
      setSeenIds(prev => [...prev, word.id]);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      // No more words
      setPhase('done');
    } finally {
      setWordLoading(false);
    }
  };

  const handleResult = async (result) => {
    if (!currentWord || !session) return;
    setSubmitted(true);

    setSessionStats(s => ({
      ...s,
      [result]: s[result] + 1
    }));

    try {
      await practiceApi.recordAttempt({
        sessionId: session.id,
        wordId: currentWord.id,
        userInput: userInput || null,
        result,
      });
    } catch {}
  };

  const handleNext = () => loadNextWord();

  const endSession = async () => {
    if (session) {
      try { await practiceApi.endSession(session.id); } catch {}
    }
    setPhase('done');
  };

  const resetToSetup = () => {
    setPhase('setup');
    setCurrentWord(null);
    setSession(null);
    setSeenIds([]);
  };

  const totalDone = sessionStats.correct + sessionStats.incorrect + sessionStats.skipped;
  const accuracy = totalDone > 0 ? Math.round((sessionStats.correct / totalDone) * 100) : 0;

  if (phase === 'setup') {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Practice</h1>
            <p className="page-subtitle">Choose your mode and start learning</p>
          </div>
        </div>

        <div style={{ maxWidth: 640 }}>
          {/* Mode select */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 16, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Practice Mode</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {MODES.map(m => (
                <label key={m.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 16px',
                  border: `2px solid ${mode === m.id ? 'var(--accent-gold)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  background: mode === m.id ? 'rgba(212,168,83,0.06)' : 'var(--bg-secondary)',
                  transition: 'all 0.15s',
                }}>
                  <input type="radio" name="mode" value={m.id} checked={mode === m.id}
                    onChange={() => setMode(m.id)} style={{ display: 'none' }} />
                  <span style={{ fontSize: '1.3rem' }}>{m.icon}</span>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{m.label}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{m.desc}</div>
                  </div>
                  {mode === m.id && <span style={{ marginLeft: 'auto', color: 'var(--accent-gold)' }}>✓</span>}
                </label>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 14, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Options</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label className="label">Filter by Lesson</label>
                <select className="select" value={lessonId} onChange={e => setLessonId(e.target.value)}>
                  <option value="">All Lessons</option>
                  {lessons.map(l => <option key={l.id} value={l.id}>{l.name} ({l.word_count} words)</option>)}
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={dueOnly} onChange={e => setDueOnly(e.target.checked)} />
                <span style={{ fontSize: '0.9rem' }}>Only show words due for spaced repetition review</span>
              </label>
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={startSession}
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Starting…</> : '✦ Start Practice Session'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', paddingTop: 40 }}>
        <div className="practice-card">
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>
            {accuracy >= 80 ? '🎉' : accuracy >= 50 ? '👍' : '💪'}
          </div>
          <h2 style={{ marginBottom: 8 }}>Session Complete!</h2>
          <p style={{ marginBottom: 28 }}>Great work on your Arabic practice.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{sessionStats.correct}</div>
              <div className="stat-label">Correct</div>
            </div>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <div className="stat-value" style={{ color: 'var(--accent-red)' }}>{sessionStats.incorrect}</div>
              <div className="stat-label">Incorrect</div>
            </div>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <div className="stat-value" style={{ color: 'var(--accent-gold)' }}>{accuracy}%</div>
              <div className="stat-label">Accuracy</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-primary btn-lg" onClick={startSession}>
              Practice Again
            </button>
            <button className="btn btn-secondary btn-lg" onClick={resetToSetup}>
              Change Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Practice phase
  return (
    <div>
      {/* Session progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="badge badge-green">✓ {sessionStats.correct}</span>
          <span className="badge badge-red">✕ {sessionStats.incorrect}</span>
          <span className="badge badge-muted">skip {sessionStats.skipped}</span>
          {totalDone > 0 && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {accuracy}% accuracy
            </span>
          )}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={endSession}>End Session</button>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {wordLoading ? (
          <div className="practice-card" style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : currentWord ? (
          <PracticeCard
            word={currentWord}
            mode={mode}
            submitted={submitted}
            shown={shown}
            userInput={userInput}
            inputRef={inputRef}
            onInputChange={setUserInput}
            onShowAnswer={() => setShown(true)}
            onResult={handleResult}
            onNext={handleNext}
          />
        ) : null}
      </div>
    </div>
  );
}

function PracticeCard({ word, mode, submitted, shown, userInput, inputRef, onInputChange, onShowAnswer, onResult, onNext }) {
  const streak = word.streak || 0;
  const acc = word.total_attempts > 0 ? Math.round((word.correct_attempts / word.total_attempts) * 100) : null;

  return (
    <div className="practice-card">
      {/* Word meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {word.lesson_name && <span className="badge badge-gold">{word.lesson_name}</span>}
          <DifficultyDots level={word.difficulty} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {streak > 0 && (
            <span className="badge badge-green" title="Current streak">🔥 {streak}</span>
          )}
          {acc !== null && (
            <span className="badge badge-muted">{acc}% accuracy</span>
          )}
        </div>
      </div>

      {/* Main Arabic word */}
      <div style={{ marginBottom: 12 }}>
        <div className="arabic-text arabic-xl" style={{ marginBottom: 8 }}>{word.arabic}</div>
        {word.transliteration && (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '1rem' }}>
            {word.transliteration}
          </div>
        )}
      </div>

      {/* Mode-specific content */}
      {mode === 'flashcard' && (
        <FlashcardMode
          word={word}
          shown={shown}
          submitted={submitted}
          onShowAnswer={onShowAnswer}
          onResult={onResult}
          onNext={onNext}
        />
      )}
      {mode === 'sentence' && (
        <SentenceMode
          word={word}
          shown={shown}
          submitted={submitted}
          userInput={userInput}
          inputRef={inputRef}
          onInputChange={onInputChange}
          onShowAnswer={onShowAnswer}
          onResult={onResult}
          onNext={onNext}
        />
      )}
      {mode === 'quiz' && (
        <QuizMode
          word={word}
          submitted={submitted}
          onResult={onResult}
          onNext={onNext}
        />
      )}
    </div>
  );
}

function FlashcardMode({ word, shown, submitted, onShowAnswer, onResult, onNext }) {
  return (
    <div>
      {!shown && !submitted ? (
        <>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>What does this word mean?</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-secondary btn-lg" onClick={onShowAnswer}>Reveal Meaning</button>
            <button className="btn btn-ghost" onClick={() => onResult('skipped')}>Skip</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: 4 }}>{word.english}</div>
            {word.example_sentence && (
              <div style={{ marginTop: 12 }}>
                <div className="arabic-text" style={{ fontSize: '1em' }}>{word.example_sentence}</div>
                {word.example_translation && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>{word.example_translation}</div>
                )}
              </div>
            )}
          </div>
          {!submitted ? (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-success btn-lg" onClick={() => onResult('correct')}>✓ I knew it</button>
              <button className="btn btn-danger btn-lg" onClick={() => onResult('incorrect')}>✕ Didn't know</button>
            </div>
          ) : (
            <button className="btn btn-primary btn-lg" onClick={onNext} style={{ marginTop: 8 }}>Next Word →</button>
          )}
        </>
      )}
    </div>
  );
}

function SentenceMode({ word, shown, submitted, userInput, inputRef, onInputChange, onShowAnswer, onResult, onNext }) {
  const handleSubmit = () => {
    if (!userInput.trim()) return;
    onShowAnswer();
  };

  return (
    <div>
      <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
        Write a sentence using this word: <strong style={{ color: 'var(--text-primary)' }}>{word.english}</strong>
      </p>

      <textarea
        ref={inputRef}
        className="textarea"
        placeholder="اكتب جملة هنا… / Write your sentence here…"
        value={userInput}
        onChange={e => onInputChange(e.target.value)}
        disabled={shown}
        style={{ direction: /[\u0600-\u06FF]/.test(userInput) ? 'rtl' : 'ltr', marginBottom: 14, minHeight: 80 }}
        onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSubmit(); }}
      />

      {!shown ? (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={!userInput.trim()}>
            Check Answer
          </button>
          <button className="btn btn-ghost" onClick={onShowAnswer}>Show Example</button>
          <button className="btn btn-ghost" onClick={() => onResult('skipped')}>Skip</button>
        </div>
      ) : (
        <>
          {/* Show example answer */}
          {(word.example_sentence || word.english) && (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '16px 20px', marginBottom: 16, textAlign: 'left' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Example / Meaning
              </div>
              <div style={{ fontWeight: 500, marginBottom: word.example_sentence ? 8 : 0 }}>{word.english}</div>
              {word.example_sentence && (
                <>
                  <div className="arabic-text" style={{ fontSize: '1.05em' }}>{word.example_sentence}</div>
                  {word.example_translation && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>{word.example_translation}</div>
                  )}
                </>
              )}
            </div>
          )}

          {!submitted ? (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-success btn-lg" onClick={() => onResult('correct')}>✓ Correct</button>
              <button className="btn btn-danger btn-lg" onClick={() => onResult('incorrect')}>✕ Incorrect</button>
              <button className="btn btn-ghost" onClick={() => onResult('skipped')}>Skip</button>
            </div>
          ) : (
            <button className="btn btn-primary btn-lg" onClick={onNext}>Next Word →</button>
          )}
        </>
      )}
    </div>
  );
}

function QuizMode({ word, submitted, onResult, onNext }) {
  return (
    <div>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        Do you know the meaning of this word?
      </p>
      {!submitted ? (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-success btn-lg" onClick={() => onResult('correct')}>✓ Yes, I know it</button>
          <button className="btn btn-danger btn-lg" onClick={() => onResult('incorrect')}>✕ No, show me</button>
          <button className="btn btn-ghost" onClick={() => onResult('skipped')}>Skip</button>
        </div>
      ) : (
        <>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: 4 }}>{word.english}</div>
            {word.transliteration && (
              <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{word.transliteration}</div>
            )}
            {word.example_sentence && (
              <div style={{ marginTop: 10 }}>
                <div className="arabic-text" style={{ fontSize: '1em' }}>{word.example_sentence}</div>
                {word.example_translation && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>{word.example_translation}</div>
                )}
              </div>
            )}
          </div>
          <button className="btn btn-primary btn-lg" onClick={onNext}>Next Word →</button>
        </>
      )}
    </div>
  );
}
