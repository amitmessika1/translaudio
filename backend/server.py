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

load_dotenv()
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
app = FastAPI()

class SummarizeRequest(BaseModel):
    text: str

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

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    target_language: str = Form("en")
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
                "transcription_file": transcription_file.name
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
   


@app.get("/")
async def root():
    return {"message": "שרת העלאת קבצים פעיל"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)