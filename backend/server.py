from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import shutil
from pathlib import Path
import whisper

app = FastAPI()

# טעינת מודל Whisper (פעם אחת בהתחלה)
print("טוען מודל Whisper...")
whisper_model = whisper.load_model("base")  # אפשרויות: tiny, base, small, medium, large
print("מודל Whisper נטען בהצלחה!")

# תיקיה לשמירת הקבצים שהועלו
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# סוגי קבצי אודיו מורשים
ALLOWED_AUDIO_EXTENSIONS = {
    ".mp3", ".wav", ".m4a", ".flac", ".aac", 
    ".ogg", ".wma", ".opus", ".aiff", ".ape"
}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
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
        
        # תמלול הקובץ
        print(f"מתחיל תמלול של {file.filename}...")
        result = whisper_model.transcribe(str(file_path))
        print("Detected language:", result.get("language"))

        transcription = result["text"]
        print(f"תמלול הושלם: {len(transcription)} תווים")
        
        # שמירת התמלול לקובץ טקסט
        transcription_file = file_path.with_suffix('.txt')
        transcription_file.write_text(transcription, encoding='utf-8')
        
        return JSONResponse(
            content={
                "message": "קובץ האודיו הועלה ותומלל בהצלחה",
                "filename": file.filename,
                "size": file_path.stat().st_size,
                "type": file_extension,
                "transcription": transcription,
                "transcription_file": transcription_file.name
            },
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)