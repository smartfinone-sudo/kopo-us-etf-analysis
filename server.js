/**
 * ETF Analysis System - Express.js Server
 * Serves frontend static files and provides RESTful Table API
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./backend/database/db');
const tablesRouter = require('./backend/routes/tables');

const app = express();
const PORT = process.env.PORT || 8080;

// ======== Basic Auth for write methods (UPLOAD_USER / UPLOAD_PASS via env) ========
const UPLOAD_USER = process.env.UPLOAD_USER || '';
const UPLOAD_PASS = process.env.UPLOAD_PASS || '';

function requireBasicAuth(req, res, next) {
    if (!UPLOAD_USER || !UPLOAD_PASS) {
        // no creds set => skip auth (dev convenience)
        return next();
    }
    const hdr = req.headers['authorization'] || '';
    if (!hdr.startsWith('Basic ')) {
        res.set('WWW-Authenticate', 'Basic realm="Uploads"');
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const decoded = Buffer.from(hdr.slice(6), 'base64').toString('utf8');
    const sep = decoded.indexOf(':');
    const user = decoded.slice(0, sep);
    const pass = decoded.slice(sep + 1);
    if (user === UPLOAD_USER && pass === UPLOAD_PASS) return next();
    res.set('WWW-Authenticate', 'Basic realm="Uploads"');
    return res.status(401).json({ error: 'Unauthorized' });
}

function protectWriteMethods(req, res, next) {
    const WRITE = ['POST','PUT','PATCH','DELETE'];
    if (WRITE.includes((req.method || '').toUpperCase())) return requireBasicAuth(req,res,next);
    return next();
}
// ================================================================================

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const dbConnected = await db.testConnection();
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: dbConnected ? 'connected' : 'disconnected',
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

// API Routes
app.use('/tables', protectWriteMethods, tablesRouter);

// Serve static files (frontend)
app.use(express.static(path.join(__dirname), {
    index: 'index.html',
    extensions: ['html'],
    setHeaders: (res, filePath) => {
        // Cache static assets
        if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
        }
    }
}));

// Serve index.html for all other routes (`SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// Start server
async function startServer() {
    try {
        // Test database connection
        console.log('Testing database connection...');
        const dbConnected = await db.testConnection();
        
        if (!dbConnected) {
            console.warn('⚠️  Database connection failed. Server will start but API calls may fail.');
            console.warn('⚠️  Please check your database configuration and run: npm run init-db');
        } else {
            console.log('✅ Database connection successful');
        }
        
        // Start listening
        app.listen(PORT, '0.0.0.0', () => {
            console.log('=================================');
            console.log(`🚀 ETF Analysis System Server`);
            console.log(`📡 Server running on port ${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🗄️  Database: ${dbConnected ? 'Connected' : 'Disconnected'}`);
            console.log('=================================');
            console.log(`Health check: http://localhost:${PORT}/health`);
            console.log(`Application: http://localhost:${PORT}`);
            console.log('=================================');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    db.pool.end(() => {
        console.log('Database pool closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    db.pool.end(() => {
        console.log('Database pool closed');
        process.exit(0);
    });
});

startServer();
