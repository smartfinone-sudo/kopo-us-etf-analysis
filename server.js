/**
 * ETF Analysis System - Express.js Server
 * Serves frontend static files and provides RESTful Table API
 */

const express = require('express');
const pool = require('./backend/database/db');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./backend/database/db');
const tablesRouter = require('./backend/routes/tables');

const app = express();
const PORT = process.env.PORT || 8080;

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

app.get('/health/db', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT 1 as ok');
    res.json({ db_ok: rows[0].ok === 1 });
  } catch (e) {
    console.error('DB health check failed:', e);
    res.status(500).json({ error: e.message });
  }
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
app.use('/tables', tablesRouter);

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

// Serve index.html for all other routes (SPA support)
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
