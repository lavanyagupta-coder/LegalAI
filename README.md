# LegalAI

LegalAI is an AI-powered legal document analysis project that helps users upload legal files, extract readable text, generate plain-language summaries, identify risky clauses, compare documents, and chat with an AI assistant about uploaded content.

The repository contains:

- A static multi-page frontend built with HTML, CSS, and vanilla JavaScript
- A Python `FastAPI` backend for document analysis
- A separate Node.js `Express` service for chat and document-aware Q&A
- Utility code for PDF, DOCX, DOC, and TXT text extraction
- An older experimental ML training script for risk classification

## What The Project Does

The platform is designed to simplify legal documents for non-experts and speed up review for legal teams. A user can upload a contract or legal file and receive:

- A concise AI-generated summary in plain English
- A structured risk assessment with severity labels
- Key clause extraction and short clause explanations
- Recommendations based on the detected issues
- A printable report view
- A browser-based document comparison workflow
- A chat experience that can answer questions about an uploaded document
- A template-based legal document drafting page

## Core Features

### 1. AI Document Summarization

Users can upload a document and receive a readable summary generated through OpenAI. The backend truncates large source text before sending it to the model to keep requests manageable.

### 2. Legal Risk Analysis

The `/analyze` endpoint returns structured analysis data, including:

- Overall risk level: `High`, `Medium`, or `Low`
- Risk summary
- Individual flagged risks with title, severity, description, and category
- Derived analysis scores such as overall score, risk score, number of risk flags, and confidence score
- Risk distribution counts

### 3. Clause Extraction

The analysis pipeline extracts important clauses from the document and returns:

- Clause title
- Short clause summary
- Per-clause risk label

### 4. Document Comparison

The project supports comparing two legal documents:

- Backend comparison through the FastAPI `/compare` endpoint using OpenAI
- Frontend line-by-line comparison in `frontend/comparison.html`

### 5. AI Legal Chat Assistant

The Node/Express service supports:

- File upload to build document context
- Chatting with an AI assistant using OpenAI
- Asking general legal questions
- Asking questions specifically about an uploaded file

### 6. Printable Report View

The project includes a dedicated report page that displays:

- Summary
- Key findings
- Extracted clauses
- Risks
- Recommendations
- Document metrics

This report can be printed or saved as PDF from the browser.

### 7. Template-Based Document Drafting

`frontend/template.html` includes a legal document template editor with downloadable PDF output. The current implementation contains a detailed lease agreement workflow and a structured preview/download experience.

### 8. Multi-Page Product Website

The frontend includes a landing page and supporting pages for:

- Upload and analysis
- Risk dashboard
- Analysis viewer
- Full report
- Chatbot
- Document comparison
- Pricing
- Sign-in
- Templates

## Tech Stack

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- Chart.js for chart-based risk visualization
- Lucide icons
- PDF.js for client-side PDF reading in the comparison page
- html2pdf.js for PDF export from templates

### Python Backend

- Python
- FastAPI
- Uvicorn
- `python-multipart` for file uploads
- `python-dotenv` for environment variables
- PyPDF2 for PDF text extraction
- OpenAI Python SDK

### Node Backend

- Node.js
- Express
- CORS
- dotenv
- multer for uploads
- node-fetch
- pdf-parse

### AI / Analysis

- OpenAI `gpt-4o-mini`
- JSON-structured prompting for legal analysis

### Data / Utilities

- Local `uploads/` directory for uploaded files
- `.env` configuration for API keys
- Legacy scikit-learn training script in `scripts/train_model.py`
- Serialized model/vectorizer assets in `assets/`

## Supported File Types

The current codebase supports text extraction or upload flows for:

- `.pdf`
- `.docx`
- `.doc`
- `.txt`

Notes:

- `.docx` is parsed from the internal XML document structure
- `.doc` uses a best-effort `strings`-based fallback on the Python backend
- Some frontend pages only allow a subset of these file types

## Requirements

### Software Requirements

- Python `3.10+` recommended
- Node.js `18+` recommended
- `pip`
- `npm`
- A modern browser

### Environment Requirements

Create a `.env` file in the project root with:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### System / Runtime Notes

- The FastAPI backend defaults to port `8016`
- The Node chat backend defaults to port `3000`
- Several frontend pages expect the analysis API at `http://127.0.0.1:8016`
- The chatbot expects the Express API at `http://127.0.0.1:3000`
- For legacy `.doc` extraction, the Python backend relies on the `strings` command being available on the system

## Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd legalai
```

### 2. Set up the Python backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Set up the Node backend

```bash
npm install
```

### 4. Add environment variables

Create `.env` in the project root:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

## Running The Project

### Run the FastAPI analysis backend

```bash
source .venv/bin/activate
python -m uvicorn backend.ai.main:app --host 0.0.0.0 --port 8016 --reload
```

### Run the Node chat backend

```bash
node frontend/js/server.js
```

### Run the frontend

This project uses static HTML pages. You can open them with a static server.

Example using Python:

```bash
python -m http.server 5503 --directory frontend
```

Then open:

```text
http://127.0.0.1:5503
```

## Main Endpoints

### FastAPI backend

- `GET /` - health check
- `POST /upload` - upload a file and return a summary
- `POST /analyze` - upload a file and return risk analysis, clauses, scores, and recommendations
- `POST /extract-clauses` - upload a file and return extracted clauses
- `POST /compare` - upload two files and return AI-generated comparison

### Express backend

- `GET /` - service status
- `POST /upload` - upload a document for chat context
- `POST /chat` - send a user question and receive an AI response

## Project Structure

```text
legalai/
├── assets/                     # Saved experimental ML artifacts
├── backend/
│   └── ai/
│       ├── main.py             # FastAPI app and API routes
│       └── utils/
│           ├── ai_summarizer.py
│           └── pdf_reader.py
├── frontend/
│   ├── index.html             # Landing page and upload experience
│   ├── analysis.html          # Analysis workspace
│   ├── fullsum.html           # Printable summary/report view
│   ├── risk.html              # Risk dashboard
│   ├── chatbot.html           # Chat UI
│   ├── comparison.html        # Document comparison page
│   ├── template.html          # Legal template editor
│   ├── pricing.html
│   ├── signin.html
│   ├── css/
│   ├── js/
│   │   ├── script.js          # Main frontend upload/analysis logic
│   │   ├── chatbot.js         # Chat frontend logic
│   │   └── server.js          # Express chat backend
│   └── assets/
├── scripts/
│   └── train_model.py         # Older ML experiment
├── uploads/                   # Uploaded documents
├── package.json               # Node dependencies
├── requirements.txt           # Python dependencies
└── README.md
```

## How The Analysis Flow Works

1. A user uploads a document from the frontend.
2. The frontend sends the file to the FastAPI backend.
3. The backend extracts text from the uploaded file.
4. The text is sent to OpenAI with a structured legal-analysis prompt.
5. The backend normalizes the AI response into summary, risk level, flagged risks, clauses, and recommendations.
6. The frontend renders dashboards, summaries, charts, and report pages from that response.

## Existing Architectural Notes

- The repository currently mixes two backend stacks: `FastAPI` for analysis and `Express` for chat
- The Python backend is the primary analysis engine
- The Node service is mainly used by the chatbot workflow
- The repository includes older experimental ML artifacts, but current analysis is OpenAI-based
- There is no formal automated test suite configured in `package.json` or the Python project at the moment

## Current Limitations

- The project depends on an OpenAI API key
- Frontend URLs and CORS origins are partially hardcoded for local development and GitHub Codespaces
- Some pages are more production-ready than others and may overlap in functionality
- Uploaded files are stored locally in `uploads/`
- The repo currently contains generated/runtime directories such as `node_modules/`, `.venv/`, and uploaded sample files, which are usually excluded in a production-ready Git repository

## Suggested Future Improvements

- Add a single unified backend instead of maintaining both FastAPI and Express services
- Add automated tests for file parsing and API routes
- Add authentication and user/session management
- Add database storage for documents and analysis history
- Replace local file storage with cloud object storage
- Add OCR support for scanned PDFs
- Improve clause comparison with structured semantic diffing
- Add deployment configuration using Docker or cloud hosting
- Clean committed runtime artifacts from the repository and strengthen `.gitignore`

## Disclaimer

This project provides AI-generated legal assistance for informational purposes only. It is not a substitute for advice from a qualified legal professional.
