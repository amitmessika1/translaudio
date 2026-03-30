#  Translaudio

> Your audio knows more than you think.

An AI-powered audio intelligence platform that transforms raw audio into a searchable, interactive knowledge system using transcription, semantic retrieval (RAG) and an AI agent for learning recommendations.

---

##  Overview

Translaudio allows users to:

- Upload any audio file
- Automatically transcribe and translate it
- Ask questions about the content (RAG-based Q&A)
- Receive AI-curated learning resources based on their queries

This project demonstrates a full **end-to-end AI pipeline**, combining:

- Speech-to-text (Whisper)
- Vector search (pgvector)
- Retrieval-Augmented Generation (RAG)
- AI Agent-based recommendations

---

##  Features

### 🎙️ Audio Processing
- Supports multiple formats: `.mp3` `.wav` `.m4a` `.flac` `.aac` `.ogg` `.wma` `.opus` `.aiff` `.ape`
- Automatic language detection
- Optional translation to target language
- Timestamped transcript generation

---

### 🧠 RAG-based Q&A
- Ask natural language questions about your audio
- Semantic search retrieves relevant transcript chunks
- Answers are grounded in actual transcript data

---

### 🤖 AI Agent (Learning Recommendations)
- Understands your **question + answer + context**
- Infers:
  - Topic
  - Learning intent
- Recommends:
  - 📺 Videos (YouTube)
  - 📚 Articles
  - 🎧 Podcasts
  - 📖 References (Wikipedia)

---

### 📊 Additional Capabilities
- Transcript chunking with timestamps
- Vector embeddings for semantic search
- Summary generation
- Clean, modern UI with smooth animations

- **Transcription** — Whisper transcribes any audio format with automatic language detection
- **Translation** — Auto-translates to a target language via GPT when the source differs
- **Semantic Search** — pgvector-powered cosine similarity search over transcript chunks
- **RAG-based Q&A** — Ask questions and get answers grounded in actual transcript content, with timestamped source citations
- **AI Agent Recommendations** — Analyzes your question and the answer to recommend articles, YouTube videos, podcasts, and Wikipedia references
- **Summarization** — Concise summary of the full transcript
 
---

##  Architecture

```text
Upload Audio
   ↓
Whisper Transcription
   ↓
Chunking (timestamped segments)
   ↓
Embedding (OpenAI)
   ↓
PostgreSQL + pgvector
   ↓
Semantic Retrieval
   ↓
LLM Answer Generation (RAG)
   ↓
AI Agent → Learning Recommendations
```

## 🧱 Tech Stack

### 🖥️ Frontend
- Astro  
- React (interactive components)  
- TailwindCSS  
- TypeScript  

### ⚙️ Backend
- FastAPI  
- SQLAlchemy  
- OpenAI API  
- Whisper (local model)  

### 🗄️ Database
- PostgreSQL  
- pgvector (vector similarity search)  

### 🔗 External APIs
- OpenAI (LLM + embeddings)  
- YouTube Data API  
- Wikipedia API

| Layer | Technology |
|---|---|
| Frontend | Astro, React, TypeScript, Tailwind CSS |
| Backend | FastAPI (Python) |
| Transcription | OpenAI Whisper (`base` model, local) |
| LLM | OpenAI GPT-4.1-mini |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) |
| Vector DB | PostgreSQL + pgvector |
| ORM | SQLAlchemy |
| External APIs | YouTube Data API v3, Wikipedia API |
| Containerization | Docker, Docker Compose |

---

## 📂 Project Structure

```
Translaudio/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── AppInterface.tsx       # Main app UI (upload, tabs, Q&A, recommendations)
│       │   ├── WaveformVisualizer.tsx # Animated canvas waveform
│       │   ├── ScrollReveal.tsx       # Intersection Observer scroll animations
│       │   └── MobileMenu.tsx         # Responsive hamburger nav
│       ├── layouts/
│       │   └── Layout.astro
│       └── pages/
│           ├── index.astro
│           ├── app.astro
│           ├── features.astro
│           ├── how-it-works.astro
│           ├── api.astro
│           └── about.astro
├── backend/
│   ├── server.py       # FastAPI app — all endpoints
│   ├── db.py           # SQLAlchemy engine & session
│   ├── models.py       # Session & TranscriptChunk ORM models
│   ├── init.sql        # Enables pgvector extension
│   └── Dockerfile      # PostgreSQL + pgvector image
└── docker-compose.yml
```

---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/translaudio.git
cd translaudio
```

### 2. Environment variables

Create a `.env` file in the backend:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `OPENAI_API_KEY` | ✅ | OpenAI API key (Whisper + GPT + Embeddings) |
| `YOUTUBE_API_KEY` | ⬜ | YouTube Data API v3 key for video recommendations |
 

### 3. Run with Docker

```bash
docker-compose up --build
```

### 4. Run backend manually

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload
```

### 5. Run frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/upload` | Upload audio file — returns transcription, translation, session ID, and segments |
| `POST` | `/summarize` | Summarize a given text |
| `POST` | `/search` | Semantic search over transcript chunks by session |
| `POST` | `/ask` | RAG-based Q&A — returns answer + timestamped source chunks |
| `POST` | `/recommend-resources` | AI agent recommends articles, videos, podcasts, and references |
| `GET` | `/` | Health check |

### Upload Audio
```
POST /upload
```
- Upload audio file  
- Returns transcription, translation, session ID  

---

### Summarize
```
POST /summarize
```
- Input: text  
- Output: summary  

---

### Ask Questions (RAG)
```
POST /ask
```

```json
{
  "session_id": "...",
  "question": "What is the main idea?"
}
```

---

### Recommend Resources (Agent)
```
POST /recommend-resources
```

- Input: question + answer + sources  

Output:
- topic  
- intent  
- recommended resources  

---

## 🧠 How It Works

### 1. Transcription
Audio is processed using Whisper, generating text + timestamps.

### 2. Chunking
Transcript is split into manageable semantic chunks.

### 3. Embedding
Each chunk is converted into a vector representation.

### 4. Retrieval
User queries are embedded and matched against stored vectors using cosine similarity.

### 5. Generation (RAG)
The LLM generates answers grounded in retrieved transcript chunks.

### 6. AI Agent

Analyzes:
- User question  
- Generated answer  
- Supporting context  

Then recommends relevant learning materials.

1. **Upload** — Audio is saved and passed to Whisper for transcription and language detection
2. **Chunk** — The transcript is split into overlapping segments (max ~800 chars) with timestamps
3. **Embed** — Each chunk is embedded via `text-embedding-3-small` and stored in PostgreSQL with pgvector
4. **Translate** — If the source language differs from the target, GPT translates the full transcript
5. **Query** — User questions are embedded and matched against stored chunks via cosine distance
6. **Answer** — The top-5 retrieved chunks are passed to GPT-4.1-mini as grounded context
7. **Recommend** — The AI agent infers topic and intent, then recommends resources and resolves real YouTube and Wikipedia links

---

## 📸 Screenshots

### 🏠 Homepage

### 📝 Transcript View

### 💬 Q&A

### 🤖 Recommendations
