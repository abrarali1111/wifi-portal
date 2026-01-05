require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 8000;
const DB_FILE = path.join(__dirname, 'db.json');

// --- DATABASE MODE DETECTION ---
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://abrar2211c_db_user:Wellcom3@cluster0.jjztyoi.mongodb.net/?retryWrites=true&w=majority";
let IS_MONGO_MODE = false;
let cloudError = null;

async function startDB() {
    if (MONGODB_URI) {
        mongoose.set('strictQuery', false);
        console.log('📡 Attempting to connect to MongoDB Atlas...');

        try {
            await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
            console.log('✅ Connected to MongoDB Atlas (Live Database)');
            IS_MONGO_MODE = true;
            cloudError = null;
            await seedAdminMongo();
        } catch (err) {
            console.error('❌ MongoDB Connection Error:', err.message);
            cloudError = err.message;
            console.log('📂 Falling back to LOCAL FILE MODE');
            initializeLocalFile();
        }
    } else {
        console.log('📂 No MongoDB URI found. Running in LOCAL FILE MODE (db.json)');
        initializeLocalFile();
    }
}
startDB();

// --- MONGO SCHEMAS ---
const userSchema = new mongoose.Schema({
    id: String, customId: String, name: String, phone: String, password: { type: String, default: "123" },
    cnic: String, address: String, email: String, role: { type: Number, default: 2 },
    package: String, monthlyFee: String, balance: String, startDate: String, endDate: String, note: String, createdAt: { type: Date, default: Date.now }
});
const complaintSchema = new mongoose.Schema({
    id: String, name: String, phone: String, email: String, type: String, message: String, adminReply: String, timestamp: { type: Date, default: Date.now }, replyTimestamp: Date
});
const paymentSchema = new mongoose.Schema({
    id: String,
    userId: String,
    userName: String,
    amount: Number,
    month: String,
    transactionId: String, // Added for online payments
    proof: String, // Base64 image
    status: { type: String, default: 'approved' }, // 'pending', 'approved', 'rejected'
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Complaint = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);
const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

// --- LOCAL FILE INIT ---
function initializeLocalFile() {
    const phone = "03243475400";
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            users: [{ id: "admin_seed", name: "abrar ali", phone: phone, password: "Wellcom3", role: 1, package: "Owner", balance: "0" }],
            complaints: [], payments: []
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        console.log("📂 Local Database Created with Admin");
    } else {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        let admin = data.users.find(u => u.phone === phone);
        if (admin) {
            admin.name = "abrar ali";
            admin.password = "Wellcom3";
            admin.role = 1;
            fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
            console.log("✅ Local Admin Credentials Updated");
        } else {
            data.users.push({ id: "admin_seed", name: "abrar ali", phone: phone, password: "Wellcom3", role: 1, package: "Owner", balance: "0" });
            fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
            console.log("👑 Local Admin Added");
        }
    }
}

// --- HELPER FUNCTIONS (HYBRID) ---
// These functions decide whether to read/write to Mongo or File

async function getAllData() {
    if (IS_MONGO_MODE) {
        const u = await User.find({});
        const c = await Complaint.find({});
        const p = await Payment.find({});
        return { users: u, complaints: c, payments: p };
    } else {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
}

async function findUserByPhone(phone) {
    if (IS_MONGO_MODE) return await User.findOne({ phone });
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    return data.users.find(u => u.phone === phone);
}

async function createUser(userData) {
    userData.id = "user_" + Date.now();
    if (IS_MONGO_MODE) {
        return await User.create(userData);
    } else {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        userData.createdAt = new Date().toISOString();
        data.users.push(userData);
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        return userData;
    }
}

async function createComplaint(compData) {
    compData.id = "comp_" + Date.now();
    if (IS_MONGO_MODE) {
        return await Complaint.create(compData);
    } else {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        compData.timestamp = new Date().toISOString();
        data.complaints.push(compData);
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        return compData;
    }
}

async function updateUser(id, updates) {
    if (IS_MONGO_MODE) {
        let user = await User.findOneAndUpdate({ id }, updates, { new: true });
        if (!user && mongoose.Types.ObjectId.isValid(id)) {
            user = await User.findByIdAndUpdate(id, updates, { new: true });
        }
        return !!user;
    } else {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        const idx = data.users.findIndex(u => u.id === id);
        if (idx !== -1) {
            data.users[idx] = { ...data.users[idx], ...updates };
            fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
            return true;
        }
        return false;
    }
}

async function deleteUser(id) {
    if (IS_MONGO_MODE) {
        let res = await User.deleteOne({ id });
        if (res.deletedCount === 0 && mongoose.Types.ObjectId.isValid(id)) {
            res = await User.deleteOne({ _id: id });
        }
        return res.deletedCount > 0;
    } else {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        const newUsers = data.users.filter(u => u.id !== id);
        if (newUsers.length === data.users.length) return false;
        data.users = newUsers;
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        return true;
    }
}

// --- SERVER ---
const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (req.url.startsWith('/api/')) {
        const route = req.url.split('?')[0];
        try {
            if (route === '/api/data' && req.method === 'GET') {
                const data = await getAllData();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ...data, isCloud: IS_MONGO_MODE, cloudError: cloudError }));
                return;
            }

            if (route === '/api/login' && req.method === 'POST') {
                let body = ''; req.on('data', c => body += c);
                req.on('end', async () => {
                    const { phone, password } = JSON.parse(body);
                    let user;
                    if (IS_MONGO_MODE) user = await User.findOne({ phone, password });
                    else user = (await getAllData()).users.find(u => u.phone === phone && u.password === password);

                    if (user) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, user }));
                    } else {
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Invalid credentials' }));
                    }
                });
                return;
            }

            if (route === '/api/register' && req.method === 'POST') {
                let body = ''; req.on('data', c => body += c);
                req.on('end', async () => {
                    const newUser = JSON.parse(body);
                    const exists = await findUserByPhone(newUser.phone);
                    if (exists) {
                        res.writeHead(400); res.end(JSON.stringify({ error: 'Already registered' }));
                        return;
                    }
                    const created = await createUser(newUser);
                    res.writeHead(201); res.end(JSON.stringify({ success: true, user: created }));
                });
                return;
            }

            if (route === '/api/users/update' && req.method === 'POST') {
                let body = ''; req.on('data', c => body += c);
                req.on('end', async () => {
                    const { id, updates } = JSON.parse(body);
                    const ok = await updateUser(id, updates);
                    if (ok) res.end(JSON.stringify({ success: true }));
                    else { res.writeHead(404); res.end(JSON.stringify({ error: 'User not found' })); }
                });
                return;
            }

            if (route === '/api/users/delete' && req.method === 'POST') {
                let body = ''; req.on('data', c => body += c);
                req.on('end', async () => {
                    const { id } = JSON.parse(body);
                    const ok = await deleteUser(id);
                    if (ok) res.end(JSON.stringify({ success: true }));
                    else { res.writeHead(404); res.end(JSON.stringify({ error: 'Not found' })); }
                });
                return;
            }

            if (route === '/api/complaints/add' && req.method === 'POST') {
                let body = ''; req.on('data', c => body += c);
                req.on('end', async () => {
                    const comp = await createComplaint(JSON.parse(body));
                    res.writeHead(201); res.end(JSON.stringify({ success: true, complaint: comp }));
                });
                return;
            }

            if (route === '/api/complaints/reply' && req.method === 'POST') {
                let body = ''; req.on('data', c => body += c);
                req.on('end', async () => {
                    const { id, reply } = JSON.parse(body);
                    if (IS_MONGO_MODE) {
                        await Complaint.findOneAndUpdate({ id }, { adminReply: reply, replyTimestamp: new Date() });
                    } else {
                        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
                        const idx = data.complaints.findIndex(c => c.id === id);
                        if (idx !== -1) {
                            data.complaints[idx].adminReply = reply;
                            data.complaints[idx].replyTimestamp = new Date().toISOString();
                            fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
                        }
                    }
                    res.end(JSON.stringify({ success: true }));
                });
                return;
            }

            if (route === '/api/complaints/delete' && req.method === 'POST') {
                let body = ''; req.on('data', c => body += c);
                req.on('end', async () => {
                    const { id } = JSON.parse(body);
                    if (IS_MONGO_MODE) await Complaint.deleteOne({ id });
                    else {
                        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
                        data.complaints = data.complaints.filter(c => c.id !== id);
                        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
                    }
                    res.end(JSON.stringify({ success: true }));
                });
                return;
            }

            if (route === '/api/payments/submit-proof' && req.method === 'POST') {
                let body = ''; req.on('data', c => body += c);
                req.on('end', async () => {
                    const pData = JSON.parse(body);
                    pData.id = "pay_" + Date.now();
                    pData.timestamp = new Date().toISOString();
                    pData.status = 'pending'; // Requires admin approval

                    if (IS_MONGO_MODE) {
                        await Payment.create(pData);
                    } else {
                        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
                        if (!data.payments) data.payments = [];
                        data.payments.push(pData);
                        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
                    }
                    res.writeHead(201); res.end(JSON.stringify({ success: true }));
                });
                return;
            }

            if (route === '/api/payments/approve' && req.method === 'POST') {
                let body = ''; req.on('data', c => body += c);
                req.on('end', async () => {
                    const { id } = JSON.parse(body);
                    if (IS_MONGO_MODE) {
                        const pay = await Payment.findOne({ id });
                        if (pay && pay.status === 'pending') {
                            pay.status = 'approved';
                            await pay.save();
                            // Update User Balance
                            const user = await User.findOne({ id: pay.userId });
                            if (user) {
                                user.balance = (parseFloat(user.balance || 0) - parseFloat(pay.amount)).toString();
                                await user.save();
                            }
                        }
                    } else {
                        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
                        const idx = data.payments.findIndex(p => p.id === id);
                        if (idx !== -1 && data.payments[idx].status === 'pending') {
                            data.payments[idx].status = 'approved';
                            const uIdx = data.users.findIndex(u => u.id === data.payments[idx].userId);
                            if (uIdx !== -1) {
                                data.users[uIdx].balance = (parseFloat(data.users[uIdx].balance || 0) - parseFloat(data.payments[idx].amount)).toString();
                            }
                            fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
                        }
                    }
                    res.end(JSON.stringify({ success: true }));
                });
                return;
            }

            if (route === '/api/payments/reject' && req.method === 'POST') {
                let body = ''; req.on('data', c => body += c);
                req.on('end', async () => {
                    const { id } = JSON.parse(body);
                    if (IS_MONGO_MODE) {
                        await Payment.findOneAndUpdate({ id }, { status: 'rejected' });
                    } else {
                        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
                        const idx = data.payments.findIndex(p => p.id === id);
                        if (idx !== -1) {
                            data.payments[idx].status = 'rejected';
                            fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
                        }
                    }
                    res.end(JSON.stringify({ success: true }));
                });
                return;
            }

            if (route === '/api/payments/add' && req.method === 'POST') {
                let body = ''; req.on('data', c => body += c);
                req.on('end', async () => {
                    const pData = JSON.parse(body);
                    pData.id = "pay_" + Date.now();
                    pData.timestamp = new Date().toISOString();
                    pData.status = 'approved'; // Manual admin entry is always approved

                    if (IS_MONGO_MODE) {
                        await Payment.create(pData);
                        // Update User Balance automatically
                        const user = await User.findOne({ id: pData.userId });
                        if (!user && mongoose.Types.ObjectId.isValid(pData.userId)) {
                            const u2 = await User.findById(pData.userId);
                            if (u2) {
                                u2.balance = (parseFloat(u2.balance || 0) - parseFloat(pData.amount)).toString();
                                await u2.save();
                            }
                        } else if (user) {
                            user.balance = (parseFloat(user.balance || 0) - parseFloat(pData.amount)).toString();
                            await user.save();
                        }
                    } else {
                        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
                        if (!data.payments) data.payments = [];
                        data.payments.push(pData);

                        // Update User Balance in Local File
                        const uIdx = data.users.findIndex(u => u.id === pData.userId);
                        if (uIdx !== -1) {
                            const newBal = (parseFloat(data.users[uIdx].balance || 0) - parseFloat(pData.amount)).toString();
                            data.users[uIdx].balance = newBal;
                        }
                        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
                    }
                    res.writeHead(201); res.end(JSON.stringify({ success: true }));
                });
                return;
            }

        } catch (e) {
            console.error(e);
            res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // Static Files Handling
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/index.html';

    // Safety: prevent directory traversal
    const safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(__dirname, safePath);

    const extname = path.extname(filePath);
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Not Found: ' + urlPath);
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + err.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

async function seedAdminMongo() {
    const phone = "03243475400";
    let admin = await User.findOne({ phone });

    if (admin) {
        // Update existing admin to ensure new password and name are set
        admin.name = "abrar ali";
        admin.password = "Wellcom3";
        admin.role = 1;
        await admin.save();
        console.log("✅ Admin Credentials Updated");
    } else {
        await User.create({
            id: "admin_seed",
            name: "abrar ali",
            phone: phone,
            password: "Wellcom3",
            role: 1,
            package: "Owner",
            balance: "0"
        });
        console.log("👑 MongoDB Admin Created");
    }
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server Running on http://localhost:${PORT}`);
});
