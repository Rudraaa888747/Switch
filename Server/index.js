import express from "express";
import cors from "cors";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const app = express();

app.use(cors());
app.use(express.json());

// Helper to simulate Vercel-like request/response for Express
const handleVercelFunction = async (handlerPath, req, res) => {
    try {
        const fullPath = join(rootDir, handlerPath);
        // We need to handle both .ts and .js if we're in dev
        // For simplicity in this env, we'll try to import the TS/JS file
        const module = await import(`file://${fullPath}`);
        const handler = module.default;
        
        // Mock Vercel response object if needed, but Express res is mostly compatible
        return handler(req, res);
    } catch (error) {
        console.error(`Error handling ${handlerPath}:`, error);
        res.status(500).json({ error: error.message });
    }
};

// Generic API handler to match Vercel's file-based routing
app.all(/^\/api\/(.*)/, async (req, res) => {
    const apiPath = req.params[0];
    const possiblePaths = [
        join(rootDir, 'api', `${apiPath}.ts`),
        join(rootDir, 'api', apiPath, 'index.ts'),
        join(rootDir, 'api', `${apiPath}.js`),
        join(rootDir, 'api', apiPath, 'index.js'),
    ];
    
    console.log(`[DevServer] ${req.method} /api/${apiPath}`);
    
    for (const fullPath of possiblePaths) {
        if (fs.existsSync(fullPath)) {
            return handleVercelFunction(fullPath.replace(rootDir, '').replace(/\\/g, '/').slice(1), req, res);
        }
    }
    
    console.warn(`[DevServer] 404 - No handler found for /api/${apiPath}`);
    res.status(404).send(`Cannot ${req.method} /api/${apiPath}`);
});

app.listen(5000, () => {
    console.log("Server running on port 5000 - Handling API routes");
});
