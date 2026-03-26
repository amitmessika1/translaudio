# 🎧 Translaudio

**AI-powered Audio Intelligence Platform – RAG + Agent**

Translaudio is a full-stack AI application that transforms audio into actionable knowledge using a combination of:

- 🧠 Retrieval-Augmented Generation (RAG)  
- 🤖 AI Agent for learning recommendations  

---

## 🚀 Features

### 🎙️ Audio Processing
- Upload audio files (`mp3`, `wav`, `m4a`, etc.)
- Automatic transcription using Whisper
- Language detection + translation

### 🧠 RAG-based Q&A
- Semantic search over transcript chunks
- Vector embeddings stored in PostgreSQL (pgvector)
- Grounded answers based only on transcript content

### 🤖 AI Agent (Learning Recommendations)

**Analyzes:**
- User question  
- Generated answer  
- Transcript evidence  

**Infers:**
- Topic  
- User intent  

**Recommends:**
- Articles  
- Videos  
- Podcasts  
- Reference materials  

**Enriches results automatically with:**
- YouTube videos  
- Wikipedia pages  

👉 The agent is implemented in the backend and enhances recommendations with external sources dynamically  

---

## 🏗️ Architecture

### Frontend (Next.js)
- UI for upload, transcript, summary, Q&A, and recommendations  
- Uses API proxy routes (e.g. `/api/ask`)  
- Core logic managed via `useTranscription` hook  

### Backend (FastAPI)

Handles:
- Audio transcription (Whisper)  
- Translation + summarization (OpenAI)  
- Embeddings + vector search  
- RAG-based Q&A  
- AI Agent for recommendations  

### Project Structure

```bash
Translaudio
├── frontend (Next.js App Router)
│   ├── app
│   │   ├── api (proxy routes to backend)
│   │   ├── components (UI components)
│   │   ├── hooks (custom React hooks)
│   │   └── page.tsx (main UI)
├── backend (FastAPI)
│   ├── server.py (main API)
│   ├── models.py (DB models)
│   ├── db.py (DB connection)
└── docker-compose.yml
```

This structure separates the frontend (Next.js) and backend (FastAPI) while keeping a clean API proxy layer and modular AI pipeline.

---

## 🧠 How It Works

### 1. Upload Flow
- Audio → Whisper transcription  
- Optional translation  
- Split into chunks  
- Generate embeddings  
- Store in DB  

### 2. RAG Q&A Flow
1. User asks a question  
2. Query → embedding  
3. Retrieve top relevant chunks  
4. LLM generates grounded answer  

### 3. Agent Flow (Key Feature 🔥)

**Takes:**
- Question  
- Answer  
- Retrieved transcript chunks  

**Infers:**
- Learning topic  
- User intent  

**Generates:**
- Structured recommendations (3–5 resources)  

**Enriches:**
- Videos via YouTube API  
- References via Wikipedia API  

👉 This transforms the system from passive Q&A into an **active learning assistant**

## 🗄️ Database

### Sessions
- Stores transcription, translation, summary  

### Transcript Chunks
- Timestamped segments  
- Vector embeddings for similarity search  

---

## 🧪 API Endpoints

| Endpoint | Description |
|----------|------------|
| `POST /upload` | Upload and process audio |
| `POST /summarize` | Generate summary |
| `POST /ask` | Ask questions (RAG) |
| `POST /recommend-resources` | Agent recommendations |

---

## ⚙️ Installation

```
Installation
├── Backend (manual)
├── Frontend (manual)
└── Docker (recommended 🚀)
```

### Backend
```bash
pip install -r requirements.txt
uvicorn server:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

### 🐳 Run with Docker (Recommended)
```bash
docker-compose up --build
```

This will start:
- FastAPI backend  
- Next.js frontend  
- PostgreSQL database  

---

### 🛑 Stop containers
```bash
docker-compose down
```

---

## 🌍 Environment Variables

```env
OPENAI_API_KEY=your_key
DATABASE_URL=postgresql://user:password@localhost:5432/translaudio
YOUTUBE_API_KEY=your_key
```

---

## 🧩 Tech Stack

### Frontend
- Next.js  
- React  
- TypeScript  
- Tailwind CSS  

### Backend
- Python  
- FastAPI  
- OpenAI API  
- Whisper  
- SQLAlchemy  

### Database
- PostgreSQL  
- pgvector  

### DevOps / Infrastructure
- Docker  
- Docker Compose  

---

## 🔥 Key Highlights

- Combines **RAG + Agent architecture**  
- Enables **grounded answers + proactive learning**  
- Uses **semantic search over audio transcripts**  
- Automatically bridges **internal knowledge with external resources**  
