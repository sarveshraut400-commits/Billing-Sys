const express = require('express');
const cors = require('cors');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const pino = require('pino');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

let sock;
let currentQR = null;
let isConnected = false;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            currentQR = await QRCode.toDataURL(qr);
            isConnected = false;
        }

        if (connection === 'close') {
            isConnected = false;
            currentQR = null;
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting:', shouldReconnect);
            
            if (shouldReconnect) {
                setTimeout(connectToWhatsApp, 2000);
            } else {
                console.log('Logged out. Please scan new QR.');
                // Delete auth folder so it can generate a fresh QR
                fs.rmSync('auth_info_baileys', { recursive: true, force: true });
                setTimeout(connectToWhatsApp, 2000);
            }
        } else if (connection === 'open') {
            console.log('WhatsApp connected successfully!');
            isConnected = true;
            currentQR = null;
        }
    });
}

// Start connection process
connectToWhatsApp().catch(err => console.error("Error starting WA:", err));

app.get('/api/wa/status', (req, res) => {
    res.json({ connected: isConnected, hasQR: !!currentQR });
});

app.get('/api/wa/qr', (req, res) => {
    if (isConnected) return res.json({ error: 'Already connected' });
    if (!currentQR) return res.json({ error: 'QR not ready yet' });
    res.json({ qr: currentQR });
});

app.post('/api/wa/send', async (req, res) => {
    if (!isConnected || !sock) {
        return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
    }

    const { phone, message } = req.body;
    if (!phone || !message) {
        return res.status(400).json({ success: false, error: 'Phone and message required' });
    }

    try {
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone; // Default to India if 10 digits
        
        const waid = `${cleanPhone}@s.whatsapp.net`;
        await sock.sendMessage(waid, { text: message });
        console.log(`[WhatsApp] Auto-sent message to ${waid}`);
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (e) {
        console.error("[WhatsApp] Send Error:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`WhatsApp microservice listening on port ${PORT}`));
