const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3000;
const DB_PATH = './shreeji_v2.db';

// Twilio Setup (only if credentials are provided)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('✓ Twilio WhatsApp integration enabled');
} else {
    console.log('⚠ Twilio credentials not found - WhatsApp messages will be logged to console only');
    console.log('  To enable: Create .env file with TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
}

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '.')));

// Database Initialization
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database (v2).');
        createTables();
    }
});

function createTables() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        phone TEXT,
        password TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        total_amount REAL,
        payment_method TEXT,
        items TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
}

// WhatsApp Sender Function
async function sendWhatsApp(phone, type, data) {
    let message = '';

    if (type === 'QR') {
        message = `🛒 *Shreeji Farshan - Payment Request*\n\n` +
            `Order ID: #${data.orderId}\n` +
            `Please scan the QR code to complete your UPI payment.\n\n` +
            `Thank you for choosing Shreeji Farshan! 🙏`;
    } else if (type === 'BILL') {
        message = `🧾 *Shreeji Farshan - Order Confirmation*\n\n` +
            `Order ID: #${data.orderId}\n` +
            `Payment: Cash on Delivery\n\n` +
            `*Items:*\n`;

        data.items.forEach((item, idx) => {
            message += `${idx + 1}. ${item.title} x${item.qty} - ₹${item.price * item.qty}\n`;
        });

        message += `\n*Total Amount: ₹${data.total}*\n\n` +
            `Please keep exact change ready.\n` +
            `Thank you for your order! 🙏`;
    }

    // Ensure phone number has country code
    const formattedPhone = phone.startsWith('+') ? `whatsapp:${phone}` : `whatsapp:+91${phone}`;

    console.log(`\n📱 Sending WhatsApp to: ${formattedPhone}`);
    console.log(`Message:\n${message}\n`);

    if (twilioClient) {
        try {
            const result = await twilioClient.messages.create({
                body: message,
                from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
                to: formattedPhone
            });
            console.log(`✓ WhatsApp sent successfully! SID: ${result.sid}`);
            return { success: true, sid: result.sid };
        } catch (error) {
            console.error('✗ Failed to send WhatsApp:', error.message);
            return { success: false, error: error.message };
        }
    } else {
        console.log('⚠ Mock mode - Message logged but not sent (Twilio not configured)');
        return { success: false, error: 'Twilio not configured' };
    }
}

// Routes

// Register
app.post('/api/register', (req, res) => {
    const { name, email, phone, password } = req.body;

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 8);

    db.run(`INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)`, [name, email, phone, hashedPassword], function (err) {
        if (err) {
            return res.status(400).json({ error: 'Email already exists or error creating user.' });
        }
        res.json({ id: this.lastID, name, email, phone, success: true });
    });
});

// Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (err) return res.status(500).json({ error: 'Server error' });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const passwordIsValid = bcrypt.compareSync(password, user.password);
        if (!passwordIsValid) return res.status(401).json({ error: 'Invalid password' });

        res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone, success: true });
    });
});

// Create Order (Checkout)
app.post('/api/order', (req, res) => {
    const { user_id, total, payment_method, items } = req.body;
    const itemsStr = JSON.stringify(items);

    db.run(`INSERT INTO orders (user_id, total_amount, payment_method, items) VALUES (?, ?, ?, ?)`,
        [user_id, total, payment_method, itemsStr], function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Failed to create order' });
            }

            const orderId = this.lastID;

            // Fetch user to get phone number
            db.get(`SELECT phone FROM users WHERE id = ?`, [user_id], (err, row) => {
                if (row && row.phone) {
                    // Trigger WhatsApp Logic
                    if (payment_method === 'UPI') {
                        sendWhatsApp(row.phone, 'QR', { orderId });
                    } else if (payment_method === 'Cash') {
                        sendWhatsApp(row.phone, 'BILL', { orderId, items, total });
                    }
                }
            });

            res.json({ order_id: orderId, success: true });
        });
});

// Get Orders for User
app.get('/api/orders/:userId', (req, res) => {
    const userId = req.params.userId;
    db.all(`SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
