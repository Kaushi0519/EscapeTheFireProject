const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '../data/users.json');
function readUsers() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}
function writeUsers(users) {
  fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}
function verifyPassword(password, stored) {
  if (!stored) return false;
  const [salt, hashHex] = stored.split(':');
  const derived = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(hashHex, 'hex'), derived);
}

const app = express();
const cors = require('cors');
app.use(cors());
app.use(bodyParser.json());

// Admin creates a user
app.post('/admin/users/create', (req, res) => {
  const { email, password, roles } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email_and_password_required' });
  const users = readUsers();
  const normalized = String(email).trim().toLowerCase();
  if (users.find(u => u.email === normalized)) return res.status(409).json({ error: 'email_exists' });
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2,8);
  const password_hash = hashPassword(password);
  const user = { id, email: normalized, password_hash, roles: roles || ['staff'], status: 'active', created_at: new Date().toISOString() };
  users.push(user);
  writeUsers(users);
  res.status(201).json({ id: user.id, email: user.email, roles: user.roles });
});

// Public login
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'missing' });
  const users = readUsers();
  const normalized = String(email).trim().toLowerCase();
  const u = users.find(x => x.email === normalized && x.status === 'active');
  if (!u) return res.status(401).json({ error: 'invalid_credentials' });
  if (!verifyPassword(password, u.password_hash)) return res.status(401).json({ error: 'invalid_credentials' });
  // issue a simple session token
  const token = crypto.randomBytes(24).toString('hex');
  // store token in-memory on the user (very simple)
  u.session = token;
  writeUsers(users);
  res.json({ token, user: { id: u.id, email: u.email, roles: u.roles } });
});

// Simple endpoint to check token
app.get('/auth/me', (req, res) => {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'no_auth' });
  const token = auth.replace(/^Bearer\s+/, '');
  const users = readUsers();
  const u = users.find(x => x.session === token);
  if (!u) return res.status(401).json({ error: 'invalid' });
  res.json({ id: u.id, email: u.email, roles: u.roles });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`server listening ${PORT}`));
