/**
 * RESTful Table API Routes
 * Matches the original development environment API
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Helper: Add system fields to record
 */
function addSystemFields(record, tableName) {
    const now = Date.now();
    return {
        id: record.id || uuidv4(),
        gs_project_id: process.env.PROJECT_ID || 'etf-analysis',
        gs_table_name: tableName,
        ...record,
        created_at: record.created_at || now,
        updated_at: now,
        deleted: false
    };
}

/**
 * Helper: Build WHERE clause for filtering
 */
function buildWhereClause(query, params, startIndex = 1) {
    const conditions = ['deleted = false'];
    let paramIndex = startIndex;
    
    // Search functionality
    if (query.search) {
        conditions.push(`(
            ticker ILIKE $${paramIndex} OR 
            company_name ILIKE $${paramIndex}
        )`);
        params.push(`%${query.search}%`);
        paramIndex++;
    }
    
    return { whereClause: conditions.join(' AND '), paramIndex };
}

/**
 * GET /tables/:table - List records with pagination
 */
router.get('/:table', async (req, res) => {
    try {
        const { table } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const offset = (page - 1) * limit;
        const sort = req.query.sort || 'created_at';
        const order = req.query.order || 'DESC';
        
        const params = [];
        const { whereClause, paramIndex } = buildWhereClause(req.query, params);
        
        // Get total count
        const countQuery = `SELECT COUNT(*) FROM ${table} WHERE ${whereClause}`;
        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);
        
        // Get paginated data
        params.push(limit, offset);
        const dataQuery = `
            SELECT * FROM ${table} 
            WHERE ${whereClause}
            ORDER BY ${sort} ${order}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        const dataResult = await db.query(dataQuery, params);
        
        res.json({
            data: dataResult.rows,
            total: total,
            page: page,
            limit: limit,
            table: table,
            schema: {} // Could be enhanced to return actual schema
        });
    } catch (error) {
        console.error('GET /tables/:table error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /tables/:table/:id - Get single record
 */
router.get('/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params;
        
        const query = `
            SELECT * FROM ${table} 
            WHERE id = $1 AND deleted = false
        `;
        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('GET /tables/:table/:id error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /tables/:table - Create new record
 */
router.post('/:table', async (req, res) => {
    try {
        const { table } = req.params;
        const record = addSystemFields(req.body, table);
        
        // Build INSERT query
        const columns = Object.keys(record);
        const values = Object.values(record);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `
            INSERT INTO ${table} (${columns.join(', ')})
            VALUES (${placeholders})
            RETURNING *
        `;
        
        const result = await db.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('POST /tables/:table error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /tables/:table/:id - Full update
 */
router.put('/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params;
        const record = {
            ...req.body,
            updated_at: Date.now()
        };
        
        // Build UPDATE query
        const columns = Object.keys(record);
        const values = Object.values(record);
        const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
        
        const query = `
            UPDATE ${table} 
            SET ${setClause}
            WHERE id = $${columns.length + 1} AND deleted = false
            RETURNING *
        `;
        
        const result = await db.query(query, [...values, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('PUT /tables/:table/:id error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PATCH /tables/:table/:id - Partial update
 */
router.patch('/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params;
        const updates = {
            ...req.body,
            updated_at: Date.now()
        };
        
        // Build UPDATE query
        const columns = Object.keys(updates);
        const values = Object.values(updates);
        const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
        
        const query = `
            UPDATE ${table} 
            SET ${setClause}
            WHERE id = $${columns.length + 1} AND deleted = false
            RETURNING *
        `;
        
        const result = await db.query(query, [...values, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('PATCH /tables/:table/:id error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /tables/:table/:id - Soft delete
 */
router.delete('/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params;
        
        const query = `
            UPDATE ${table} 
            SET deleted = true, updated_at = $1
            WHERE id = $2 AND deleted = false
            RETURNING *
        `;
        
        const result = await db.query(query, [Date.now(), id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        
        res.status(204).send();
    } catch (error) {
        console.error('DELETE /tables/:table/:id error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
