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
- Supports multiple formats: `mp3`, `wav`, `m4a`, `flac`, `ogg`, etc.
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

---

## 📂 Project Structure

```
Translaudio/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   └── styles/
│   └── package.json
│
├── backend/
│   ├── server.py
│   ├── models.py
│   ├── db.py
│   ├── init.sql
│   └── Dockerfile
│
├── docker-compose.yml
└── README.md
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

```env
OPENAI_API_KEY=your_openai_key
DATABASE_URL=postgresql://translaudio:translaudio@localhost:5432/translaudio
YOUTUBE_API_KEY=your_youtube_api_key
```

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

---

## 📸 Screenshots

### 🏠 Homepage

### 📝 Transcript View

### 💬 Q&A

### 🤖 Recommendations
