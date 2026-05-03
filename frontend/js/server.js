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

dotenv.config(); // Load .env file

const app = express();
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // ✅ Use OpenAI instead of Gemini
const PORT = 3000;

if (!OPENAI_API_KEY) {
  console.error("❌ OpenAI API key not found. Did you create .env?");
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

    let contextMessage = userMessage;

    // If a document is specified, include its content in the context
    if (documentId) {
      const document = uploadedDocuments.find(doc => doc.id === documentId);
      if (document) {
        // Read document content if not already cached
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

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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
      console.error("❌ OpenAI API Error:", errorText);
      return res.status(500).json({ error: "OpenAI API error", details: errorText });
    }

    const data = await response.json();
    const aiMessage = data?.choices?.[0]?.message?.content || "⚠️ No AI response";

    console.log("🤖 OpenAI replied:", aiMessage.substring(0, 100) + "...");

    res.json({ reply: aiMessage });
  } catch (err) {
    console.error("❌ Server Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Backend running on http://127.0.0.1:${PORT}`)
);
