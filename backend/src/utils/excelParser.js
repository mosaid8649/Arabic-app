const XLSX = require('xlsx');

function cleanText(text) {
  if (!text && text !== 0) return null;
  return String(text).trim().replace(/\u200B/g, '').replace(/\u00A0/g, ' ').trim() || null;
}

function isArabic(str) {
  return /[\u0600-\u06FF]/.test(str || '');
}

function normalize(str) {
  return String(str || '').toLowerCase().trim().replace(/[\s_\-]+/g, ' ');
}

function parseDifficulty(value) {
  const num = parseInt(value);
  if (isNaN(num)) return 1;
  return Math.min(5, Math.max(1, num));
}

// Map headers to column indices
function mapHeaders(headers) {
  const ALIASES = {
    arabic:   ['arabic','arabic word','word','كلمة','الكلمة','ar','عربي','المفردة'],
    english:  ['english','meaning','translation','المعنى','معنى','الترجمة','ترجمة','الشرح','شرح','en'],
    transliteration: ['transliteration','romanization','phonetic','pronunciation','النطق','نطق'],
    example_sentence: ['example sentence','example','sentence','الجملة','جملة','مثال','الأمثلة','usage'],
    example_translation: ['example translation','sentence translation','example_translation'],
    lesson:   ['lesson','category','unit','chapter','الدرس','درس','الوحدة','وحدة','الباب'],
    difficulty: ['difficulty','level','مستوى'],
    past:     ['ماض','الفعل الماضي','past','past tense'],
    masdar:   ['مصدر','المصدر','masdar','verbal noun'],
    present:  ['مضارع','المضارع','present','present tense'],
    plural:   ['الجمع','جمع','plural'],
    opposite: ['المضاد','مضاد','opposite','antonym'],
  };

  const mapping = {};
  headers.forEach((h, idx) => {
    const n = normalize(h);
    for (const [field, aliases] of Object.entries(ALIASES)) {
      if (aliases.map(a => a.toLowerCase()).includes(n) && mapping[field] === undefined) {
        mapping[field] = idx;
        break;
      }
    }
  });
  return mapping;
}

function parseExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const results = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rawData.length < 2) continue;

    const headers = rawData[0];
    const m = mapHeaders(headers);

    // Detect file type
    const hasEnglishCol = m.english !== undefined;
    const hasPastVerbCol = m.past !== undefined;
    const hasArabicCol = m.arabic !== undefined;

    // Auto-detect Arabic word column if not mapped by name
    if (!hasArabicCol && !hasPastVerbCol) {
      for (let col = 0; col < Math.min(headers.length, 6); col++) {
        const samples = rawData.slice(1, 6).map(r => String(r[col] || ''));
        if (samples.filter(isArabic).length >= 2 && samples.filter(s => s.length < 30).length >= 3) {
          m.arabic = col;
          break;
        }
      }
    }

    if (m.arabic === undefined && m.past === undefined) continue;

    const lessonFromSheet = isArabic(sheetName) ? sheetName : (sheetName !== 'Sheet1' ? sheetName : null);

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];

      // ── Determine the Arabic word ──────────────────────────
      // Priority: arabic col → past tense col
      const nounWord = m.arabic !== undefined ? cleanText(row[m.arabic]) : null;
      const verbWord = m.past !== undefined ? cleanText(row[m.past]) : null;
      const masdar   = m.masdar !== undefined ? cleanText(row[m.masdar]) : null;
      const present  = m.present !== undefined ? cleanText(row[m.present]) : null;
      const plural   = m.plural !== undefined ? cleanText(row[m.plural]) : null;

      // Collect valid Arabic words from this row
      const wordsToAdd = [];

      // Add noun if present and it's actually Arabic (not a sentence)
      if (nounWord && isArabic(nounWord) && nounWord.split(' ').length <= 4) {
        wordsToAdd.push({ arabic: nounWord, type: 'noun' });
      }

      // Add verb (past tense) if present
      if (verbWord && isArabic(verbWord) && verbWord.split(' ').length <= 3) {
        wordsToAdd.push({ arabic: verbWord, type: 'verb' });
      }

      if (wordsToAdd.length === 0) continue;

      // ── Determine English meaning ──────────────────────────
      let baseEnglish = hasEnglishCol ? cleanText(row[m.english]) : null;

      // ── Example sentence ──────────────────────────────────
      const example = m.example_sentence !== undefined ? cleanText(row[m.example_sentence]) : null;
      // Only use as example if it looks like a sentence (more than 3 words)
      const exampleSentence = example && example.split(' ').length > 3 ? example : null;

      // ── Lesson ────────────────────────────────────────────
      const lesson = m.lesson !== undefined ? cleanText(row[m.lesson]) : lessonFromSheet;

      for (const { arabic, type } of wordsToAdd) {
        // Build English meaning
        let english = baseEnglish;
        if (!english) {
          // Build a descriptive placeholder from available data
          const parts = [];
          if (type === 'verb') {
            if (present) parts.push(`مضارع: ${present}`);
            if (masdar) parts.push(`مصدر: ${masdar}`);
            english = parts.length > 0 ? parts.join(' | ') : '(فعل)';
          } else {
            if (plural) parts.push(`جمع: ${plural}`);
            english = parts.length > 0 ? parts.join(' | ') : '(اسم)';
          }
        }

        results.push({
          arabic,
          english,
          transliteration: m.transliteration !== undefined ? cleanText(row[m.transliteration]) : null,
          example_sentence: exampleSentence,
          example_translation: m.example_translation !== undefined ? cleanText(row[m.example_translation]) : null,
          lesson,
          difficulty: m.difficulty !== undefined ? parseDifficulty(row[m.difficulty]) : 1,
          rowIndex: i + 1,
        });
      }
    }
  }

  return results;
}

function validateWords(words) {
  const valid = [], errors = [];
  words.forEach((word, idx) => {
    const errs = [];
    if (!word.arabic || word.arabic.length < 1) errs.push('Arabic field empty');
    if (!word.english || word.english.length < 1) errs.push('Meaning field empty');
    if (word.arabic && word.arabic.length > 300) errs.push('Arabic text too long');
    if (errs.length > 0) {
      errors.push({ row: word.rowIndex || idx + 2, word: word.arabic || '(empty)', errors: errs });
    } else {
      valid.push(word);
    }
  });
  return { valid, errors };
}

module.exports = { parseExcelBuffer, validateWords };
