import React, { useState, useEffect, useCallback, useRef } from 'react';
import { wordsApi, lessonsApi } from '../../utils/api.js';
import { useToast } from '../../hooks/useToast.jsx';
import DifficultyDots from '../common/DifficultyDots.jsx';

export default function VocabularyPage() {
  const [words, setWords] = useState([]);
  const [total, setTotal] = useState(0);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('DESC');
  const [page, setPage] = useState(0);
  const [editWord, setEditWord] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const limit = 50;
  const toast = useToast();
  const searchTimeout = useRef();

  const loadWords = useCallback(async () => {
    setLoading(true);
    try {
      const result = await wordsApi.getAll({
        search: search || undefined,
        lessonId: lessonId || undefined,
        limit,
        offset: page * limit,
        sortBy,
        sortDir,
      });
      setWords(result.words);
      setTotal(result.total);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, lessonId, page, sortBy, sortDir]);

  useEffect(() => {
    lessonsApi.getAll().then(setLessons).catch(() => {});
  }, []);

  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(loadWords, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [loadWords]);

  const handleDelete = async (id) => {
    try {
      await wordsApi.delete(id);
      toast.success('Word deleted');
      setDeleteConfirm(null);
      loadWords();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSaveEdit = async (data) => {
    try {
      await wordsApi.update(editWord.id, data);
      toast.success('Word updated');
      setEditWord(null);
      loadWords();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Vocabulary</h1>
          <p className="page-subtitle">{total} words in your library</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input
          className="input search"
          placeholder="🔍 Search Arabic or English…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
        <select
          className="select"
          value={lessonId}
          onChange={(e) => { setLessonId(e.target.value); setPage(0); }}
          style={{ maxWidth: 200 }}
        >
          <option value="">All Lessons</option>
          {lessons.map(l => (
            <option key={l.id} value={l.id}>{l.name} ({l.word_count})</option>
          ))}
        </select>
        <select
          className="select"
          value={`${sortBy}:${sortDir}`}
          onChange={(e) => {
            const [by, dir] = e.target.value.split(':');
            setSortBy(by); setSortDir(dir); setPage(0);
          }}
          style={{ maxWidth: 180 }}
        >
          <option value="created_at:DESC">Newest first</option>
          <option value="created_at:ASC">Oldest first</option>
          <option value="arabic:ASC">Arabic A-Z</option>
          <option value="english:ASC">English A-Z</option>
          <option value="difficulty:ASC">Easiest first</option>
          <option value="difficulty:DESC">Hardest first</option>
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : words.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">◇</div>
            <h3>No words found</h3>
            <p>{search ? 'Try a different search term.' : 'Upload an Excel file to add vocabulary.'}</p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Arabic</th>
                  <th>English</th>
                  <th>Transliteration</th>
                  <th>Lesson</th>
                  <th>Difficulty</th>
                  <th>Accuracy</th>
                  <th style={{ width: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {words.map(w => {
                  const acc = w.total_attempts > 0 ? Math.round((w.correct_attempts / w.total_attempts) * 100) : null;
                  return (
                    <tr key={w.id}>
                      <td>
                        <span className="arabic-text" style={{ fontSize: '1.15em' }}>{w.arabic}</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{w.english}</td>
                      <td style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                        {w.transliteration || '—'}
                      </td>
                      <td>
                        {w.lesson_name
                          ? <span className="badge badge-gold">{w.lesson_name}</span>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td><DifficultyDots level={w.difficulty} size="sm" /></td>
                      <td>
                        {acc !== null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="progress-bar" style={{ width: 60 }}>
                              <div className={`progress-fill ${acc >= 70 ? 'green' : ''}`} style={{ width: `${acc}%` }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{acc}%</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>not practiced</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn btn-icon btn-ghost"
                            onClick={() => setEditWord(w)}
                            title="Edit"
                          >✎</button>
                          <button
                            className="btn btn-icon btn-ghost"
                            style={{ color: 'var(--accent-red)' }}
                            onClick={() => setDeleteConfirm(w)}
                            title="Delete"
                          >✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            ← Prev
          </button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Page {page + 1} of {Math.ceil(total / limit)} · {total} words
          </span>
          <button className="btn btn-secondary btn-sm" disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)}>
            Next →
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editWord && (
        <EditWordModal
          word={editWord}
          lessons={lessons}
          onSave={handleSaveEdit}
          onClose={() => setEditWord(null)}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3 style={{ marginBottom: 12 }}>Delete Word?</h3>
            <p style={{ marginBottom: 8 }}>
              Are you sure you want to delete <strong className="arabic-text" style={{ fontSize: '1.1em' }}>{deleteConfirm.arabic}</strong>?
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--accent-red)', marginBottom: 24 }}>
              This will also delete all practice history for this word.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditWordModal({ word, lessons, onSave, onClose }) {
  const [form, setForm] = useState({
    arabic: word.arabic || '',
    english: word.english || '',
    transliteration: word.transliteration || '',
    example_sentence: word.example_sentence || '',
    example_translation: word.example_translation || '',
    lesson_id: word.lesson_id || '',
    difficulty: word.difficulty || 1,
    notes: word.notes || '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3>Edit Word</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1' }}>
            <label className="label">Arabic *</label>
            <input className="input" style={{ direction: 'rtl', fontFamily: 'var(--arabic-font)', fontSize: '1.1rem' }}
              value={form.arabic} onChange={e => set('arabic', e.target.value)} />
          </div>
          <div>
            <label className="label">English *</label>
            <input className="input" value={form.english} onChange={e => set('english', e.target.value)} />
          </div>
          <div>
            <label className="label">Transliteration</label>
            <input className="input" value={form.transliteration} onChange={e => set('transliteration', e.target.value)} />
          </div>
          <div>
            <label className="label">Lesson</label>
            <select className="select" value={form.lesson_id} onChange={e => set('lesson_id', e.target.value)}>
              <option value="">None</option>
              {lessons.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="label">Example Sentence (Arabic)</label>
            <input className="input" style={{ direction: 'rtl', fontFamily: 'var(--arabic-font)' }}
              value={form.example_sentence} onChange={e => set('example_sentence', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="label">Example Translation</label>
            <input className="input" value={form.example_translation} onChange={e => set('example_translation', e.target.value)} />
          </div>
          <div>
            <label className="label">Difficulty (1–5)</label>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n}
                  className={`btn btn-sm ${form.difficulty === n ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => set('difficulty', n)}
                >{n}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes…" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={!form.arabic || !form.english}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
