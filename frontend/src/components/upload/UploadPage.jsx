import React, { useState, useRef, useCallback } from 'react';
import { uploadApi, lessonsApi } from '../../utils/api.js';
import { useToast } from '../../hooks/useToast.jsx';

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [lessonName, setLessonName] = useState('');
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const fileRef = useRef();
  const toast = useToast();

  const loadHistory = useCallback(async () => {
    if (historyLoaded) return;
    try {
      const h = await uploadApi.history();
      setHistory(h);
      setHistoryLoaded(true);
    } catch {}
  }, [historyLoaded]);

  React.useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleFile = async (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return;
    }
    setFile(f);
    setPreview(null);
    setImportResult(null);
    setLoading(true);
    try {
      const result = await uploadApi.preview(f);
      setPreview(result);
      if (result.lessons?.length === 1) setLessonName(result.lessons[0]);
    } catch (err) {
      toast.error(`Parse error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const result = await uploadApi.import(file, lessonName);
      setImportResult(result);
      toast.success(`Imported ${result.imported} words!`);
      setFile(null);
      setPreview(null);
      setHistoryLoaded(false);
      loadHistory();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setImportResult(null);
    setLessonName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Upload Vocabulary</h1>
          <p className="page-subtitle">Import words from Excel files into your library</p>
        </div>
      </div>

      {/* Import result */}
      {importResult && (
        <div className="alert alert-success" style={{ marginBottom: 24 }}>
          <span>✓</span>
          <div>
            <strong>Import successful!</strong> {importResult.message}
            {importResult.lessonBreakdown?.map((l, i) => (
              <div key={i} style={{ fontSize: '0.8rem', marginTop: 4 }}>
                Lesson "{l.lesson}": {l.imported} imported, {l.skipped} duplicates skipped
              </div>
            ))}
            <button className="btn btn-sm btn-ghost" style={{ marginTop: 8 }} onClick={reset}>
              Upload another file
            </button>
          </div>
        </div>
      )}

      {/* Format guide */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '0.9rem', marginBottom: 12, color: 'var(--text-secondary)' }}>📋 Expected Excel Format</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ fontSize: '0.8rem' }}>
            <thead>
              <tr>
                <th>Arabic Word</th>
                <th>English Meaning</th>
                <th>Transliteration</th>
                <th>Example Sentence</th>
                <th>Lesson</th>
                <th>Difficulty</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="arabic-text" style={{ fontSize: '1em' }}>كِتَاب</span></td>
                <td>Book</td>
                <td>kitāb</td>
                <td><span className="arabic-text" style={{ fontSize: '0.9em' }}>أقرأُ كِتَاباً</span></td>
                <td>Lesson 1</td>
                <td>1</td>
              </tr>
              <tr>
                <td><span className="arabic-text" style={{ fontSize: '1em' }}>مَاء</span></td>
                <td>Water</td>
                <td>mā'</td>
                <td></td>
                <td>Lesson 1</td>
                <td>1</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 10 }}>
          Only Arabic and English columns are required. The app auto-detects column names (case-insensitive). Sheet names are used as lesson names if no Lesson column exists.
        </p>
      </div>

      {/* Upload zone */}
      {!preview && !importResult && (
        <div
          className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {loading ? (
            <div>
              <div className="spinner" style={{ width: 40, height: 40, marginBottom: 16 }} />
              <p>Parsing your file…</p>
            </div>
          ) : (
            <>
              <div className="drop-zone-icon">📂</div>
              <h3 style={{ marginBottom: 8 }}>Drop your Excel file here</h3>
              <p style={{ marginBottom: 16 }}>or click to browse</p>
              <span className="badge badge-muted">.xlsx and .xls supported · max 10MB</span>
            </>
          )}
        </div>
      )}

      {/* Preview */}
      {preview && !importResult && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ marginBottom: 4 }}>📄 {preview.filename}</h3>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                  <span className="badge badge-blue">{preview.totalRows} rows total</span>
                  <span className="badge badge-green">{preview.validRows} valid</span>
                  {preview.errorRows > 0 && <span className="badge badge-red">{preview.errorRows} errors</span>}
                  {preview.lessons?.length > 0 && (
                    preview.lessons.map(l => <span key={l} className="badge badge-gold">{l}</span>)
                  )}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={reset}>✕ Cancel</button>
            </div>

            {/* Errors */}
            {preview.errors?.length > 0 && (
              <div className="alert alert-warning" style={{ marginTop: 16 }}>
                <span>⚠</span>
                <div>
                  <strong>{preview.errorRows} rows had issues</strong> (they will be skipped):
                  {preview.errors.slice(0, 5).map((e, i) => (
                    <div key={i} style={{ fontSize: '0.78rem', marginTop: 2 }}>
                      Row {e.row}: {e.errors.join(', ')}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lesson name override */}
            <div style={{ marginTop: 20, maxWidth: 360 }}>
              <label className="label">Override lesson name (optional)</label>
              <input
                className="input"
                placeholder="e.g. Lesson 3 — Animals"
                value={lessonName}
                onChange={(e) => setLessonName(e.target.value)}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 5 }}>
                If set, all words will be added to this lesson. Otherwise, lesson names from the file are used.
              </p>
            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleImport}
                disabled={loading}
              >
                {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Importing…</> : `↑ Import ${preview.validRows} Words`}
              </button>
              <button className="btn btn-secondary" onClick={reset}>Cancel</button>
            </div>
          </div>

          {/* Preview table */}
          <div className="card">
            <h3 style={{ marginBottom: 14, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Preview (first 20 words)
            </h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Arabic</th>
                    <th>English</th>
                    <th>Transliteration</th>
                    <th>Example</th>
                    <th>Lesson</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((w, i) => (
                    <tr key={i}>
                      <td><span className="arabic-text" style={{ fontSize: '1.1em' }}>{w.arabic}</span></td>
                      <td>{w.english}</td>
                      <td style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{w.transliteration || '—'}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {w.example_sentence ? <span className="arabic-text" style={{ fontSize: '0.9em' }}>{w.example_sentence}</span> : '—'}
                      </td>
                      <td>{w.lesson ? <span className="badge badge-muted">{w.lesson}</span> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Upload history */}
      {history.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 14, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Upload History</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>File</th>
                  <th>Imported</th>
                  <th>Skipped</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id}>
                    <td style={{ fontFamily: 'var(--mono-font)', fontSize: '0.82rem' }}>{h.original_name}</td>
                    <td><span className="badge badge-green">{h.words_imported}</span></td>
                    <td><span className="badge badge-muted">{h.words_skipped}</span></td>
                    <td><span className={`badge badge-${h.status === 'completed' ? 'green' : 'red'}`}>{h.status}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {new Date(h.uploaded_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
