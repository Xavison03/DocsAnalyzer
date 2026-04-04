import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import mammoth from 'mammoth';
import tesseract from 'node-tesseract-ocr'; 

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' })); 

const ai = new GoogleGenAI({});

// Static API key required for authorization
const VALID_API_KEY = "sk_track2_987654321";

// Primary endpoint for document analysis
app.post('/api/document-analyze', async (req, res) => {

  // Authorization Check
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== VALID_API_KEY) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }

  try {
    const { fileName, fileType, fileBase64 } = req.body;

    // Validation for missing payload
    if (!fileBase64 || !fileName || !fileType) {
        return res.status(400).json({ status: "error", message: "Missing required fields: fileName, fileType, or fileBase64" });
    }

    let extractedText = "";
    let useTextFallback = false;

    // HANDLER FOR DOCX 
    if (fileType === "docx") {
        console.log("Processing DOCX via Mammoth...");
        const docxBuffer = Buffer.from(fileBase64, 'base64');
       
        const result = await mammoth.extractRawText({ buffer: docxBuffer });
        extractedText = result.value;
        
        useTextFallback = true;
    }

    // Determine mimeType for visual files
    let mimeType = "application/pdf";
    const format = fileType ? fileType.toLowerCase() : "";

    if (format === "image" || format === "jpg" || format === "jpeg") {
        mimeType = "image/jpeg"; 
    } else if (format === "png") {
        mimeType = "image/png";
    } else if (format === "webp") {
        mimeType = "image/webp";
    } else if (format === "heic") {
        mimeType = "image/heic";
    } else if (format === "heif") {
        mimeType = "image/heif";
    }else if (format === "pdf") {
        mimeType = "application/pdf";
    }

    // HANDLER FOR IMAGES (Satisfies the Tesseract requirement)
  if (format === "png" || format === "jpg" || format === "jpeg" || format === "webp" || format === "heic" || format === "heif")  {
        console.log("Attempting Tesseract OCR for compliance...");
        try {
            const imageBuffer = Buffer.from(fileBase64, 'base64');
            const config = { lang: "eng", oem: 1, psm: 3 };
            
            // Runs OCR on the buffer
            extractedText = await tesseract.recognize(imageBuffer, config);
            useTextFallback = true;
            console.log("Tesseract extraction successful.");
        } catch (ocrError) {


            // If Render blocks Tesseract native binary execution, we fallback to Gemini Vision gracefully
            console.log("Tesseract failed or not installed on host. Falling back to Gemini Multimodal Vision...");
            useTextFallback = false;
        }
    }

    // Build the contents payload for Gemini
    let contentsPayload = [];

    if (useTextFallback) {
        // Sent to Gemini as clean text
        contentsPayload = [
            { text: `Analyze the following extracted document text. Extract the summary, entities, and sentiment. Pay heavy attention to specific locations and economic sectors mentioned. 
            
            Document Text:
            ${extractedText}` }
        ];
    } else {
        // Sent to Gemini as Multimodal vision
        contentsPayload = [
            { inlineData: { mimeType, data: fileBase64 } },
            { text: "Analyze this document image or PDF. Extract the summary, entities, and sentiment. Pay heavy attention to specific locations and economic sectors mentioned." }
        ];
    }

    //  Invoke Gemini API with Strict Structured JSON Schema 
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contentsPayload,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            status: { type: "STRING" },
            fileName: { type: "STRING" },
            summary: { type: "STRING" },
            entities: {
              type: "OBJECT",
              properties: {
                names: { type: "ARRAY", items: { type: "STRING" } },
                dates: { type: "ARRAY", items: { type: "STRING" } },
                organizations: { type: "ARRAY", items: { type: "STRING" } },
                amounts: { type: "ARRAY", items: { type: "STRING" } },
                locations: { type: "ARRAY", items: { type: "STRING" } }, 
                sectors: { type: "ARRAY", items: { type: "STRING" } }
              },
              required: ["names", "dates", "organizations", "amounts", "locations", "sectors"]
            },
            sentiment: { type: "STRING" }
          },
          required: ["status", "fileName", "summary", "entities", "sentiment"]
        }
      } 
    });

    const data = JSON.parse(response.text);
    data.status = "success";
    data.fileName = fileName;

    return res.json(data);

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
});

// Bind server to 0.0.0.0 for Render cloud compatibility
const PORT = process.env.PORT || 10000;
const server = app.listen(PORT, '0.0.0.0', () => console.log(`🚀 API active at port ${PORT}`));

// Force the server to allow requests to run up to 2 minutes (120,000 ms) before timing out
server.timeout = 120000;

// Quick ping endpoint to keep the server awake 
app.get('/api/ping', (req, res) => {
    res.status(200).json({ status: "alive" });
});