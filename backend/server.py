from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
import shutil
from pathlib import Path
import whisper
import asyncio
from dotenv import load_dotenv
import os
from openai import OpenAI
from pydantic import BaseModel
from db import engine, Base
import uuid
from sqlalchemy.orm import Session as DBSession
from db import get_db
from models import Session, TranscriptChunk
from fastapi import Depends
from sqlalchemy import select
import json
import httpx
from dotenv import load_dotenv

load_dotenv()

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
print("API KEY:", YOUTUBE_API_KEY)

def recommend_resources(question: str, answer: str, sources: list[dict]) -> dict:
    source_context = "\n\n".join(
        [
            f"[Chunk {src.get('chunk_index')} | {src.get('start_time', 0):.0f}-{src.get('end_time', 0):.0f}s]\n"
            f"{src.get('display_text', '')}"
            for src in sources
        ]
    )
    response = openai_client.responses.create(
        model="gpt-4.1-mini",
        input=[
            {
                "role": "system",
                "content": (
                    "You are a learning resource recommendation agent. "
                    "Given a user's question, the grounded answer, and transcript evidence, "
                    "infer the main topic and the user's learning intent, then recommend 3 to 5 "
                    "highly relevant follow-up resources. "
                    "Do not invent direct URLs. Instead return suggested search queries. "
                    "Prefer a diverse mix of resource types such as article, video, podcast, and reference. "
                    "Return valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Question:\n{question}\n\n"
                    f"Answer:\n{answer}\n\n"
                    f"Transcript sources:\n{source_context}\n\n"
                    "Return JSON in this exact shape:\n"
                    "{\n"
                    '  "topic": "string",\n'
                    '  "intent": "string",\n'
                    '  "related_resources": [\n'
                    "    {\n"
                    '      "title": "string",\n'
                    '      "type": "article | video | podcast | reference",\n'
                    '      "why_relevant": "string",\n'
                    '      "suggested_query": "string"\n'
                    "    }\n"
                    "  ]\n"
                    "}\n"
                ),
            },
        ],
    )

    raw = response.output_text.strip()
    return json.loads(raw)

load_dotenv()
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

Base.metadata.create_all(bind=engine)


app = FastAPI()

class SummarizeRequest(BaseModel):
    text: str
    
class SearchRequest(BaseModel):
    session_id: str
    query: str    
    
class AskRequest(BaseModel):
    session_id: str
    question: str    
    
class RecommendResourcesRequest(BaseModel):
    question: str
    answer: str
    sources: list[dict]    
    

# טעינת מודל Whisper 
print("טוען מודל Whisper...")
whisper_model = whisper.load_model("base")  
print("מודל Whisper נטען בהצלחה!")

# תיקיה לשמירת הקבצים שהועלו
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# סוגי קבצי אודיו מורשים
ALLOWED_AUDIO_EXTENSIONS = {
    ".mp3", ".wav", ".m4a", ".flac", ".aac", 
    ".ogg", ".wma", ".opus", ".aiff", ".ape"
}

def translate_text(text: str, source_language: str, target_language: str) -> str:
    response = openai_client.responses.create(
        model="gpt-5.4",
        instructions=(
            "You are a professional translator. "
            "Translate the user's text accurately and naturally. "
            "Return only the translated text."
        ),
        input=(
            f"Source language: {source_language}\n"
            f"Target language: {target_language}\n\n"
            f"Text:\n{text}"
        ),
    )
    return response.output_text.strip()

def summarize_text(text: str) -> str:
    response = openai_client.responses.create(
        model="gpt-5.4",
        instructions=(
            "Summarize the following text in a clear and concise way. "
            "Keep it short and easy to read."
        ),
        input=text,
    )
    return response.output_text.strip()

def build_chunks(segments, max_chars=800):
    chunks = []
    current_texts = []
    current_start = None
    current_end = None
    chunk_index = 0

    for seg in segments:
        seg_text = (seg.get("text") or "").strip()
        if not seg_text:
            continue

        seg_start = float(seg.get("start", 0))
        seg_end = float(seg.get("end", seg_start))

        candidate = " ".join(current_texts + [seg_text]).strip()

        if current_texts and len(candidate) > max_chars:
            chunks.append({
                "chunk_index": chunk_index,
                "start_time": current_start,
                "end_time": current_end,
                "original_text": " ".join(current_texts).strip(),
            })
            chunk_index += 1
            current_texts = [seg_text]
            current_start = seg_start
            current_end = seg_end
        else:
            if current_start is None:
                current_start = seg_start
            current_end = seg_end
            current_texts.append(seg_text)

    if current_texts:
        chunks.append({
            "chunk_index": chunk_index,
            "start_time": current_start,
            "end_time": current_end,
            "original_text": " ".join(current_texts).strip(),
        })

    return chunks

def get_embeddings(texts: list[str]) -> list[list[float]]:
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=texts
    )
    return [item.embedding for item in response.data]
    
def get_query_embedding(text: str) -> list[float]:
    return get_embeddings([text])[0]    

def generate_answer(question: str, chunks: list[TranscriptChunk]) -> str:
    context = "\n\n".join(
        [
            f"[Chunk {chunk.chunk_index} | {chunk.start_time:.0f}-{chunk.end_time:.0f}s]\n{chunk.display_text}"
            for chunk in chunks
        ]
    )
    print("CALLING LLM...")
    response = openai_client.responses.create(
        model="gpt-4.1-mini",
        input=[
            {
                "role": "system",
                "content": (
                    "You answer questions only based on the provided transcript chunks. "
                    "If the answer is not supported by the transcript, say that you don't have enough information. "
                    "Be concise and factual."
                ),
            },
            {
                "role": "user",
                "content": f"Question: {question}\n\nTranscript context:\n{context}",
            },
        ],
    )
    print("ASK ANSWER READY")
    return response.output_text
    
    
def recommend_resources(question: str, answer: str, sources: list[dict]) -> dict:
    source_context = "\n\n".join(
        [
            f"[Chunk {src.get('chunk_index')} | {src.get('start_time', 0):.0f}-{src.get('end_time', 0):.0f}s]\n"
            f"{src.get('display_text', '')}"
            for src in sources
        ]
    )
    response = openai_client.responses.create(
        model="gpt-4.1-mini",
        input=[
            {
                "role": "system",
                "content": (
                    "You are a learning resource recommendation agent. "
                    "Given a user's question, the grounded answer, and transcript evidence, "
                    "infer the main topic and the user's learning intent, then recommend 3 to 5 "
                    "highly relevant follow-up resources. "
                    "Do not invent direct URLs. Instead return suggested search queries. "
                    "Prefer a diverse mix of resource types such as article, video, podcast, and reference. "
                    "Return valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Question:\n{question}\n\n"
                    f"Answer:\n{answer}\n\n"
                    f"Transcript sources:\n{source_context}\n\n"
                    "Return JSON in this exact shape:\n"
                    "{\n"
                    '  "topic": "string",\n'
                    '  "intent": "string",\n'
                    '  "related_resources": [\n'
                    "    {\n"
                    '      "title": "string",\n'
                    '      "type": "article | video | podcast | reference",\n'
                    '      "why_relevant": "string",\n'
                    '      "suggested_query": "string",\n'
                    '      "url": null,\n'
                    '      "source": null\n'
                    "    }\n"
                    "  ]\n"
                    "}\n"
                ),
            },
        ],
    )
    raw = response.output_text.strip()
    parsed = json.loads(raw)
    for resource in parsed.get("related_resources", []):
        resource.setdefault("url", None)
        resource.setdefault("source", None)
    return parsed   

async def search_youtube_video(query: str) -> dict | None:
    if not YOUTUBE_API_KEY or not query.strip():
        return None
    print("QUERY:", query)
    print("API KEY EXISTS:", bool(YOUTUBE_API_KEY))
    url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": 1,
        "key": YOUTUBE_API_KEY,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
    items = data.get("items", [])
    if not items:
        return None
    first = items[0]
    video_id = first.get("id", {}).get("videoId")
    title = first.get("snippet", {}).get("title")
    print("STATUS:", resp.status_code)
    print("BODY:", resp.text[:300])
    if not video_id:
        return None
    return {
        "title": title or query,
        "url": f"https://www.youtube.com/watch?v={video_id}",
        "source": "YouTube",
    }

async def search_wikipedia_page(query: str) -> dict | None:
    if not query.strip():
        return None
    url = "https://en.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "list": "search",
        "srsearch": query,
        "format": "json",
        "utf8": 1,
        "srlimit": 1,
    }
    headers = {
        "User-Agent": "Translaudio/1.0 (local development; contact: your-email@example.com)",
        "Api-User-Agent": "Translaudio/1.0 (local development; contact: your-email@example.com)",
        "Accept": "application/json",
    }
    print("Wikipedia query:", query)
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        resp = await client.get(url, params=params, headers=headers)
        print("Wikipedia status:", resp.status_code)
        print("Wikipedia body:", resp.text[:300])
        resp.raise_for_status()
        data = resp.json()
    results = data.get("query", {}).get("search", [])
    print("Wikipedia results found:", len(results))
    if not results:
        return None
    first = results[0]
    title = first.get("title")
    if not title:
        return None
    return {
        "title": title,
        "url": f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}",
        "source": "Wikipedia",
    }


async def enrich_related_resources(resources: list[dict]) -> list[dict]:
    enriched = []
    for resource in resources:
        resource_type = resource.get("type")
        query = (resource.get("suggested_query") or "").strip()
        link_data = None
        try:
            if resource_type == "video" and query:
                link_data = await search_youtube_video(query)
            elif resource_type == "reference" and query:
                link_data = await search_wikipedia_page(query)
        except Exception as e:
            print("ERROR:", repr(e))
            link_data = None
        resource.setdefault("url", None)
        resource.setdefault("source", None)
        if link_data:
            resource["title"] = link_data.get("title", resource.get("title"))
            resource["url"] = link_data.get("url")
            resource["source"] = link_data.get("source")
        enriched.append(resource)
    return enriched


@app.post("/upload")
async def upload_audio(
    file: UploadFile = File(...),
    target_language: str = Form("he"),
    db: DBSession = Depends(get_db),
):
    """
    מקבל קובץ אודיו ושומר אותו בתיקיית uploads
    """
    try:
        # בדיקה שהקובץ הוא קובץ אודיו
        file_extension = Path(file.filename).suffix.lower()
        if file_extension not in ALLOWED_AUDIO_EXTENSIONS:
            return JSONResponse(
                content={
                    "error": f"קובץ לא חוקי. מותר רק קבצי אודיו: {', '.join(ALLOWED_AUDIO_EXTENSIONS)}"
                },
                status_code=400
            )
        
        # שמירת הקובץ
        file_path = UPLOAD_DIR / file.filename
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        #  בדיקת גודל קובץ
        file_size = file_path.stat().st_size
        print("Saved file size:", file_size)

        if file_size < 1024:  
            return JSONResponse(
                content={"error": "הקובץ ריק או קטן מדי לעיבוד"},
                status_code=400
            )
        
        
        # תמלול הקובץ
        print(f"מתחיל תמלול של {file.filename}...")
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            lambda: whisper_model.transcribe(str(file_path))
        )
        print("Detected language:", result.get("language"))

        source_language = result.get("language", "")
        transcription = result["text"]
        
        if source_language != target_language:
            translation = await loop.run_in_executor(
                None,
                lambda: translate_text(transcription, source_language, target_language)
            )
        else:
            translation = transcription
        print(f"תמלול הושלם: {len(transcription)} תווים")
        
             
        session_id = uuid.uuid4().hex
        db_session = Session(
            id=session_id,
            filename=file.filename,
            source_language=source_language,
            target_language=target_language,
            transcription=transcription,
            translation=translation,
        )
        db.add(db_session)
        db.commit()
        
        
        segments = result.get("segments", [])
        chunks = build_chunks(segments)
        display_texts = []
        for chunk in chunks:
            display_texts.append(chunk["original_text"])
        embeddings = get_embeddings(display_texts)
        chunk_rows = []
        for chunk, embedding, display_text in zip(chunks, embeddings, display_texts):
            chunk_row = TranscriptChunk(
                id=uuid.uuid4().hex,
                session_id=session_id,
                chunk_index=chunk["chunk_index"],
                start_time=chunk["start_time"],
                end_time=chunk["end_time"],
                original_text=chunk["original_text"],
                display_text=display_text,
                embedding=embedding,
            )
            chunk_rows.append(chunk_row)
        db.add_all(chunk_rows)
        db.commit()
        
        # שמירת התמלול לקובץ טקסט
        transcription_file = file_path.with_suffix('.txt')
        transcription_file.write_text(transcription, encoding='utf-8')
        
        return JSONResponse(
            content={
                "message": "קובץ האודיו הועלה ותומלל בהצלחה",
                "filename": file.filename,
                "size": file_size,
                "type": file_extension,
                "source_language": source_language,
                "target_language": target_language,
                "transcription": transcription,
                "translation": translation,
                "transcription_file": transcription_file.name,
                "session_id": session_id,
                "segments": segments,
            },
            status_code=200
        )    
    except Exception as e:
            error_message = str(e)
            
            if "insufficient_quota" in error_message:
                return JSONResponse(
                    content={"error": "שירות התרגום לא זמין כרגע: נגמרה מכסת ה-API."},
                    status_code=502
                )


            if "Failed to load audio" in error_message or "Invalid data" in error_message:
                return JSONResponse(
                    content={"error": "קובץ האודיו לא תקין או בפורמט לא נתמך"},
                    status_code=400
                )

            return JSONResponse(
                content={"error": error_message},
                status_code=500
            )
    
@app.post("/summarize")
async def summarize_audio(payload: SummarizeRequest):
    try:
        if not payload.text.strip():
            return JSONResponse(
                content={"error": "No text provided"},
                status_code=400
            )

        loop = asyncio.get_running_loop()
        summary = await loop.run_in_executor(
            None,
            lambda: summarize_text(payload.text)
        )

        return JSONResponse(
            content={"summary": summary},
            status_code=200
        )

    except Exception as e:
        error_message = str(e)

        if "insufficient_quota" in error_message:
            return JSONResponse(
                content={"error": "שירות הסיכום לא זמין כרגע: נגמרה מכסת ה-API."},
                status_code=502
            )

        return JSONResponse(
            content={"error": error_message},
            status_code=500
        )
    
@app.post("/search")
async def search_transcript(
    payload: SearchRequest,
    db: DBSession = Depends(get_db),
):
    try:
        if not payload.query.strip():
            return JSONResponse(
                content={"error": "Query is required"},
                status_code=400
            )
        query_embedding = get_query_embedding(payload.query)
        results = (
            db.query(TranscriptChunk)
            .filter(TranscriptChunk.session_id == payload.session_id)
            .order_by(TranscriptChunk.embedding.cosine_distance(query_embedding))
            .limit(5)
            .all()
        )
        return JSONResponse(
            content={
                "results": [
                    {
                        "id": row.id,
                        "chunk_index": row.chunk_index,
                        "start_time": row.start_time,
                        "end_time": row.end_time,
                        "original_text": row.original_text,
                        "display_text": row.display_text,
                    }
                    for row in results
                ]
            },
            status_code=200
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )  
        
        
@app.post("/ask")
async def ask_transcript(
    payload: AskRequest,
    db: DBSession = Depends(get_db),
):
    try:
        if not payload.question.strip():
            return JSONResponse(
                content={"error": "Question is required"},
                status_code=400
            )
        print("ASK STARTED", payload.session_id, payload.question)
        query_embedding = get_query_embedding(payload.question)
        print("EMBEDDING READY")
        results = (
            db.query(TranscriptChunk)
            .filter(TranscriptChunk.session_id == payload.session_id)
            .order_by(TranscriptChunk.embedding.cosine_distance(query_embedding))
            .limit(5)
            .all()
        )
        if not results:
            return JSONResponse(
                content={"error": "No transcript chunks found for this session"},
                status_code=404
            )
        print("ASK RETRIEVAL DONE", len(results))
        answer = generate_answer(payload.question, results)
        return JSONResponse(
            content={
                "answer": answer,
                "sources": [
                    {
                        "id": row.id,
                        "chunk_index": row.chunk_index,
                        "start_time": row.start_time,
                        "end_time": row.end_time,
                        "display_text": row.display_text,
                    }
                    for row in results
                ],
            },
            status_code=200,
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )          
   
@app.post("/recommend-resources")
async def recommend_resources_endpoint(payload: RecommendResourcesRequest):
    try:
        if not payload.question.strip():
            return JSONResponse(
                content={"error": "Question is required"},
                status_code=400
            )
        if not payload.answer.strip():
            return JSONResponse(
                content={"error": "Answer is required"},
                status_code=400
            )
        loop = asyncio.get_running_loop()
        recommendations = await loop.run_in_executor(
            None,
            lambda: recommend_resources(
                payload.question,
                payload.answer,
                payload.sources,
            )
        )
        recommendations["related_resources"] = await enrich_related_resources(
        recommendations.get("related_resources", [])
        )
        return JSONResponse(
            content=recommendations,
            status_code=200
        )
    except Exception as e:
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

@app.get("/")
async def root():
    return {"message": "שרת העלאת קבצים פעיל"}


