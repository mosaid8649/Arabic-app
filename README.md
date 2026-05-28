# 🌙 Arabic Learning Studio

A full-stack Arabic vocabulary learning app — upload Excel files, build a personal word library, and practice with sentence building, flashcards, and spaced repetition.

---

## ⚡ Quick Start (3 steps)

```bash
# 1. Install dependencies
cd backend  && npm install && cd ..
cd frontend && npm install && cd ..

# 2. Start backend (Terminal 1)
cd backend
node src/server.js
# → http://localhost:5000

# 3. Start frontend (Terminal 2)
cd frontend
npm run dev
# → http://localhost:3000
```

Then open **http://localhost:3000**, go to **Upload**, and drop in `sample_vocabulary.xlsx`.

---

## 🗂️ Project Structure

```
arabic-app/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── db.js           # sql.js SQLite singleton
│   │   │   ├── wordModel.js    # Words CRUD + search
│   │   │   ├── lessonModel.js  # Lessons CRUD
│   │   │   └── practiceModel.js# Sessions, attempts, SM-2 spaced repetition
│   │   ├── routes/
│   │   │   ├── words.js        # GET/POST/PUT/DELETE /api/words
│   │   │   ├── lessons.js      # GET/POST/PUT/DELETE /api/lessons
│   │   │   ├── upload.js       # POST /api/upload/preview|import
│   │   │   └── practice.js     # POST/GET /api/practice/*
│   │   ├── middleware/
│   │   │   └── index.js        # Error handler, validator
│   │   ├── utils/
│   │   │   └── excelParser.js  # xlsx parsing + column auto-detection
│   │   └── server.js           # Express app entry point
│   ├── .env
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/      # Dashboard with charts + stats
│   │   │   ├── upload/         # Drag-drop upload + preview
│   │   │   ├── vocabulary/     # Searchable word list + edit/delete
│   │   │   └── practice/       # 3 practice modes (sentence/flashcard/quiz)
│   │   ├── hooks/
│   │   │   └── useToast.jsx    # Toast notifications
│   │   ├── utils/
│   │   │   └── api.js          # Axios API client
│   │   ├── styles/
│   │   │   └── globals.css     # Full dark theme design system
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
├── sample_vocabulary.xlsx       # 23 Arabic words across 3 lessons — ready to import
├── start.sh                     # Production start (build + serve)
├── dev.sh                       # Dev mode (both servers + hot reload)
└── README.md
```

---

## 📊 Excel Format

The parser **auto-detects column names** — exact spelling doesn't matter:

| Column | Required | Recognised names |
|--------|----------|-----------------|
| Arabic Word | ✅ | arabic, word, كلمة, ar |
| English Meaning | ✅ | english, meaning, translation, en |
| Transliteration | — | transliteration, romanization, phonetic |
| Example Sentence | — | example sentence, example, usage |
| Example Translation | — | example translation, sentence translation |
| Lesson / Category | — | lesson, category, unit, chapter, topic |
| Difficulty (1–5) | — | difficulty, level, grade |

**Tips:**
- Multiple sheets are supported — sheet names become lesson names automatically
- Duplicate words (same Arabic + lesson) are silently skipped
- Files up to 10 MB accepted
- Both `.xlsx` and `.xls` supported

---

## 🔌 Full API Reference

### Words
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/words` | List all words (pagination, search, filter, sort) |
| GET | `/api/words?search=كتاب` | Search (Arabic with/without diacritics, English) |
| GET | `/api/words?lessonId=1` | Filter by lesson |
| GET | `/api/words?sortBy=english&sortDir=ASC` | Sort |
| GET | `/api/words?limit=20&offset=40` | Paginate |
| GET | `/api/words/random` | Random word (spaced repetition aware) |
| GET | `/api/words/random?lessonId=1&dueOnly=true` | Due-only from lesson |
| GET | `/api/words/random?exclude=1,2,3` | Exclude IDs from pool |
| GET | `/api/words/:id` | Single word with full stats |
| POST | `/api/words` | Create word |
| PUT | `/api/words/:id` | Update word |
| DELETE | `/api/words/:id` | Delete word + all practice history |

### Lessons
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/lessons` | All lessons with word counts |
| POST | `/api/lessons` | Create lesson |
| PUT | `/api/lessons/:id` | Rename / update lesson |
| DELETE | `/api/lessons/:id` | Delete lesson (words unassigned) |

### Upload
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/upload/preview` | Parse file, return preview — no DB write |
| POST | `/api/upload/import` | Parse and save to database |
| GET | `/api/upload/history` | Past 20 uploads |

### Practice
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/practice/session` | Start a session (`mode`: sentence/flashcard/quiz) |
| PUT | `/api/practice/session/:id/end` | End session + compute accuracy |
| POST | `/api/practice/attempt` | Record attempt + update SM-2 schedule |
| GET | `/api/practice/stats` | Aggregate stats, weak words, recent sessions |
| GET | `/api/practice/daily-progress` | 30-day chart data |

---

## 🧪 Quick API Test (curl)

```bash
# Health check
curl http://localhost:5000/api/health

# Import sample file
curl -X POST http://localhost:5000/api/upload/import \
  -F "file=@sample_vocabulary.xlsx"

# List words
curl "http://localhost:5000/api/words?limit=5&sortBy=english&sortDir=ASC"

# Search (Arabic without diacritics works too)
curl "http://localhost:5000/api/words?search=كتاب"
curl "http://localhost:5000/api/words?search=water"

# Random word
curl http://localhost:5000/api/words/random

# Create a manual word
curl -X POST http://localhost:5000/api/words \
  -H "Content-Type: application/json" \
  -d '{"arabic":"مَرْحَبَا","english":"Hello","transliteration":"marhaba","difficulty":1}'

# Start practice session
curl -X POST http://localhost:5000/api/practice/session \
  -H "Content-Type: application/json" \
  -d '{"mode":"sentence"}'

# Record attempt (replace IDs)
curl -X POST http://localhost:5000/api/practice/attempt \
  -H "Content-Type: application/json" \
  -d '{"sessionId":1,"wordId":5,"result":"correct","userInput":"الكتاب على الطاولة"}'

# Stats
curl http://localhost:5000/api/practice/stats
```

---

## 🧠 Spaced Repetition (SM-2)

Each word tracks:
- `ease_factor` — starts at 2.5, adjusts with performance
- `interval_days` — days until next review (1 → 6 → grows by ease_factor)  
- `next_review` — scheduled date
- `streak` — consecutive correct answers

**Correct answer:** interval grows × ease factor  
**Wrong answer:** interval resets to 1 day  

Use `/api/words/random?dueOnly=true` to only see words due for review.

---

## 🖥️ Practice Modes

| Mode | How it works |
|------|-------------|
| **Sentence Building** | See Arabic word → write a sentence using it → self-mark correct/incorrect |
| **Flashcard** | See Arabic → reveal English meaning → mark if you knew it |
| **Quick Quiz** | See Arabic → decide yes/no → reveal answer |

All modes update spaced repetition schedules automatically.

---

## ⚙️ Configuration (`backend/.env`)

```env
PORT=5000                           # API server port
NODE_ENV=development
DB_PATH=./data/arabic_vocab.db     # SQLite file path (created automatically)
UPLOAD_DIR=./uploads               # Temp dir for uploads
MAX_FILE_SIZE=10485760             # 10 MB
FRONTEND_URL=http://localhost:3000 # CORS origin
```

---

## 🚀 Production Deployment

```bash
# Build frontend
cd frontend && npm run build && cd ..

# Run everything from the backend (serves frontend + API)
cd backend
NODE_ENV=production node src/server.js
# → http://localhost:5000 serves both frontend and API
```

Or use the included scripts:
```bash
./start.sh   # production (builds + runs)
./dev.sh     # development (both servers with hot reload)
```

---

## 🔮 Phase 2 Roadmap (structure already in place)

- [ ] AI sentence feedback via Anthropic/OpenAI API
- [ ] Multiple-choice quiz mode
- [ ] Daily practice goals + streak calendar
- [ ] CSV export of progress
- [ ] PostgreSQL migration (all queries are standard SQL)
- [ ] Mobile PWA support
