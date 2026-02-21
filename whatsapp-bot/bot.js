const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// Initialize WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready! Checking Firestore...');
    testConnection();
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
});

client.initialize();

async function testConnection() {
    try {
        console.log(`Testing Firestore connection for Project: ${serviceAccount.project_id}...`);
        // Try to read the collections to verify access
        const collections = await db.listCollections();
        console.log('✅ Connected to Firestore! Found collections:', collections.map(c => c.id).join(', ') || '(Empty Database)');
        
        // If successful, start listening
        startListening();
    } catch (error) {
        console.error('❌ FATAL: Could not connect to Firestore.');
        console.error('Error details:', error.message);
        console.error('Possible causes:');
        console.error('1. Bad Internet Connection / VPN / Firewall blocking gRPC.');
        console.error('2. Invalid serviceAccountKey.json content.');
        console.error('3. System time is incorrect.');
    }
}

// End of client initialization


function startListening() {
    console.log('Listening for new messages in whatsapp_queue...');
    
    // Listen to 'pending' documents
    const queueRef = db.collection('whatsapp_queue').where('status', '==', 'pending');

    queueRef.onSnapshot(snapshot => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
                const { doc } = change;
                const data = doc.data();
                
                console.log(`Processing message for ${data.phoneNumber}: ${data.message}`);

                try {
                    // Format phone number: remove '+' and ensure it has country code
                    // whatsapp-web.js expects '966xxxxxxxxx@c.us'
                    let phone = data.phoneNumber.replace('+', '').replace(/\s/g, '');
                    const chatId = `${phone}@c.us`;

                    // Send Message
                    if (data.mediaPath) {
                        try {
                            const { MessageMedia } = require('whatsapp-web.js');
                            const media = MessageMedia.fromFilePath(data.mediaPath);
                            await client.sendMessage(chatId, media, { caption: data.message });
                        } catch (mediaError) {
                            console.error(`Failed to load/send media: ${data.mediaPath}`, mediaError);
                            // Fallback to text only
                            await client.sendMessage(chatId, data.message + "\n\n(عذراً، فشل إرسال الملف المرفق)");
                        }
                    } else {
                        await client.sendMessage(chatId, data.message);
                    }
                    
                    // Update status to 'sent'
                    await doc.ref.update({
                        status: 'sent',
                        sentAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    
                    console.log(`Message sent to ${phone}`);
                } catch (error) {
                    console.error(`Failed to send message to ${data.phoneNumber}:`, error);
                    
                    // Update status to 'failed'
                    await doc.ref.update({
                        status: 'failed',
                        error: error.message,
                        failedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        });
    }, error => {
        console.error('Firestore listener error:', error);
    });
}
