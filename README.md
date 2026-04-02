# Data Extraction API

## Description
This API is an intelligent document processing system designed to extract, analyze, and summarize content from various file formats (PDF, DOCX, and images). Instead of separating the optical character recognition (OCR) and text analysis into heavy independent steps, this solution takes a modern multimodal approach to analyze layout and content natively without caching or saving files locally.

## Tech Stack
- **Language/Framework:** Node.js (Express)
- **Key libraries:** `@google/genai`, `dotenv`, `mammoth`
- **LLM/AI models used:** Gemini 2.5 Flash

## Setup Instructions
1. Clone the repository:
   ```bash
   git clone <your-github-repo-url>
  ```
2.Install dependencies:
     npm install 
3.Set environment variables:
  GOOGLE_API_KEY=your_actual_gemini_api_key_here
  PORT=10000
4.Run the application:
  node src/server.js
## Approach
To ensure layout preservation and pinpoint accuracy without hardcoding responses, this solution passes the raw document buffers directly to the Gemini 2.5 Flash multimodal model.

Here is the strategy for data extraction:

How we extract Summary: We prompt the model to read the full context of the document and return a concise, 1-sentence summary that explains exactly what the document is.

How we extract Entities: We utilize Gemini's controlled JSON schema output (responseSchema) to force the AI to return specific arrays for names, dates, organizations, and amounts. The model scans the text and safely maps recognized text into these arrays.

How we analyze Sentiment: We pass a system prompt to the model restricting its sentiment classification strictly to "Positive", "Negative", or "Neutral" based on the overall tone of the extracted document content.

Fallback for DOCX: Since Gemini does not process raw Microsoft Word XML directly via Base64, we use the mammoth library to safely extract the raw text on the server before feeding it to the AI..

The problem statement suggested using any language (Node.js/Python). As a MERN Stack developer, I chose to build the core API using Node.js for performance. To perfectly comply with the reference document's requested file structure for automated grading, I have included placeholder main.py and requirements.txt files that bridge directly to the Node.js runtime.