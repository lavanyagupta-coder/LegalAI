import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import path from "path";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

dotenv.config(); // Load .env file from project root

const app = express();
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// Same env vars the Python backend uses, so one .env configures both services.
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const PORT = process.env.CHAT_PORT || 3000;

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY not found. Create a .env file in the project root (see .env.example).");
  process.exit(1);
}

// Function to extract text from different file types
async function extractTextFromFile(filePath, filename) {
  const ext = path.extname(filename).toLowerCase();

  try {
    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } else if (ext === '.txt') {
      return fs.readFileSync(filePath, 'utf8');
    } else {
      // For other file types, try to read as text
      return fs.readFileSync(filePath, 'utf8');
    }
  } catch (error) {
    console.error(`Error extracting text from ${filename}:`, error);
    return `Error: Could not extract text from ${filename}`;
  }
}

app.get("/", (req, res) => {
  res.send("✅ Backend is running with OpenAI API support");
});

// Lets you confirm the key/config are picked up without sending a chat message.
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    ai_provider_configured: Boolean(OPENAI_API_KEY),
    model: OPENAI_MODEL,
    base_url: OPENAI_BASE_URL,
  });
});

// Store uploaded documents in memory for chat context
let uploadedDocuments = [];

app.post("/upload", upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Extract text from the uploaded file
    const extractedText = await extractTextFromFile(req.file.path, req.file.originalname);

    const documentInfo = {
      id: Date.now().toString(),
      filename: req.file.originalname,
      path: req.file.path,
      uploadedAt: new Date().toISOString(),
      content: extractedText,
      summary: null, // Will be generated on demand
      risk: null // Will be analyzed on demand
    };

    uploadedDocuments.push(documentInfo);

    // Keep only last 10 documents
    if (uploadedDocuments.length > 10) {
      uploadedDocuments = uploadedDocuments.slice(-10);
    }

    res.json({
      success: true,
      document: {
        id: documentInfo.id,
        filename: documentInfo.filename,
        uploadedAt: documentInfo.uploadedAt,
        textLength: extractedText.length
      }
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload document" });
  }
});

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;
    const documentId = req.body.documentId; // Optional document context
    console.log("📩 Received:", userMessage, documentId ? `with document ${documentId}` : "");

    if (!userMessage || !userMessage.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    let contextMessage = userMessage;

    // If a document is specified, include its content in the context
    if (documentId) {
      const document = uploadedDocuments.find(doc => doc.id === documentId);
      if (document) {
        if (!document.content) {
          try {
            document.content = fs.readFileSync(document.path, 'utf8');
          } catch (error) {
            console.error("Error reading document:", error);
            document.content = "Error reading document content.";
          }
        }
        contextMessage = `Document: ${document.filename}\n\nContent: ${document.content}\n\nUser Question: ${userMessage}`;
      }
    }

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a helpful legal assistant. Provide accurate, professional legal information. If discussing specific documents, analyze them carefully and provide relevant insights."
          },
          {
            role: "user",
            content: contextMessage
          }
        ],
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ AI provider error (${response.status}):`, errorText);

      let friendlyError = "The AI provider returned an error.";
      if (response.status === 401) {
        friendlyError = "The AI provider rejected the API key. Check OPENAI_API_KEY in your .env file.";
      } else if (response.status === 429) {
        friendlyError = "Rate limit or quota exceeded on the AI provider. Please wait and try again, or check billing.";
      } else if (response.status >= 500) {
        friendlyError = "The AI provider is temporarily unavailable. Please try again shortly.";
      }

      return res.status(502).json({ error: friendlyError, details: errorText });
    }

    const data = await response.json();
    const aiMessage = data?.choices?.[0]?.message?.content || "⚠️ No AI response";

    console.log("🤖 AI replied:", aiMessage.substring(0, 100) + "...");

    res.json({ reply: aiMessage });
  } catch (err) {
    console.error("❌ Server Error:", err);
    res.status(500).json({ error: "Internal server error. Is the AI provider reachable from this server?" });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Chat backend running on http://127.0.0.1:${PORT} (model: ${OPENAI_MODEL})`)
);