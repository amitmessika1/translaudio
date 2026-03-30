# 🎧 Translaudio

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

