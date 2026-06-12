const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

console.log('🚀 Scholastica Finance API starting...');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
    } else {
        console.log('✅ Connected to PostgreSQL database');
        release();
    }
});

// Helper functions
function generateToken(userId, username, role) {
    return jwt.sign(
        { id: userId, username, role },
        process.env.JWT_SECRET || 'scholastica_secret',
        { expiresIn: '7d' }
    );
}

function formatPhoneNumber(phone) {
    let num = phone.replace(/\D/g, '');
    if (num.startsWith('0')) num = '255' + num.substring(1);
    if (!num.startsWith('255')) num = '255' + num;
    return num;
}

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Root endpoint - serve HTML dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Info endpoint
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'Scholastica Finance API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            health: 'GET /health',
            clients: 'GET /api/clients',
            clients_post: 'POST /api/clients',
            loans: 'GET /api/loans/all',
            loans_post: 'POST /api/loans',
            payments: 'POST /api/payments',
            dashboard: 'GET /api/reports/dashboard',
            login: 'POST /api/auth/login',
            register: 'POST /api/auth/register'
        }
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Scholastica Finance API is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ==================== AUTH ENDPOINTS ====================
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password, full_name, role } = req.body;

    if (!username || !email || !password || !full_name) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash, full_name, role) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, full_name, role`,
            [username, email, password_hash, full_name, role || 'staff']
        );

        const user = result.rows[0];
        const token = generateToken(user.id, user.username, user.role);

        res.json({ success: true, data: user, token });
    } catch (error) {
        if (error.code === '23505') {
            res.status(400).json({ success: false, message: 'Username or email already exists' });
        } else {
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { identifier, password } = req.body;

    try {
        const result = await pool.query(
            `SELECT * FROM users WHERE username = $1 OR email = $1`,
            [identifier]
        );

        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        await pool.query(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);

        const token = generateToken(user.id, user.username, user.role);

        res.json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            },
            token
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ==================== CLIENTS ENDPOINTS ====================
app.get('/api/clients', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM clients ORDER BY created_at DESC`);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/clients/:id', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM clients WHERE id = $1`, [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/clients', async (req, res) => {
    const { full_name, phone_number, email, address } = req.body;

    if (!full_name || !phone_number) {
        return res.status(400).json({ success: false, message: 'Jina na namba ya simu vinahitajika' });
    }

    try {
        const formattedPhone = formatPhoneNumber(phone_number);
        const result = await pool.query(
            `INSERT INTO clients (full_name, phone_number, email, address) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [full_name, formattedPhone, email || null, address || null]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            res.status(400).json({ success: false, message: 'Namba ya simu tayari ipo' });
        } else {
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
});

// ==================== LOANS ENDPOINTS ====================
app.get('/api/loans/all', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.id, l.client_id, l.client_name, l.phone_number,
                   l.amount_borrowed, l.interest_rate, l.interest_amount,
                   l.total_amount, l.amount_repaid, l.remaining_balance,
                   l.start_date, l.due_date, l.status, l.created_at
            FROM loans l ORDER BY l.created_at DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/loans/active', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM loans WHERE status = 'active' ORDER BY due_date ASC
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/loans', async (req, res) => {
    const { client_id, client_name, phone_number, amount_borrowed, interest_rate, duration_months, due_date } = req.body;

    if (!client_id || !amount_borrowed || !interest_rate) {
        return res.status(400).json({ success: false, message: 'Taarifa zote muhimu zinahitajika' });
    }

    const duration = duration_months || 1;
    const interest_amount = amount_borrowed * (interest_rate / 100) * duration;
    const total_amount = amount_borrowed + interest_amount;
    const start_date = new Date().toISOString().split('T')[0];
    const finalDueDate = due_date || (() => {
        const date = new Date();
        date.setMonth(date.getMonth() + duration);
        return date.toISOString().split('T')[0];
    })();

    try {
        const result = await pool.query(
            `INSERT INTO loans (client_id, client_name, phone_number, amount_borrowed, interest_rate, 
                               interest_amount, total_amount, duration_months, start_date, due_date, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active') RETURNING *`,
            [client_id, client_name, phone_number, amount_borrowed, interest_rate,
             interest_amount, total_amount, duration, start_date, finalDueDate]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.put('/api/loans/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        const result = await pool.query(`UPDATE loans SET status = $1 WHERE id = $2 RETURNING *`, [status, req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Loan not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ==================== PAYMENTS ENDPOINTS ====================
app.get('/api/payments/all', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, l.client_name, l.phone_number
            FROM payments p
            JOIN loans l ON p.loan_id = l.id
            ORDER BY p.payment_date DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/payments', async (req, res) => {
    const { loan_id, amount, payment_date, payment_method } = req.body;

    if (!loan_id || !amount) {
        return res.status(400).json({ success: false, message: 'Loan ID na amount vinahitajika' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const loanResult = await client.query(`SELECT * FROM loans WHERE id = $1 FOR UPDATE`, [loan_id]);
        if (loanResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Loan not found' });
        }

        const loan = loanResult.rows[0];
        const paymentAmount = parseFloat(amount);
        const newRepaid = parseFloat(loan.amount_repaid) + paymentAmount;
        const newRemaining = parseFloat(loan.total_amount) - newRepaid;
        const newStatus = newRemaining <= 0 ? 'completed' : loan.status;
        const receiptNumber = `RCP${Date.now()}`;

        await client.query(
            `INSERT INTO payments (loan_id, amount, payment_date, receipt_number, payment_method) 
             VALUES ($1, $2, $3, $4, $5)`,
            [loan_id, paymentAmount, payment_date || new Date().toISOString().split('T')[0], receiptNumber, payment_method || 'cash']
        );

        await client.query(
            `UPDATE loans SET amount_repaid = $1, remaining_balance = $2, status = $3 WHERE id = $4`,
            [newRepaid, newRemaining, newStatus, loan_id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Payment recorded successfully',
            data: { remaining_balance: newRemaining, status: newStatus, receipt_number: receiptNumber }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, message: 'Server error' });
    } finally {
        client.release();
    }
});

app.get('/api/payments/loan/:loanId', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM payments WHERE loan_id = $1 ORDER BY payment_date DESC`, [req.params.loanId]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ==================== REPORTS ENDPOINTS ====================
app.get('/api/reports/dashboard', async (req, res) => {
    try {
        const totalClients = await pool.query(`SELECT COUNT(*) FROM clients`);
        const activeLoans = await pool.query(`SELECT COUNT(*) FROM loans WHERE status = 'active'`);
        const totalDisbursed = await pool.query(`SELECT COALESCE(SUM(amount_borrowed), 0) as total FROM loans`);
        const totalRepaid = await pool.query(`SELECT COALESCE(SUM(amount_repaid), 0) as total FROM loans`);

        res.json({
            success: true,
            data: {
                totalClients: parseInt(totalClients.rows[0].count),
                activeLoans: parseInt(activeLoans.rows[0].count),
                totalDisbursed: parseFloat(totalDisbursed.rows[0].total),
                totalRepaid: parseFloat(totalRepaid.rows[0].total)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Scholastica Finance API running on port ${PORT}`);
    console.log(`📍 Frontend: http://localhost:${PORT}/`);
    console.log(`📍 Health: http://localhost:${PORT}/health`);
});