/**
 * Database initialization script
 * Run this to create tables: npm run init-db
 */

const db = require('./db');

async function main() {
    console.log('Starting database initialization...');
    
    try {
        // Test connection
        console.log('Testing database connection...');
        const connected = await db.testConnection();
        
        if (!connected) {
            console.error('❌ Database connection failed. Please check your configuration.');
            process.exit(1);
        }
        
        console.log('✅ Database connection successful');
        
        // Initialize database (create tables)
        console.log('Creating database tables...');
        await db.initDatabase();
        
        console.log('✅ Database initialization completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

main();
