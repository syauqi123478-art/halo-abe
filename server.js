const path = require('path');
const dotenvResult = require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const express = require("express");
const cors = require("cors");
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
// const { createClient } = require("@supabase/supabase-js");
const User = require('./models/User');

// Read MONGO_URI early so session setup can reference it
const mongoUri = process.env.MONGO_URI;

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: false
}));
app.use(express.json());

// --------- Session setup (uses MongoDB sessions when available) ----------
const sessionSecret = process.env.SESSION_SECRET || 'please_change_this_secret';
let sessionOptions = {
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 14, httpOnly: true }
};

if (mongoUri) {
  sessionOptions.store = MongoStore.create({ mongoUrl: mongoUri, collectionName: 'sessions' });
} else {
  console.warn('Session store: using default MemoryStore (not recommended for production)');
}

app.use(session(sessionOptions));
// Simple request logger for debugging
app.use((req, res, next) => {
  const sid = req.session && req.session.userId ? String(req.session.userId).slice(0,6) : '-';
  console.log(new Date().toISOString(), req.method, req.path, 'sessionId=', sid);
  next();
});

// Serve static assets and login page BEFORE auth protection so they are publicly reachable
app.use(express.static(path.resolve(__dirname, '..', 'pages')));
app.use(express.static(path.resolve(__dirname, '..', 'public')));
app.use('/login', express.static(path.resolve(__dirname, '..', 'login')));

// Protect pages: allow login/register pages, public assets and API routes without auth
app.use((req, res, next) => {
  const p = req.path;
  if (p.startsWith('/login') || p.startsWith('/public') || p.startsWith('/api') || p.startsWith('/mongo-check') || p === '/favicon.ico') return next();
  if (!req.session || !req.session.userId) {
    return res.redirect('/login/login.html');
  }
  next();
});

// const supabaseUrl = "https://anyylsedulbqhtsxteej.supabase.co";
// const supabaseKey = "REDACTED-FOR-SAFETY"; // backend gunakan service role
// const supabase = createClient(supabaseUrl, supabaseKey);

// ---------- MongoDB via Mongoose ----------
const envPathUsed = dotenvResult && dotenvResult.parsed ? path.resolve(__dirname, '..', '.env') : '(default lookup)';
console.log('dotenv loaded from:', envPathUsed);
let mongoConnected = false;
if (mongoUri) {
  mongoose.connect(mongoUri, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
  })
    .then(() => {
      mongoConnected = true;
      console.log('MongoDB terhubung.');
    })
    .catch(err => {
      mongoConnected = false;
      console.warn('Gagal koneksi MongoDB (server tetap berjalan):', err.message);
    });
  mongoose.connection.on('error', (err) => {
    console.warn('MongoDB connection error:', err.message);
  });
} else {
  console.warn('MONGO_URI tidak ditemukan. Lewati koneksi MongoDB. Pastikan file .env ada di root proyek atau sesuaikan path.');
}

// Global error handlers to suppress crashes during development
process.on('unhandledRejection', (reason) => {
  console.warn('Unhandled Rejection (suppressed):', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.warn('Uncaught Exception (suppressed):', err.message);
});

// --------------------
// USER PROFILE INSERT
// --------------------
app.post("/save-profile", async (req, res) => {
  const { id, username } = req.body;

  if (!id || !username)
    return res.status(400).json({ error: "Data tidak lengkap" });

  const { data, error } = await supabase
    .from("profiles")
    .insert([{ id, username }])
    .select();

  if (error) return res.status(500).json({ error });

  res.json({ message: "Profile saved!", data });
});

// --------------------
// AUTH: register / login / logout
// --------------------
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    const exists = await User.findOne({ username: username.toLowerCase().trim() });
    if (exists) return res.status(409).json({ error: 'username already taken' });
    const hash = await bcrypt.hash(password, 10);
    const u = await User.create({ username: username.toLowerCase().trim(), password: hash });
    req.session.userId = u._id.toString();
    res.json({ message: 'registered', user: { id: u._id, username: u.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    const u = await User.findOne({ username: username.toLowerCase().trim() });
    if (!u) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, u.password);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    req.session.userId = u._id.toString();
    res.json({ message: 'logged in', user: { id: u._id, username: u.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('session destroy error', err);
    res.clearCookie('connect.sid');
    res.json({ message: 'logged out' });
  });
});

app.get('/api/me', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'not authenticated' });
  const u = await User.findById(req.session.userId).select('username createdAt');
  if (!u) return res.status(404).json({ error: 'user not found' });
  res.json({ id: u._id, username: u.username, createdAt: u.createdAt });
});

app.get("/profile/:id", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return res.status(500).json({ error });

  res.json(data);
});

app.listen(8080, () => console.log("Backend berjalan di http://localhost:8080"));
module.exports = app;

