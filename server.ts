import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';
const PORT = 3000; // Hardcoded container port

// Verify and log API Key status silently
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '30mb' }));

  // API Endpoints
  app.post('/api/gemini/detect', async (req: Request, res: Response) => {
    try {
      const { image, mode, targetLetter, targetPattern } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'Missing image payload' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      }

      // Convert image data back to parts
      const imagePart = {
        inlineData: {
          mimeType: 'image/jpeg',
          data: image
        }
      };

      let prompt = '';
      let responseSchema: any = null;

      if (mode === 'READ') {
        prompt = `You are a Braille recognition expert. Analyze this image of physical Braille text (embossed or handwritten dots on paper).
Detect ALL Braille dots precisely.
Group dots into Braille cells (2 columns x 3 rows each).
For each cell identify which of the 6 dot positions are raised (1) or flat (0).
Dot positions: 1=top-left, 2=mid-left, 3=bot-left, 4=top-right, 5=mid-right, 6=bot-right.
Return ONLY valid JSON structure:
{
  "cells": [ [1,0,1,0,0,0], [1,1,0,0,0,0] ],
  "decoded": "sample",
  "confidence": 0.95,
  "dotCount": 12,
  "surfaceType": "paper",
  "lighting": "good",
  "warnings": []
}`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            cells: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER }
              }
            },
            decoded: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            dotCount: { type: Type.INTEGER },
            surfaceType: { type: Type.STRING },
            lighting: { type: Type.STRING },
            warnings: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['cells', 'decoded', 'confidence']
        };
      } else if (mode === 'CHECK') {
        prompt = `Analyze this handwritten Braille. The user is learning to write Braille and wants to verify accuracy.
Detect all dots and decode the Braille.
Compare the detected pattern to standard Braille.
Find specific errors: missing dots, extra dots, misplaced dots, wrong spacing.
Return ONLY valid JSON:
{
  "decoded": "hello",
  "cells": [ [1,0,1,0,0,0] ],
  "errors": [
    {
      "cellIndex": 2,
      "errorType": "missing_dot",
      "dotPosition": 3,
      "expected": [1,1,1,0,0,0],
      "detected": [1,1,0,0,0,0],
      "correction": "Add dot 3 to write letter L correctly"
    }
  ],
  "overallAccuracy": 85,
  "encouragement": "Great effort! Almost perfect!"
}`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            decoded: { type: Type.STRING },
            cells: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER }
              }
            },
            errors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  cellIndex: { type: Type.INTEGER },
                  errorType: { type: Type.STRING },
                  dotPosition: { type: Type.INTEGER },
                  expected: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                  detected: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                  correction: { type: Type.STRING }
                },
                required: ['cellIndex', 'errorType', 'correction']
              }
            },
            overallAccuracy: { type: Type.INTEGER },
            encouragement: { type: Type.STRING }
          },
          required: ['decoded', 'cells', 'errors', 'overallAccuracy', 'encouragement']
        };
      } else if (mode === 'WORLD') {
        prompt = `This image shows Braille on a real-world surface (elevator button, sign, medicine bottle, ATM, menu).
The Braille may be embossed on plastic, metal, or rubber.
Use shadow analysis and edge detection mentally to find raised Braille dots on non-paper surfaces.
Return ONLY valid JSON:
{
  "cells": [ [1,0,1,0,0,0] ],
  "decoded": "floor 3",
  "confidence": 0.88,
  "surfaceType": "metal/plastic/rubber",
  "surfaceColor": "silver",
  "context": "elevator button panel",
  "usefulInfo": "This says Floor 3"
}`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            cells: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER }
              }
            },
            decoded: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            surfaceType: { type: Type.STRING },
            surfaceColor: { type: Type.STRING },
            context: { type: Type.STRING },
            usefulInfo: { type: Type.STRING }
          },
          required: ['cells', 'decoded', 'confidence']
        };
      } else if (mode === 'LEARN') {
        prompt = `The user is practicing writing Braille letter or word "${targetLetter || 'A'}".
The expected pattern is "${targetPattern || '[1,0,0,0,0,0]'}".
Analyze the image and detect what Braille pattern the user has created.
Compare to expected pattern.
Return ONLY valid JSON:
{
  "detected": [1,1,0,0,0,0],
  "expected": [1,0,0,0,0,0],
  "isCorrect": false,
  "score": 70,
  "feedback": "Remove dot 2. Only dot 1 should be raised for letter A",
  "nextHint": "Try again, you are very close!"
}`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            detectedPattern: { type: Type.ARRAY, items: { type: Type.INTEGER } },
            expectedPattern: { type: Type.ARRAY, items: { type: Type.INTEGER } },
            isCorrect: { type: Type.BOOLEAN },
            score: { type: Type.INTEGER },
            feedback: { type: Type.STRING },
            nextHint: { type: Type.STRING }
          },
          required: ['isCorrect', 'score', 'feedback']
        };
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
          responseMimeType: 'application/json',
          responseSchema
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response from Gemini Vision AI');
      }

      res.json(JSON.parse(responseText));
    } catch (error: any) {
      console.error('Error in /api/gemini/detect:', error);
      const isQuotaError = error.message?.includes('429') || 
                           error.message?.toLowerCase().includes('quota') || 
                           error.message?.toLowerCase().includes('resource_exhausted') || 
                           error.status === 429;
      
      if (isQuotaError) {
        return res.status(429).json({ 
          error: 'QUOTA_EXCEEDED', 
          message: 'The free-tier Gemini API key quota limit has been exceeded. The system will handle this perfectly by falling back to our high-accuracy offline Edge Computer Vision algorithms.' 
        });
      }
      res.status(500).json({ error: error.message || 'Gemini Vision detection failed' });
    }
  });

  app.post('/api/gemini/quality', async (req: Request, res: Response) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'Missing image payload' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      }

      const imagePart = {
        inlineData: {
          mimeType: 'image/jpeg',
          data: image
        }
      };

      const prompt = `Rate this image quality for Braille scanning: brightness (0-100), blur (0-100), angle (degrees deviation from flat), hasBraille (true/false).
Return only JSON format:
{
  "brightness": 85,
  "blur": 15,
  "angle": 5,
  "hasBraille": true
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              brightness: { type: Type.INTEGER },
              blur: { type: Type.INTEGER },
              angle: { type: Type.INTEGER },
              hasBraille: { type: Type.BOOLEAN }
            },
            required: ['brightness', 'blur', 'angle', 'hasBraille']
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response from Gemini Quality Analyzer');
      }

      res.json(JSON.parse(responseText));
    } catch (error: any) {
      console.error('Error in /api/gemini/quality:', error);
      const isQuotaError = error.message?.includes('429') || 
                           error.message?.toLowerCase().includes('quota') || 
                           error.message?.toLowerCase().includes('resource_exhausted') || 
                           error.status === 429;
      
      if (isQuotaError) {
        return res.status(429).json({ 
          error: 'QUOTA_EXCEEDED', 
          message: 'The free-tier Gemini API key quota limit has been exceeded. Defaulting to standard light and clarity assessments.' 
        });
      }
      res.status(500).json({ error: error.message || 'Gemini Quality Analysis failed' });
    }
  });

  // Client Routing
  if (isProd) {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));

    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // In development mode, load Vite dev server as middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });

    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
