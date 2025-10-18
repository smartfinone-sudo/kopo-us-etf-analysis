/**
 * Database connection and query utilities
 */

const { Pool } = require('pg');
require('dotenv').config();

// Database connection configuration
const poolConfig = {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

// Cloud SQL connection (for Cloud Run)
if (process.env.CLOUD_SQL_CONNECTION_NAME && process.env.DB_SOCKET_PATH) {
    poolConfig.host = `${process.env.DB_SOCKET_PATH}/${process.env.CLOUD_SQL_CONNECTION_NAME}`;
} else {
    poolConfig.host = process.env.DB_HOST || 'localhost';
    poolConfig.port = process.env.DB_PORT || 5432;
}

poolConfig.database = process.env.DB_NAME || 'etf_analysis';
poolConfig.user = process.env.DB_USER || 'postgres';
poolConfig.password = process.env.DB_PASSWORD;

const pool = new Pool(poolConfig);

// Error handling
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

/**
 * Execute a query
 */
async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Database query error', { text, error: error.message });
        throw error;
    }
}

/**
 * Get a client from the pool for transactions
 */
async function getClient() {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;

    // Set a timeout of 5 seconds
    const timeout = setTimeout(() => {
        console.error('A client has been checked out for more than 5 seconds!');
    }, 5000);

    // Override release method
    client.release = () => {
        clearTimeout(timeout);
        client.query = query;
        client.release = release;
        return release.apply(client);
    };

    return client;
}

/**
 * Initialize database (create tables)
 */
async function initDatabase() {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        await query(schema);
        console.log('Database initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
}

/**
 * Test database connection
 */
async function testConnection() {
    try {
        const result = await query('SELECT NOW()');
        console.log('Database connection successful:', result.rows[0]);
        return true;
    } catch (error) {
        console.error('Database connection failed:', error);
        return false;
    }
}

module.exports = {
    query,
    getClient,
    pool,
    initDatabase,
    testConnection
};
