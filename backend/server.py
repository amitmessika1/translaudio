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

load_dotenv()
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

Base.metadata.create_all(bind=engine)


app = FastAPI()

class SummarizeRequest(BaseModel):
    text: str
    
class SearchRequest(BaseModel):
    session_id: str
    query: str    

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
   


@app.get("/")
async def root():
    return {"message": "שרת העלאת קבצים פעיל"}


