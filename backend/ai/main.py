# legal_backend/main.py

import os, shutil, logging, traceback
from dotenv import load_dotenv

# Load environment variables before importing AI utilities
load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Import your existing utils
from backend.ai.utils.pdf_reader import extract_text_from_pdf
from backend.ai.utils.ai_summarizer import analyze_document, summarize_text, extract_clauses, compare_documents

# -------------------------------
# ✅ Load environment and model
# -------------------------------

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Note: ML model removed - now using OpenAI for all AI features

# -------------------------------
# ✅ FastAPI app setup
# -------------------------------
app = FastAPI()

origins = [
    "http://127.0.0.1:5503",  # Local frontend
    "http://localhost:5503",  # Local frontend
    "https://turbo-space-fishstick-5g5v5g944q94cr5r-5503.app.github.dev",  # Frontend URL
    "https://turbo-space-fishstick-5g5v5g944q94cr5r-8016.app.github.dev"   # Backend URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.DEBUG)


def build_scores(risk_level: str, risks: list[dict], clause_count: int, text_length: int) -> dict:
    severity_weights = {"High": 3, "Medium": 2, "Low": 1}
    weighted_risk = sum(severity_weights.get(risk.get("severity", "Medium"), 2) for risk in risks)
    normalized_risk = min(100, weighted_risk * 12 + max(0, clause_count - 2) * 3)

    if risk_level == "High":
        normalized_risk = max(normalized_risk, 75)
    elif risk_level == "Medium":
        normalized_risk = max(normalized_risk, 45)
    elif risk_level == "Low":
        normalized_risk = max(normalized_risk, 20)

    overall_score = max(1.0, round(10 - (normalized_risk / 12), 1))
    confidence = min(98, 45 + min(clause_count, 8) * 5 + min(text_length // 1200, 20))

    return {
        "overall": overall_score,
        "risk_score": int(normalized_risk),
        "risk_flags": len(risks),
        "confidence": int(confidence),
    }


def build_distribution(risks: list[dict]) -> dict:
    distribution = {"High": 0, "Medium": 0, "Low": 0}
    for risk in risks:
        severity = risk.get("severity", "Medium")
        if severity in distribution:
            distribution[severity] += 1
    return distribution

# -------------------------------
# ✅ Existing routes
# -------------------------------
@app.get("/")
def home():
    return {"message": "Backend is running 🚀"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        filename = os.path.basename(file.filename)
        dest = os.path.join(UPLOAD_DIR, filename)

        with open(dest, "wb") as buf:
            shutil.copyfileobj(file.file, buf)
        logging.info(f"Saved upload -> {dest}")

        text = extract_text_from_pdf(dest)
        logging.debug(f"Extracted text length: {len(text) if text else 0}")

        if not text or not text.strip():
            return JSONResponse({"summary": f"⚠️ No readable text could be extracted from {filename}."}, status_code=200)

        summary = summarize_text(text)
        return JSONResponse({"summary": summary}, status_code=200)

    except Exception as e:
        logging.error("Upload processing failed:\n" + traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

# -------------------------------
# ✅ NEW: Risk Analyzer Endpoint
# -------------------------------
@app.post("/analyze")
async def analyze_risk_endpoint(file: UploadFile = File(...)):
    try:
        content = await file.read()
        temp_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(temp_path, "wb") as f:
            f.write(content)

        text = extract_text_from_pdf(temp_path)

        if not text.strip():
            return JSONResponse(
                {
                    "risk": "Unknown",
                    "message": f"⚠️ No readable text found in {file.filename}.",
                    "summary": f"⚠️ No readable text found in {file.filename}.",
                    "risks": [],
                    "clauses": [],
                    "recommendations": [],
                    "scores": {"overall": 0, "risk_score": 0, "risk_flags": 0, "confidence": 0},
                    "risk_distribution": {"High": 0, "Medium": 0, "Low": 0},
                },
                status_code=200,
            )

        document_analysis = analyze_document(text)
        risk_level = document_analysis.get("risk_level", "Unknown")
        risk_message = document_analysis.get("risk_summary", "No risk summary available.")
        risks = document_analysis.get("risks", [])
        clauses = document_analysis.get("clauses", [])
        summary = document_analysis.get("summary", "No summary available.")
        scores = build_scores(risk_level, risks, len(clauses), len(text))
        distribution = build_distribution(risks)

        recent_files = []
        if os.path.exists(UPLOAD_DIR):
            files = sorted([f for f in os.listdir(UPLOAD_DIR) if os.path.isfile(os.path.join(UPLOAD_DIR, f))],
                          key=lambda x: os.path.getmtime(os.path.join(UPLOAD_DIR, x)), reverse=True)
            recent_files = files[:5]

        return JSONResponse({
            "risk": risk_level,
            "message": risk_message,
            "analysis": risk_message,
            "summary": summary,
            "risks": risks,
            "clauses": clauses,
            "recommendations": document_analysis.get("recommendations", []),
            "document_type": document_analysis.get("document_type", "Legal document"),
            "scores": scores,
            "risk_distribution": distribution,
            "stats": {
                "text_length": len(text),
                "clause_count": len(clauses),
                "file_type": os.path.splitext(file.filename)[1].lower().lstrip("."),
            },
            "recent_files": recent_files,
            "filename": file.filename
        }, status_code=200)

    except Exception as e:
        logging.error("Risk analysis failed:\n" + traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to analyze risk: {str(e)}")

# -------------------------------
# ✅ NEW: Clause Extraction Endpoint
# -------------------------------
@app.post("/extract-clauses")
async def extract_clauses_endpoint(file: UploadFile = File(...)):
    try:
        content = await file.read()
        temp_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(temp_path, "wb") as f:
            f.write(content)

        text = extract_text_from_pdf(temp_path)

        if not text.strip():
            return JSONResponse({"clauses": [], "message": f"No readable text found in {file.filename}."}, status_code=200)

        clauses = extract_clauses(text)

        return JSONResponse({
            "clauses": clauses,
            "filename": file.filename
        }, status_code=200)

    except Exception as e:
        logging.error("Clause extraction failed:\n" + traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to extract clauses: {str(e)}")

# -------------------------------
# ✅ NEW: Document Comparison Endpoint
# -------------------------------
@app.post("/compare")
async def compare_documents_endpoint(file1: UploadFile = File(...), file2: UploadFile = File(...)):
    try:
        # Process first file
        content1 = await file1.read()
        temp_path1 = os.path.join(UPLOAD_DIR, file1.filename)
        with open(temp_path1, "wb") as f:
            f.write(content1)
        text1 = extract_text_from_pdf(temp_path1)

        # Process second file
        content2 = await file2.read()
        temp_path2 = os.path.join(UPLOAD_DIR, file2.filename)
        with open(temp_path2, "wb") as f:
            f.write(content2)
        text2 = extract_text_from_pdf(temp_path2)

        if not text1.strip() or not text2.strip():
            return JSONResponse({"comparison": "Unable to compare - one or both documents have no readable text."}, status_code=200)

        # compare documents using OpenAI
        comparison_result = compare_documents(text1, text2)

        return JSONResponse({
            "comparison": comparison_result["comparison"],
            "filename1": file1.filename,
            "filename2": file2.filename
        }, status_code=200)

    except Exception as e:
        logging.error("Document comparison failed:\n" + traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to compare documents: {str(e)}")
if __name__ == "__main__":
    import uvicorn
    # The first argument 'app' should match your FastAPI variable (e.g., app = FastAPI())
    uvicorn.run("backend.ai.main:app", host="0.0.0.0", port=8016, reload=True)
