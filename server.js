const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

console.log('🚀 Scholastica Finance API starting...');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
    } else {
        console.log('✅ Connected to PostgreSQL database');
        release();
    }
});

function generateToken(userId, username, role) {
    return jwt.sign({ id: userId, username, role }, process.env.JWT_SECRET || 'scholastica_secret', { expiresIn: '7d' });
}

function formatPhoneNumber(phone) {
    let num = phone.replace(/\D/g, '');
    if (num.startsWith('0')) num = '255' + num.substring(1);
    if (!num.startsWith('255')) num = '255' + num;
    return num;
}

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'scholamalaba63@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
});

// Send SMS Alert (simulated) and Email
async function sendAlerts(phoneNumber, email, subject, message) {
    const adminPhone = '0762004163';
    const adminEmail = 'scholamalaba63@gmail.com';
    
    console.log(`📱 SMS would be sent to: ${phoneNumber}`);
    console.log(`📱 SMS also to admin: ${adminPhone}`);
    console.log(`📧 Email would be sent to: ${email}`);
    console.log(`📧 Email also to admin: ${adminEmail}`);
    console.log(`📝 Message: ${message}`);
    
    // Send email via nodemailer (requires configuration)
    try {
        await transporter.sendMail({
            from: adminEmail,
            to: [email, adminEmail],
            subject: subject,
            text: message
        });
        console.log('✅ Email sent successfully');
    } catch (error) {
        console.error('Email error:', error.message);
    }
    
    return true;
}

// Check and send alerts for loans due in 5 days
async function checkAndSendAlerts() {
    try {
        const result = await pool.query(`
            SELECT l.*, c.full_name as client_name, c.phone_number, c.email
            FROM loans l
            JOIN clients c ON l.client_id = c.id
            WHERE l.status = 'active' 
              AND (l.due_date - CURRENT_DATE) BETWEEN 1 AND 5
        `);
        
        for (const loan of result.rows) {
            const daysRemaining = Math.ceil((new Date(loan.due_date) - new Date()) / (1000 * 60 * 60 * 24));
            const message = `KUMBUKUMBU: Mkopo wako wa TZS ${Number(loan.amount_borrowed).toLocaleString()} unatarajiwa kulipa tarehe ${new Date(loan.due_date).toLocaleDateString()}. Siku ${daysRemaining} zimesalia. Tafadhali lipa kabla ya muda. Asante! - Scholastica Finance`;
            const subject = `KUMBUKUMBU LA MKOPO - Siku ${daysRemaining} Zimesalia`;
            
            await sendAlerts(loan.phone_number, loan.email || 'scholamalaba63@gmail.com', subject, message);
        }
    } catch (error) {
        console.error('Error sending alerts:', error);
    }
}

// Run alert check every hour
setInterval(checkAndSendAlerts, 60 * 60 * 1000);
checkAndSendAlerts();

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

app.get('/api', (req, res) => {
    res.json({ success: true, message: 'Scholastica Finance API v3.0' });
});

app.get('/health', (req, res) => { res.json({ status: 'OK', timestamp: new Date().toISOString() }); });

// ==================== AUTH ====================
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password, full_name, role } = req.body;
    if (!username || !email || !password || !full_name) return res.status(400).json({ success: false, message: 'All fields required' });
    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        const result = await pool.query(`INSERT INTO users (username, email, password_hash, full_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, full_name, role`, [username, email, password_hash, full_name, role || 'staff']);
        const user = result.rows[0];
        const token = generateToken(user.id, user.username, user.role);
        res.json({ success: true, data: user, token });
    } catch (error) {
        if (error.code === '23505') res.status(400).json({ success: false, message: 'Username or email already exists' });
        else res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { identifier, password } = req.body;
    try {
        const result = await pool.query(`SELECT * FROM users WHERE username = $1 OR email = $1`, [identifier]);
        const user = result.rows[0];
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        await pool.query(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);
        const token = generateToken(user.id, user.username, user.role);
        res.json({ success: true, data: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, role: user.role }, token });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// ==================== CLIENTS ====================
app.get('/api/clients', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM clients WHERE status != 'deleted' ORDER BY created_at DESC`);
        res.json({ success: true, data: result.rows });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
});

app.get('/api/clients/:id', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM clients WHERE id = $1`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Mteja hatapatikana' });
        res.json({ success: true, data: result.rows[0] });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
});

app.post('/api/clients', async (req, res) => {
    const { full_name, phone_number, email, address } = req.body;
    if (!full_name || !phone_number) return res.status(400).json({ success: false, message: 'Jina na namba ya simu vinahitajika' });
    try {
        const formattedPhone = formatPhoneNumber(phone_number);
        const result = await pool.query(`INSERT INTO clients (full_name, phone_number, email, address) VALUES ($1, $2, $3, $4) RETURNING *`, [full_name, formattedPhone, email || null, address || null]);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') res.status(400).json({ success: false, message: 'Namba ya simu tayari ipo' });
        else res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.put('/api/clients/:id', async (req, res) => {
    const { full_name, phone_number, email, address, status } = req.body;
    const clientId = req.params.id;
    try {
        let formattedPhone = phone_number;
        if (phone_number) formattedPhone = formatPhoneNumber(phone_number);
        const result = await pool.query(`UPDATE clients SET full_name = COALESCE($1, full_name), phone_number = COALESCE($2, phone_number), email = COALESCE($3, email), address = COALESCE($4, address), status = COALESCE($5, status), updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *`, [full_name || null, formattedPhone || null, email || null, address || null, status || null, clientId]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Mteja hatapatikana' });
        res.json({ success: true, message: 'Taarifa zimehaririwa', data: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') res.status(400).json({ success: false, message: 'Namba ya simu tayari ipo' });
        else res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.delete('/api/clients/:id', async (req, res) => {
    const clientId = req.params.id;
    try {
        const activeLoans = await pool.query(`SELECT COUNT(*) FROM loans WHERE client_id = $1 AND status = 'active'`, [clientId]);
        if (parseInt(activeLoans.rows[0].count) > 0) {
            return res.status(400).json({ success: false, message: 'Haiwezi kumfuta mteja aliye na mikopo inayoendelea' });
        }
        const result = await pool.query(`UPDATE clients SET status = 'deleted', deleted_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`, [clientId]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Mteja hatapatikana' });
        res.json({ success: true, message: 'Mteja amefutwa', data: result.rows[0] });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// ==================== LOANS WITH SORTING ====================
app.get('/api/loans/all', async (req, res) => {
    const { sort } = req.query;
    let orderBy = 'l.created_at DESC';
    
    if (sort === 'days_asc') orderBy = 'days_remaining ASC';
    else if (sort === 'days_desc') orderBy = 'days_remaining DESC';
    else if (sort === 'amount_asc') orderBy = 'l.amount_borrowed ASC';
    else if (sort === 'amount_desc') orderBy = 'l.amount_borrowed DESC';
    else if (sort === 'due_date_asc') orderBy = 'l.due_date ASC';
    else if (sort === 'due_date_desc') orderBy = 'l.due_date DESC';
    
    try {
        const result = await pool.query(`
            SELECT l.*, c.full_name as client_full_name, c.phone_number, c.email,
                   (l.due_date - CURRENT_DATE) as days_remaining, 
                   CASE WHEN CURRENT_DATE > l.due_date THEN (CURRENT_DATE - l.due_date) ELSE 0 END as days_overdue 
            FROM loans l 
            JOIN clients c ON l.client_id = c.id 
            WHERE c.status != 'deleted' 
            ORDER BY ${orderBy}
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
});

app.get('/api/loans/defaulters', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.*, c.full_name as client_full_name, c.phone_number as client_phone, c.email,
                   (CURRENT_DATE - l.due_date) as days_overdue 
            FROM loans l 
            JOIN clients c ON l.client_id = c.id 
            WHERE l.status = 'active' AND CURRENT_DATE > l.due_date AND c.status != 'deleted' 
            ORDER BY l.due_date ASC
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
});

app.get('/api/loans/upcoming', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.*, c.full_name as client_full_name, c.phone_number as client_phone, c.email,
                   (l.due_date - CURRENT_DATE) as days_remaining 
            FROM loans l 
            JOIN clients c ON l.client_id = c.id 
            WHERE l.status = 'active' AND CURRENT_DATE <= l.due_date AND (l.due_date - CURRENT_DATE) <= 5 AND c.status != 'deleted' 
            ORDER BY l.due_date ASC
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
});

app.post('/api/loans', async (req, res) => {
    const { client_id, client_name, phone_number, amount_borrowed, interest_rate, duration_months, due_date } = req.body;
    if (!client_id || !amount_borrowed || !interest_rate) return res.status(400).json({ success: false, message: 'Taarifa zote muhimu zinahitajika' });
    const duration = duration_months || 1;
    const interest_amount = amount_borrowed * (interest_rate / 100) * duration;
    const total_amount = amount_borrowed + interest_amount;
    const start_date = new Date().toISOString().split('T')[0];
    const finalDueDate = due_date || (() => { const date = new Date(); date.setMonth(date.getMonth() + duration); return date.toISOString().split('T')[0]; })();
    try {
        const result = await pool.query(`INSERT INTO loans (client_id, client_name, phone_number, amount_borrowed, interest_rate, interest_amount, total_amount, duration_months, start_date, due_date, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active') RETURNING *`, [client_id, client_name, phone_number, amount_borrowed, interest_rate, interest_amount, total_amount, duration, start_date, finalDueDate]);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// ==================== PAYMENTS ====================
app.get('/api/payments/all', async (req, res) => {
    try {
        const result = await pool.query(`SELECT p.*, l.client_name, l.phone_number, l.amount_borrowed FROM payments p JOIN loans l ON p.loan_id = l.id ORDER BY p.payment_date DESC`);
        res.json({ success: true, data: result.rows });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
});

app.post('/api/payments', async (req, res) => {
    const { loan_id, amount, payment_method, payment_date } = req.body;
    if (!loan_id || !amount) return res.status(400).json({ success: false, message: 'Taarifa za malipo hazijakamilika' });
    try {
        const loanCheck = await pool.query(`SELECT id, total_amount, amount_repaid FROM loans WHERE id = $1`, [loan_id]);
        if (loanCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'Mkopo haupatikani' });
        const insertResult = await pool.query(`INSERT INTO payments (loan_id, amount, payment_date, payment_method) VALUES ($1, $2, COALESCE($3, CURRENT_DATE), COALESCE($4, 'cash')) RETURNING *`, [loan_id, amount, payment_date || null, payment_method]);
        const totals = await pool.query(`SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE loan_id = $1`, [loan_id]);
        const totalPaid = parseFloat(totals.rows[0].total_paid);
        await pool.query(`UPDATE loans SET amount_repaid = $1 WHERE id = $2`, [totalPaid, loan_id]);
        const updatedLoan = await pool.query(`SELECT id, remaining_balance, status FROM loans WHERE id = $1`, [loan_id]);
        const newBalance = parseFloat(updatedLoan.rows[0].remaining_balance);
        const newStatus = newBalance <= 0 ? 'completed' : 'active';
        if (newStatus !== updatedLoan.rows[0].status && newStatus === 'completed') await pool.query(`UPDATE loans SET status = $1 WHERE id = $2`, [newStatus, loan_id]);
        res.json({ success: true, message: 'Malipo yamekamilika', data: { payment: insertResult.rows[0], remaining_balance: newBalance, status: newStatus, amount_repaid: totalPaid } });
    } catch (error) { console.error('Payment error:', error); res.status(500).json({ success: false, message: error.message }); }
});

// ==================== REPORTS ====================
app.get('/api/reports/dashboard', async (req, res) => {
    try {
        const totalClients = await pool.query(`SELECT COUNT(*) FROM clients WHERE status = 'active'`);
        const activeLoans = await pool.query(`SELECT COUNT(*) FROM loans WHERE status = 'active'`);
        const totalDisbursed = await pool.query(`SELECT COALESCE(SUM(amount_borrowed), 0) as total FROM loans`);
        const totalRepaid = await pool.query(`SELECT COALESCE(SUM(amount_repaid), 0) as total FROM loans`);
        const defaulters = await pool.query(`SELECT COUNT(*) FROM loans WHERE status = 'active' AND CURRENT_DATE > due_date`);
        const totalInterest = await pool.query(`SELECT COALESCE(SUM(interest_amount), 0) as total FROM loans`);

        res.json({ 
            success: true, 
            data: { 
                totalClients: parseInt(totalClients.rows[0].count), 
                activeLoans: parseInt(activeLoans.rows[0].count), 
                totalDisbursed: parseFloat(totalDisbursed.rows[0].total), 
                totalRepaid: parseFloat(totalRepaid.rows[0].total), 
                defaulters: parseInt(defaulters.rows[0].count), 
                totalInterest: parseFloat(totalInterest.rows[0].total) 
            } 
        });
    } catch (error) { 
        res.status(500).json({ success: false, message: 'Server error' }); 
    }
});

app.get('/api/reports/trend', async (req, res) => {
    try {
        const loanTrend = await pool.query(`SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month, COALESCE(SUM(amount_borrowed), 0) as total FROM loans WHERE created_at >= CURRENT_DATE - INTERVAL '6 months' GROUP BY DATE_TRUNC('month', created_at) ORDER BY DATE_TRUNC('month', created_at) ASC`);
        const paymentTrend = await pool.query(`SELECT TO_CHAR(DATE_TRUNC('month', payment_date), 'Mon YYYY') as month, COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_date >= CURRENT_DATE - INTERVAL '6 months' GROUP BY DATE_TRUNC('month', payment_date) ORDER BY DATE_TRUNC('month', payment_date) ASC`);
        res.json({ success: true, data: { loans: loanTrend.rows, payments: paymentTrend.rows } });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// Manual trigger for alerts
app.post('/api/send-alert', async (req, res) => {
    const { loan_id, phone_number, email, subject, message } = req.body;
    try {
        await sendAlerts(phone_number, email, subject, message);
        res.json({ success: true, message: 'Alert sent successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.use('*', (req, res) => { res.status(404).json({ success: false, message: 'Endpoint haipatikani' }); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => { 
    console.log(`✅ Scholastica Finance API running on port ${PORT}`);
});