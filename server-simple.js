const path = require('path');
const dotenvResult = require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const express = require("express");
const cors = require("cors");
const session = require('express-session');
const bcrypt = require('bcryptjs');

// ===== Simplified User Store (in-memory for now) =====
const users = new Map();
const taskDB = new Map(); // Store: userId -> { tasks: [], completed: [] }

const app = express();

// Trust proxy for session cookies
app.set('trust proxy', 1);

app.use(cors({
  origin: "http://localhost:8080",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  allowedHeaders: ["Content-Type"],
  maxAge: 86400
}));
app.use(express.json());

// ===== Session Setup (in-memory store for dev) =====
const sessionSecret = process.env.SESSION_SECRET || 'dev_secret_key_change_in_production';
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: true, // CHANGED: true to ensure session created immediately
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days
    httpOnly: true,
    secure: false, // localhost tidak perlu https
    sameSite: 'lax',
    path: '/',
    domain: undefined // let browser auto-detect
  }
}));

// ===== Request Logger =====
app.use((req, res, next) => {
  const sid = req.session && req.session.userId ? String(req.session.userId).slice(0, 6) : '-';
  console.log(new Date().toISOString(), req.method, req.path, 'sessionId=', sid, 'cookie=' + (req.headers.cookie ? 'YES' : 'NO'));
  next();
});

// ===== Serve Static Assets BEFORE Auth =====
app.use(express.static(path.resolve(__dirname, '..', 'public')));
app.use('/login', express.static(path.resolve(__dirname, '..', 'login')));

// Don't cache pages - always check auth
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Protect pages under /pages — require authentication to view
const pagesDir = path.resolve(__dirname, '..', 'pages');
app.use('/pages', (req, res, next) => {
  // keep registration page public so a new user can sign up
  if (req.path === '/register.html') return next();
  // require auth for all other pages
  if (!req.session || !req.session.userId) {
    return res.redirect('/login/login.html');
  }
  next();
}, express.static(pagesDir));

// ===== API: Register =====
app.post('/api/register', async (req, res) => {
  try {
    nmodule.exports = app;
    napp.listen(8080, () => console.log('Backend berjalan di http://localhost:8080'));
  }); console.warn('Uncaught Exception:', err.message);});
nprocess.on('uncaughtException', (err) => {
  console.warn('Unhandled Rejection:', reason?.message || reason); process.on('unhandledRejection', (reason) => {
    n// ===== Error Handlers =====});  res.redirect('/pages/halo.html');app.get('/', (req, res) => {// ===== Redirect root to home (protected, will show login if not authed) =====});  });    task: completedTask    message: 'task completed',  res.json({     console.log('✓ Task completed:', completedTask.name);    userTasks.completed.push(completedTask);  userTasks.tasks.splice(taskIndex, 1);    completedTask.completedAt = new Date().toISOString();  const completedTask = userTasks.tasks[taskIndex];    }    return res.status(404).json({ error: 'task not found' });  if (taskIndex === -1) {    const taskIndex = userTasks.tasks.findIndex(t => t.id === taskId);  const userTasks = taskDB.get(userId);    }    return res.status(404).json({ error: 'tasks not found' });  if (!taskDB.has(userId)) {    const taskId = req.params.taskId;  const userId = req.session.userId;    }    return res.status(401).json({ error: 'not authenticated' });  if (!req.session || !req.session.userId) {app.post('/api/tugas/:taskId/complete', (req, res) => {// ===== API: Complete Task =====});  });    completed: userTasks.completed    tasks: userTasks.tasks,  res.json({    const userTasks = taskDB.get(userId) || { tasks: [], completed: [] };  const userId = req.session.userId;    }    return res.status(401).json({ error: 'not authenticated' });  if (!req.session || !req.session.userId) {app.get('/api/tugas', (req, res) => {// ===== API: Get User Tasks =====});  });    task     message: 'task added',   res.json({     console.log('✓ Task added for user', userId, ':', name);  userTasks.tasks.push(task);    };    createdAt: new Date().toISOString()    rating: Number(rating) || 0,    deadline,    mapel,    name,    id: taskId,  const task = {    const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);  const userTasks = taskDB.get(userId);    }    taskDB.set(userId, { tasks: [], completed: [] });  if (!taskDB.has(userId)) {  // Initialize user's task data if not exist    }    return res.status(400).json({ error: 'name, mapel, deadline required' });  if (!name || !mapel || !deadline) {    const { name, mapel, deadline, rating } = req.body;  const userId = req.session.userId;    }    return res.status(401).json({ error: 'not authenticated' });  if (!req.session || !req.session.userId) {app.post('/api/tugas', (req, res) => {// ===== API: Add Task =====});  res.status(404).json({ error: 'user not found' });  console.log('[/api/me] User not found in database');    }    }      return res.json({ id: user.userId, username: user.username, createdAt: user.createdAt });      console.log('[/api/me] User found:', user.username);    if (user.userId === req.session.userId) {  for (const user of users.values()) {    }    return res.status(401).json({ error: 'not authenticated' });    console.log('[/api/me] Not authenticated - no userId in session');  if (!req.session || !req.session.userId) {    console.log('[/api/me] Session check - userId:', req.session?.userId || 'NONE');app.get('/api/me', (req, res) => {// ===== API: Get Current User =====});  });    res.json({ message: 'logged out' });    res.clearCookie('connect.sid');    if (err) console.error('session destroy error', err);  req.session.destroy(err => {app.post('/api/logout', (req, res) => {// ===== API: Logout =====});  }    res.status(500).json({ error: 'internal error' });    console.error('Login error:', err);  } catch (err) {    });      res.json({ message: 'logged in', user: { id: user.userId, username: user.username } });      }        return res.status(500).json({ error: 'session error' });        console.error('Session save error on login:', err);      if (err) {    req.session.save((err) => {        console.log('✓ User logged in:', username, 'ID:', user.userId);    req.session.userId = user.userId;        if (!ok) return res.status(401).json({ error: 'invalid credentials' });    const ok = await bcrypt.compare(password, user.password);        if (!user) return res.status(401).json({ error: 'invalid credentials' });    const user = users.get(username.toLowerCase());        if (!username || !password) return res.status(400).json({ error: 'username and password required' });    const { username, password } = req.body;  try {app.post('/api/login', async (req, res) => {// ===== API: Login =====});  }    res.status(500).json({ error: err.message || 'internal error' });    console.error('❌ Register error:', err.message, err.stack);  } catch (err) {    });      });        user: { id: userId, username }         message: 'registered',       res.json({       }        return res.status(500).json({ error: 'session error' });        console.error('Session save error on register:', err);      if (err) {    req.session.save((err) => {        console.log('✓ User registered:', username, 'ID:', userId);    req.session.userId = userId;        });      createdAt: new Date()       password: hash,       username,       userId,     users.set(username.toLowerCase(), {         const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);    const hash = await bcrypt.hash(password, 10);    }
nr          return res.status(409).json({ error: 'username already taken' }); if (users.has(username.toLowerCase())) { }
nr          return res.status(400).json({ error: 'username and password required' }); if (!username || !password) {
      const { username, password } = req.body;
nr    n    console.log('Register attempt:', req.body);