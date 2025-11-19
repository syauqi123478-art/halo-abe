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
  const sid = req.session && req.session.userId ? String(req.session.userId).slice(0,6) : '-';
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
    console.log('Register attempt:', req.body);
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' });
    }
    
    if (users.has(username.toLowerCase())) {
      return res.status(409).json({ error: 'username already taken' });
    }
    
    const hash = await bcrypt.hash(password, 10);
    const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    
    users.set(username.toLowerCase(), { 
      userId, 
      username, 
      password: hash, 
      createdAt: new Date() 
    });
    
    req.session.userId = userId;
    console.log('✓ User registered:', username, 'ID:', userId);
    
    req.session.save((err) => {
      if (err) {
        console.error('Session save error on register:', err);
        return res.status(500).json({ error: 'session error' });
      }
      res.json({ 
        message: 'registered', 
        user: { id: userId, username } 
      });
    });
  } catch (err) {
    console.error('❌ Register error:', err.message, err.stack);
    res.status(500).json({ error: err.message || 'internal error' });
  }
});

// ===== API: Login =====
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    
    const user = users.get(username.toLowerCase());
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    
    req.session.userId = user.userId;
    console.log('✓ User logged in:', username, 'ID:', user.userId);
    
    req.session.save((err) => {
      if (err) {
        console.error('Session save error on login:', err);
        return res.status(500).json({ error: 'session error' });
      }
      res.json({ message: 'logged in', user: { id: user.userId, username: user.username } });
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// ===== API: Logout =====
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('session destroy error', err);
    res.clearCookie('connect.sid');
    res.json({ message: 'logged out' });
  });
});

// ===== API: Get Current User =====
app.get('/api/me', (req, res) => {
  console.log('[/api/me] Session check - userId:', req.session?.userId || 'NONE');
  
  if (!req.session || !req.session.userId) {
    console.log('[/api/me] Not authenticated - no userId in session');
    return res.status(401).json({ error: 'not authenticated' });
  }
  
  for (const user of users.values()) {
    if (user.userId === req.session.userId) {
      console.log('[/api/me] User found:', user.username);
      return res.json({ id: user.userId, username: user.username, createdAt: user.createdAt });
    }
  }
  
  console.log('[/api/me] User not found in database');
  res.status(404).json({ error: 'user not found' });
});

// ===== API: Add Task =====
app.post('/api/tugas', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'not authenticated' });
  }
  
  const userId = req.session.userId;
  const { name, mapel, deadline, rating } = req.body;
  
  if (!name || !mapel || !deadline) {
    return res.status(400).json({ error: 'name, mapel, deadline required' });
  }
  
  // Initialize user's task data if not exist
  if (!taskDB.has(userId)) {
    taskDB.set(userId, { tasks: [], completed: [] });
  }
  
  const userTasks = taskDB.get(userId);
  const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  
  const task = {
    id: taskId,
    name,
    mapel,
    deadline,
    rating: Number(rating) || 0,
    createdAt: new Date().toISOString()
  };
  
  userTasks.tasks.push(task);
  console.log('✓ Task added for user', userId, ':', name);
  
  res.json({ 
    message: 'task added', 
    task 
  });
});

// ===== API: Get User Tasks =====
app.get('/api/tugas', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'not authenticated' });
  }
  
  const userId = req.session.userId;
  const userTasks = taskDB.get(userId) || { tasks: [], completed: [] };
  
  res.json({
    tasks: userTasks.tasks,
    completed: userTasks.completed
  });
});

// ===== API: Complete Task =====
app.post('/api/tugas/:taskId/complete', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'not authenticated' });
  }
  
  const userId = req.session.userId;
  const taskId = req.params.taskId;
  
  if (!taskDB.has(userId)) {
    return res.status(404).json({ error: 'tasks not found' });
  }
  
  const userTasks = taskDB.get(userId);
  const taskIndex = userTasks.tasks.findIndex(t => t.id === taskId);
  
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'task not found' });
  }
  
  const completedTask = userTasks.tasks[taskIndex];
  completedTask.completedAt = new Date().toISOString();
  
  userTasks.tasks.splice(taskIndex, 1);
  userTasks.completed.push(completedTask);
  
  console.log('✓ Task completed:', completedTask.name);
  
  res.json({ 
    message: 'task completed',
    task: completedTask
  });
});

// ===== Redirect root to home (protected, will show login if not authed) =====
app.get('/', (req, res) => {
  res.redirect('/pages/halo.html');
});

// ===== Error Handlers =====
process.on('unhandledRejection', (reason) => {
  console.warn('Unhandled Rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.warn('Uncaught Exception:', err.message);
});

app.listen(8080, () => console.log('Backend berjalan di http://localhost:8080'));

module.exports = app;