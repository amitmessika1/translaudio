from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import shutil
from pathlib import Path

app = FastAPI()

# תיקיה לשמירת הקבצים שהועלו
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    מקבל קובץ ושומר אותו בתיקיית uploads
    """
    try:
        # שמירת הקובץ
        file_path = UPLOAD_DIR / file.filename
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        return JSONResponse(
            content={
                "message": "הקובץ הועלה בהצלחה",
                "filename": file.filename,
                "size": file_path.stat().st_size
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