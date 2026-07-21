const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
let Expo;
let expo;

// Initialize Expo client for sending push notifications
try {
  const expoModule = require('expo-server-sdk');
  Expo = expoModule.Expo || expoModule;
  expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
  console.log('[Expo] Expo SDK initialized successfully');
} catch (e) {
  console.error('[Expo] Failed to initialize Expo SDK:', e && e.message);
  console.error('[Expo] Push notifications will not work without Expo SDK');
  Expo = { isExpoPushToken: () => false };
  expo = null;
}

// Use a lightweight pure-JS embedded DB to avoid native build issues.
const nedb = require('nedb-promises');
const DB_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DB_DIR, 'users.db');

function openDb() {
  fs.mkdirSync(DB_DIR, { recursive: true });
  const users = nedb.create({ filename: DB_FILE, autoload: true });
  // ensure index on email
  users.ensureIndex({ fieldName: 'email', unique: true }).catch(() => {});
  return users;
}

const app = express();
const cors = require('cors');
app.post('/admin/bssid-map', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller || !Array.isArray(caller.roles) || !caller.roles.includes('admin')) {
    return res.status(403).json({ error: 'forbidden' });
  }
  const { bssid, room } = req.body;
  if (!bssid || !room) return res.status(400).json({ error: 'Missing bssid or room' });
  bssidRoomMap[bssid] = room;
  return res.json({ success: true });
});

// Endpoint to update user location by BSSID
app.post('/user/update-location', async (req, res) => {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'no_auth' });
  const token = auth.replace(/^Bearer\s+/, '');
  const user = await db.findOne({ session: token });
  if (!user) return res.status(401).json({ error: 'invalid_session' });
  const { bssid } = req.body;
  if (!bssid) return res.status(400).json({ error: 'Missing bssid' });
  const room = bssidRoomMap[bssid] || null;
  await db.update({ id: user.id }, { $set: { last_location: { bssid, room, updated: Date.now() } } });
  return res.json({ room });
});
app.use(cors());
app.use(express.json());

// Initialize DB (NeDB) and migrate JSON data
const db = openDb();
let bssidRoomMap = {};

// Create a separate NeDB for rosters
const rostersFile = path.join(DB_DIR, 'rosters.db');
const rosters = nedb.create({ filename: rostersFile, autoload: true });

// Create a NeDB for students
const studentsFile = path.join(DB_DIR, 'students.db');
const students = nedb.create({ filename: studentsFile, autoload: true });

// Create a NeDB for alerts
const alertsFile = path.join(DB_DIR, 'alerts.db');
const alerts = nedb.create({ filename: alertsFile, autoload: true });

// Create a NeDB for push tokens
const pushTokensFile = path.join(DB_DIR, 'push_tokens.db');
const pushTokens = nedb.create({ filename: pushTokensFile, autoload: true });

// Create a NeDB for active emergencies (confirmed alerts become emergencies)
const emergenciesFile = path.join(DB_DIR, 'emergencies.db');
const emergencies = nedb.create({ filename: emergenciesFile, autoload: true });

async function migrateRostersFromJson() {
  const jsonFile = path.join(__dirname, '../data/rosters.json');
  try {
    if (!fs.existsSync(jsonFile)) return;
    const raw = fs.readFileSync(jsonFile, 'utf8');
    const rows = JSON.parse(raw || '[]');
    for (const r of rows) {
      try {
        await rosters.insert(Object.assign({ created_at: new Date().toISOString() }, r));
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    console.warn('Migration of rosters from JSON failed', e && e.message);
  }
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  const [salt, hashHex] = stored.split(':');
  const derived = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(hashHex, 'hex'), derived);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}


function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

/**
 * Send emergency alert notifications to all registered users
 */
async function sendEmergencyNotifications(alert) {
  try {
    if (!expo) {
      console.error('[NOTIFICATION] Expo SDK not initialized, cannot send notifications');
      return;
    }

    console.log(`[NOTIFICATION] Starting to send notifications for alert ${alert.id}`);
    
    // Get all registered push tokens
    const allTokens = await pushTokens.find({});
    console.log(`[NOTIFICATION] Found ${allTokens ? allTokens.length : 0} registered push tokens`);
    
    if (!allTokens || allTokens.length === 0) {
      console.log('[NOTIFICATION] No push tokens registered, skipping notifications');
      return;
    }

    // Log all tokens and validate them
    allTokens.forEach((t, idx) => {
      const isValid = Expo.isExpoPushToken(t.token);
      console.log(`[NOTIFICATION] Token ${idx + 1}: ${t.email} - Token valid: ${isValid}`);
    });

    // Filter out invalid tokens
    const validTokens = allTokens
      .map(t => t.token)
      .filter(token => {
        if (!token || typeof token !== 'string') {
          console.log('[NOTIFICATION] Filtering out empty or non-string token');
          return false;
        }
        const isValid = Expo.isExpoPushToken(token);
        if (!isValid) {
          console.log(`[NOTIFICATION] Filtering out invalid token: ${token.substring(0, 20)}...`);
        }
        return isValid;
      });

    console.log(`[NOTIFICATION] Valid tokens after filtering: ${validTokens.length}`);

    if (validTokens.length === 0) {
      console.log('[NOTIFICATION] No valid push tokens found');
      return;
    }

    // Send notifications in chunks (Expo has rate limits)
    const chunks = [];
    const chunkSize = 100;
    for (let i = 0; i < validTokens.length; i += chunkSize) {
      chunks.push(validTokens.slice(i, i + chunkSize));
    }

    console.log(`[NOTIFICATION] Sending notifications in ${chunks.length} chunk(s)`);

    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      const chunk = chunks[chunkIdx];
      const messages = chunk.map(token => ({
        to: token,
        sound: 'default',
        title: 'Emergency Alert Confirmed',
        body: `Location: ${alert.location || 'Unknown'} | Type: ${alert.type || 'Unknown'}`,
        data: { 
          alertType: alert.type,
          alertLocation: alert.location,
          confirmedAt: new Date().toISOString()
        },
        ttl: 24 * 60 * 60,
        priority: 'high',
        badge: 1,
        channelId: 'emergency-alerts',
        vibrate: [0, 250, 250, 250],
      }));

      try {
        console.log(`[NOTIFICATION] Chunk ${chunkIdx + 1}: Sending ${messages.length} messages to Expo...`);
        const tickets = await expo.sendPushNotificationsAsync(messages);
        console.log(`[NOTIFICATION] Chunk ${chunkIdx + 1}: Sent ${tickets.length} notifications for alert ${alert.id}`);
        
        // Log results for each ticket
        let successCount = 0;
        let errorCount = 0;
        tickets.forEach((ticket, idx) => {
          if (ticket.status === 'ok') {
            successCount++;
            console.log(`[NOTIFICATION] ✓ Message ${idx + 1} sent: ID ${ticket.id}`);
          } else if (ticket.status === 'error') {
            errorCount++;
            console.error(`[NOTIFICATION] ✗ Message ${idx + 1} error: ${ticket.message} - ${ticket.details ? JSON.stringify(ticket.details) : ''}`);
          }
        });
        console.log(`[NOTIFICATION] Chunk ${chunkIdx + 1}: ${successCount} sent, ${errorCount} failed`);
      } catch (e) {
        console.error(`[NOTIFICATION] Chunk ${chunkIdx + 1}: Error sending push notifications: ${e && e.message}`);
        if (e.stack) {
          console.error(`[NOTIFICATION] Stack trace: ${e.stack}`);
        }
      }
    }
    console.log(`[NOTIFICATION] Finished sending notifications for alert ${alert.id}`);
  } catch (e) {
    console.error(`[NOTIFICATION] Failed to send emergency notifications: ${e && e.message}`);
    if (e.stack) {
      console.error(`[NOTIFICATION] Stack trace: ${e.stack}`);
    }
  }
}

/**
 * Send alert notifications to admin users only (when a new alert is created)
 */
async function sendAdminNotifications(alert) {
  try {
    if (!expo) {
      console.error('[NOTIFICATION] Expo SDK not initialized, cannot send admin notifications');
      return;
    }

    console.log(`[NOTIFICATION] Sending admin notifications for new alert ${alert.id}`);
    
    // Get all users and filter for admins
    const allUsers = await db.find({});
    const admins = allUsers.filter(u => u.roles && Array.isArray(u.roles) && u.roles.includes('admin'));
    
    if (admins.length === 0) {
      console.log('[NOTIFICATION] No admin users found');
      return;
    }
    
    console.log(`[NOTIFICATION] Found ${admins.length} admin users`);
    
    // Get push tokens for admin users
    const adminIds = admins.map(a => a.id);
    const allTokens = await pushTokens.find({});
    const adminTokens = allTokens.filter(t => adminIds.includes(t.userId) || (t.roles && t.roles.includes('admin')));
    
    if (adminTokens.length === 0) {
      console.log('[NOTIFICATION] No admin push tokens found');
      return;
    }

    const validTokens = adminTokens
      .map(t => t.token)
      .filter(token => token && Expo.isExpoPushToken(token));

    console.log(`[NOTIFICATION] Found ${validTokens.length} valid admin push tokens`);

    if (validTokens.length === 0) return;

    const messages = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title: 'New Emergency Alert',
      body: `Location: ${alert.location || 'Unknown'} | Type: ${alert.type || 'Unknown'} - Please review and confirm`,
      data: { 
        alertType: alert.type,
        alertLocation: alert.location,
        alertId: alert.id,
        createdAt: alert.created_at
      },
      ttl: 24 * 60 * 60,
      priority: 'high',
      badge: 1,
      channelId: 'emergency-alerts',
      vibrate: [0, 250, 250, 250],
    }));

    try {
      const tickets = await expo.sendPushNotificationsAsync(messages);
      console.log(`[NOTIFICATION] Sent ${tickets.length} admin notifications for alert ${alert.id}`);
      tickets.forEach((ticket, idx) => {
        if (ticket.status === 'ok') {
          console.log(`[NOTIFICATION] ✓ Admin message ${idx + 1} sent: ID ${ticket.id}`);
        } else {
          console.error(`[NOTIFICATION] ✗ Admin message ${idx + 1} error: ${ticket.message}`);
        }
      });
    } catch (e) {
      console.error(`[NOTIFICATION] Error sending admin notifications: ${e && e.message}`);
    }
  } catch (e) {
    console.error(`[NOTIFICATION] Failed to send admin notifications: ${e && e.message}`);
  }
}

// Admin creates a user
// Admin creates a user
app.post('/admin/users/create', async (req, res) => {
  const { email, password, roles, imageUrl } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email_and_password_required' });
  const normalized = String(email).trim().toLowerCase();
  try {
    const existing = await db.findOne({ email: normalized });
    if (existing) return res.status(409).json({ error: 'email_exists' });
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const password_hash = hashPassword(password);
    const doc = {
      id,
      email: normalized,
      password_hash,
      roles: roles || ['staff'],
      status: 'active',
      created_at: new Date().toISOString(),
      session: null,
      imageUrl: imageUrl || null,
    };
    await db.insert(doc);
    res.status(201).json({ id, email: normalized, roles: doc.roles, imageUrl: doc.imageUrl });
  } catch (e) {
    console.error('Create user failed', e);
    console.error('Error details:', e && e.message, e && e.stack);
    return res.status(500).json({ error: 'create_failed', details: e && e.message });
  }
});

// Public login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'missing' });
  const normalized = String(email).trim().toLowerCase();
  const row = await db.findOne({ email: normalized, status: 'active' });
  if (!row) return res.status(401).json({ error: 'invalid_credentials' });
  if (!verifyPassword(password, row.password_hash)) return res.status(401).json({ error: 'invalid_credentials' });
  const token = crypto.randomBytes(24).toString('hex');
  await db.update({ id: row.id }, { $set: { session: token } });
  res.json({ token, user: { id: row.id, email: row.email, roles: row.roles } });
});

// Simple endpoint to check token
app.get('/auth/me', async (req, res) => {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'no_auth' });
  const token = auth.replace(/^Bearer\s+/, '');
  const row = await db.findOne({ session: token });
  if (!row) return res.status(401).json({ error: 'invalid' });
  res.json({ id: row.id, email: row.email, roles: row.roles });
});

// Admin deletes a user by id
async function userFromToken(req) {
  const auth = req.headers && req.headers['authorization'];
  if (!auth) return null;
  const token = String(auth).replace(/^Bearer\s+/, '');
  try {
    const u = await db.findOne({ session: token });
    return u || null;
  } catch (e) { return null; }
}

// Admin: Update a user (edit staff account)
app.patch('/admin/users/:id', async (req, res) => {
  const { id } = req.params || {};
  if (!id) return res.status(400).json({ error: 'missing_id' });
  const caller = await userFromToken(req);
  if (!caller || !Array.isArray(caller.roles) || !caller.roles.includes('admin')) {
    return res.status(403).json({ error: 'forbidden' });
  }
  try {
    const user = await db.findOne({ id });
    if (!user) return res.status(404).json({ error: 'not_found' });
    
    const { email, password, roles, imageUrl } = req.body || {};
    const patch = {};
    
    if (email && email !== user.email) {
      const normalized = String(email).trim().toLowerCase();
      const existing = await db.findOne({ email: normalized });
      if (existing && existing.id !== id) {
        return res.status(409).json({ error: 'email_exists' });
      }
      patch.email = normalized;
    }
    if (password) {
      patch.password_hash = hashPassword(password);
    }
    if (roles && Array.isArray(roles)) {
      patch.roles = roles;
    }
    if (typeof imageUrl !== 'undefined') {
      patch.imageUrl = imageUrl || null;
    }
    
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'no_changes' });
    }
    
    await db.update({ id }, { $set: patch }, { multi: false });
    const updated = await db.findOne({ id });
    res.json({ id: updated.id, email: updated.email, roles: updated.roles, imageUrl: updated.imageUrl || null });
  } catch (e) {
    console.error('Update user failed', e && e.message);
    res.status(500).json({ error: 'update_failed' });
  }
});

// Admin: Reset user password (for forgot password)
app.post('/admin/users/:id/reset-password', async (req, res) => {
  const { id } = req.params || {};
  if (!id) return res.status(400).json({ error: 'missing_id' });
  const caller = await userFromToken(req);
  if (!caller || !Array.isArray(caller.roles) || !caller.roles.includes('admin')) {
    return res.status(403).json({ error: 'forbidden' });
  }
  try {
    const user = await db.findOne({ id });
    if (!user) return res.status(404).json({ error: 'not_found' });
    
    const { newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'password_too_short' });
    }
    
    const password_hash = hashPassword(newPassword);
    await db.update({ id }, { $set: { password_hash, session: null } }, { multi: false });
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (e) {
    console.error('Reset password failed', e && e.message);
    res.status(500).json({ error: 'reset_failed' });
  }
});

app.delete('/admin/users/:id', async (req, res) => {
  const { id } = req.params || {};
  if (!id) return res.status(400).json({ error: 'missing_id' });
  const caller = await userFromToken(req);
  if (!caller || !Array.isArray(caller.roles) || !caller.roles.includes('admin')) {
    return res.status(403).json({ error: 'forbidden' });
  }
  // Prevent deleting the last admin account
  const targetUser = await db.findOne({ id });
  if (targetUser && Array.isArray(targetUser.roles) && targetUser.roles.includes('admin')) {
    const allUsers = await db.find({});
    const adminCount = allUsers.filter(u => Array.isArray(u.roles) && u.roles.includes('admin')).length;
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'cannot_delete_last_admin', message: 'Cannot delete the last admin account' });
    }
  }
  const info = await db.remove({ id }, { multi: false });
  if (!info || info === 0) return res.status(404).json({ error: 'not_found' });
  try {
    // clear any roster assignments that referenced this user
    const allR = await rosters.find({});
    for (const r of allR) {
      if (r.assignedTo === id) {
        await rosters.update({ id: r.id || r._id }, { $set: { assignedTo: null } }, { multi: false });
      }
    }
    // compact datafiles to ensure hard removal
    try { await db.persistence.compactDatafile(); } catch (e) { /* ignore */ }
    try { await rosters.persistence.compactDatafile(); } catch (e) { /* ignore */ }
  } catch (e) {
    console.warn('Post-delete cleanup failed', e && e.message);
  }
  res.status(204).send();
});

// Admin list users (simple listing for admin UI)
app.get('/admin/users', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller || !Array.isArray(caller.roles) || !caller.roles.includes('admin')) {
    return res.status(403).json({ error: 'forbidden' });
  }
  try {
    const rows = await db.find({});
    // return limited fields
    const out = rows.map(r => ({ id: r.id, email: r.email, roles: r.roles, status: r.status, imageUrl: r.imageUrl || null }));
    res.json(out);
  } catch (e) {
    console.error('List users failed', e && e.message);
    res.status(500).json({ error: 'list_failed' });
  }
});

// Get all users with their current locations (any authenticated user can view)
app.get('/users/locations', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller) return res.status(401).json({ error: 'no_auth' });
  try {
    const rows = await db.find({});
    // include email, roles, and current location info
    const out = rows.map(r => ({
      id: r.id,
      email: r.email,
      roles: r.roles,
      status: r.status,
      lastLocation: r.last_location || null,
      imageUrl: r.imageUrl || null
    }));
    res.json(out);
  } catch (e) {
    console.error('Get user locations failed', e && e.message);
    res.status(500).json({ error: 'get_failed' });
  }
});

// Rosters endpoints
// Get "All Clear" status - checks if all rosters have all students and staff accounted
app.get('/rosters/all-clear', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller) return res.status(401).json({ error: 'no_auth' });
  try {
    const rows = await rosters.find({});
    let allClear = true;
    let totalRosters = rows.length;
    let accountedRosters = 0;
    const rosterStatuses = [];

    for (const r of rows) {
      const students = r.students || [];
      const totalStudents = students.length;
      const accountedStudents = students.filter(s => s.accounted === true).length;
      const staffAccounted = r.staffAccounted === true;
      const hasStaff = !!r.assignedTo;
      
      // A roster is "clear" if all students are accounted AND (no staff assigned OR staff is accounted)
      const rosterClear = (totalStudents === accountedStudents) && (!hasStaff || staffAccounted);
      
      if (rosterClear) {
        accountedRosters++;
      } else {
        allClear = false;
      }

      rosterStatuses.push({
        id: r.id,
        name: r.name,
        clear: rosterClear,
        totalStudents,
        accountedStudents,
        hasStaff,
        staffAccounted
      });
    }

    res.json({
      allClear,
      totalRosters,
      accountedRosters,
      rosterStatuses
    });
  } catch (e) {
    console.error('All clear check failed', e && e.message);
    res.status(500).json({ error: 'check_failed' });
  }
});

// List rosters (requires auth)
app.get('/rosters', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller) return res.status(401).json({ error: 'no_auth' });
  try {
    const rows = await rosters.find({});
    // return id, name, assignedTo and assignedToEmail if possible
    const out = [];
    for (const r of rows) {
      let assignedEmail = null;
      if (r.assignedTo) {
        const u = await db.findOne({ id: r.assignedTo });
        if (u) assignedEmail = u.email;
      }
      out.push({ id: r.id || r._id, name: r.name, assignedTo: r.assignedTo || null, assignedToEmail: assignedEmail, created_at: r.created_at, staffAccounted: r.staffAccounted || false });
    }
    res.json(out);
  } catch (e) {
    console.error('List rosters failed', e && e.message);
    res.status(500).json({ error: 'list_failed' });
  }
});

// Create a roster (admin only)
app.post('/rosters', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller || !Array.isArray(caller.roles) || !caller.roles.includes('admin')) return res.status(403).json({ error: 'forbidden' });
  const { name, assignedToEmail } = req.body || {};
  if (!name) return res.status(400).json({ error: 'missing_name' });
  try {
    const id = makeId();
    const doc = { id, name: String(name).trim(), students: [], created_at: new Date().toISOString(), assignedTo: null };
    if (assignedToEmail) {
      const staff = await db.findOne({ email: String(assignedToEmail).trim().toLowerCase(), status: 'active' });
      if (staff) doc.assignedTo = staff.id;
    }
    await rosters.insert(doc);
    res.status(201).json({ id: doc.id, name: doc.name, assignedTo: doc.assignedTo });
  } catch (e) {
    console.error('Create roster failed', e && e.message);
    res.status(500).json({ error: 'create_failed' });
  }
});

// Get roster by id
app.get('/rosters/:id', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller) return res.status(401).json({ error: 'no_auth' });
  const { id } = req.params || {};
  try {
    const r = await rosters.findOne({ id });
    if (!r) return res.status(404).json({ error: 'not_found' });
    // allow any authenticated user to view a roster (staff can view other classes)
    let assignedEmail = null;
    let staffImageUrl = null;
    if (r.assignedTo) {
      const u = await db.findOne({ id: r.assignedTo });
      if (u) {
        assignedEmail = u.email;
        staffImageUrl = u.imageUrl || null;
      }
    }
    res.json({ id: r.id || r._id, name: r.name, students: r.students || [], assignedTo: r.assignedTo || null, assignedToEmail: assignedEmail, staffImageUrl: staffImageUrl, created_at: r.created_at, staffAccounted: r.staffAccounted || false });
  } catch (e) {
    console.error('Get roster failed', e && e.message);
    res.status(500).json({ error: 'get_failed' });
  }
});

// Add a student to a roster (requires auth)
app.post('/rosters/:id/students', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller) return res.status(401).json({ error: 'no_auth' });
  const { id } = req.params || {};
  const { name, imageUrl } = req.body || {};
  if (!name) return res.status(400).json({ error: 'missing_name' });
  try {
    const roster = await rosters.findOne({ id });
    if (!roster) return res.status(404).json({ error: 'not_found' });
    // allow staff only for their assigned roster
    if (!Array.isArray(caller.roles) || !caller.roles.includes('admin')) {
      if (roster.assignedTo !== caller.id) return res.status(403).json({ error: 'forbidden' });
    }
    const sid = makeId();
    const student = { id: sid, name: String(name), imageUrl: imageUrl || null, accounted: false };
    const info = await rosters.update({ id }, { $push: { students: student } }, { multi: false });
    if (!info || info === 0) return res.status(404).json({ error: 'not_found' });
    res.status(201).json(student);
  } catch (e) {
    console.error('Add student failed', e && e.message);
    res.status(500).json({ error: 'add_failed' });
  }
});

// Create a student (persist to students.db). Optionally add to a roster via rosterId
app.post('/students', async (req, res) => {
  try {
    const caller = await userFromToken(req);
    if (!caller) return res.status(401).json({ error: 'no_auth' });
    const { firstName, lastName, imageUrl, rosterId } = req.body || {};
    if (!firstName || !lastName) return res.status(400).json({ error: 'missing_name' });
    const sid = makeId();
    const student = { id: sid, firstName: String(firstName), lastName: String(lastName), imageUrl: imageUrl || null, accounted: false, created_at: new Date().toISOString() };
    await students.insert(student);
    // if rosterId provided, try to push into roster.students as well
    if (rosterId) {
      try {
        const roster = await rosters.findOne({ id: rosterId });
        if (roster) {
          const studentForRoster = { id: student.id, name: `${student.firstName} ${student.lastName}`, imageUrl: student.imageUrl, accounted: false };
          await rosters.update({ id: rosterId }, { $push: { students: studentForRoster } }, { multi: false });
        }
      } catch (e) {
        console.warn('failed to add student to roster', e && e.message);
      }
    }
    res.status(201).json(student);
  } catch (e) {
    console.error('Create student failed', e && e.message);
    res.status(500).json({ error: 'create_failed' });
  }
});

// List students (requires auth)
app.get('/students', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller) return res.status(401).json({ error: 'no_auth' });
  try {
    const rows = await students.find({});
    // normalize minimal fields
    const out = (rows || []).map(s => ({ id: s.id, firstName: s.firstName, lastName: s.lastName, imageUrl: s.imageUrl }));
    res.json(out);
  } catch (e) {
    console.error('List students failed', e && e.message);
    res.status(500).json({ error: 'list_failed' });
  }
});

// Update a student (admin only)
app.patch('/students/:id', async (req, res) => {
  const { id } = req.params || {};
  if (!id) return res.status(400).json({ error: 'missing_id' });
  const caller = await userFromToken(req);
  if (!caller || !Array.isArray(caller.roles) || !caller.roles.includes('admin')) {
    return res.status(403).json({ error: 'forbidden' });
  }
  try {
    const student = await students.findOne({ id });
    if (!student) return res.status(404).json({ error: 'not_found' });
    
    const { firstName, lastName, imageUrl } = req.body || {};
    const patch = {};
    
    if (firstName) patch.firstName = String(firstName).trim();
    if (lastName) patch.lastName = String(lastName).trim();
    if (typeof imageUrl !== 'undefined') patch.imageUrl = imageUrl || null;
    
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'no_changes' });
    }
    
    await students.update({ id }, { $set: patch }, { multi: false });
    const updated = await students.findOne({ id });
    
    // Also update in any rosters that have this student
    const newName = `${updated.firstName} ${updated.lastName}`;
    const allRosters = await rosters.find({});
    for (const r of allRosters) {
      const rosterStudents = r.students || [];
      let changed = false;
      for (let i = 0; i < rosterStudents.length; i++) {
        if (rosterStudents[i].id === id) {
          rosterStudents[i].name = newName;
          if (typeof imageUrl !== 'undefined') rosterStudents[i].imageUrl = updated.imageUrl;
          changed = true;
        }
      }
      if (changed) {
        await rosters.update({ id: r.id }, { $set: { students: rosterStudents } }, { multi: false });
      }
    }
    
    res.json({ id: updated.id, firstName: updated.firstName, lastName: updated.lastName, imageUrl: updated.imageUrl });
  } catch (e) {
    console.error('Update student failed', e && e.message);
    res.status(500).json({ error: 'update_failed' });
  }
});

// Delete a student (admin only)
app.delete('/students/:id', async (req, res) => {
  const { id } = req.params || {};
  if (!id) return res.status(400).json({ error: 'missing_id' });
  const caller = await userFromToken(req);
  if (!caller || !Array.isArray(caller.roles) || !caller.roles.includes('admin')) {
    return res.status(403).json({ error: 'forbidden' });
  }
  try {
    // remove from students DB
    const info = await students.remove({ id }, { multi: false });
    if (!info || info === 0) return res.status(404).json({ error: 'not_found' });
    // remove from any rosters that reference this student id
    const allRosters = await rosters.find({});
    for (const r of allRosters) {
      const orig = r.students || [];
      const filtered = orig.filter(s => s.id !== id);
      if (filtered.length !== orig.length) {
        await rosters.update({ id: r.id || r._id }, { $set: { students: filtered } }, { multi: false });
      }
    }
    // compact datafiles to ensure hard removal
    try { await students.persistence.compactDatafile(); } catch (e) { /* ignore */ }
    try { await rosters.persistence.compactDatafile(); } catch (e) { /* ignore */ }
    res.status(204).send();
  } catch (e) {
    console.error('Delete student failed', e && e.message);
    res.status(500).json({ error: 'delete_failed' });
  }
});

// Update a student (toggle accounted or update name/image)
app.put('/rosters/:id/students/:sid', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller) return res.status(401).json({ error: 'no_auth' });
  const { id, sid } = req.params || {};
  const { accounted, name, imageUrl } = req.body || {};
  try {
    const roster = await rosters.findOne({ id });
    if (!roster) return res.status(404).json({ error: 'not_found' });
    // allow admin full edit; assigned staff full edit; other staff may only toggle 'accounted'
    const amAdmin = Array.isArray(caller.roles) && caller.roles.includes('admin');
    const amAssigned = roster.assignedTo === caller.id;
    if (!amAdmin && !amAssigned) {
      // non-assigned staff: only allow a single-field update for 'accounted'
      const keys = Object.keys(req.body || {});
      const onlyAccounted = keys.length === 1 && typeof accounted !== 'undefined';
      if (!onlyAccounted) return res.status(403).json({ error: 'forbidden' });
    }
    const students = roster.students || [];
    const idx = students.findIndex(s => s.id === sid);
    if (idx === -1) return res.status(404).json({ error: 'student_not_found' });
    
    // Get the student name for syncing across rosters
    const studentName = students[idx].name;
    
    // update fields
    if (typeof accounted !== 'undefined') students[idx].accounted = !!accounted;
    if (typeof name !== 'undefined') students[idx].name = String(name);
    if (typeof imageUrl !== 'undefined') students[idx].imageUrl = imageUrl;
    await rosters.update({ id }, { $set: { students } }, { multi: false });
    
    // Sync accounted status across all other rosters with the same student name
    if (typeof accounted !== 'undefined') {
      const allRosters = await rosters.find({});
      for (const r of allRosters) {
        if (r.id === id) continue; // skip current roster
        const rosterStudents = r.students || [];
        let updated = false;
        for (let i = 0; i < rosterStudents.length; i++) {
          if (rosterStudents[i].name === studentName) {
            rosterStudents[i].accounted = !!accounted;
            updated = true;
          }
        }
        if (updated) {
          await rosters.update({ id: r.id }, { $set: { students: rosterStudents } }, { multi: false });
        }
      }
    }
    
    res.json(students[idx]);
  } catch (e) {
    console.error('Update student failed', e && e.message);
    res.status(500).json({ error: 'update_failed' });
  }
});

// Remove a student from a roster (admin or assigned staff)
app.delete('/rosters/:id/students/:sid', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller) return res.status(401).json({ error: 'no_auth' });
  const { id, sid } = req.params || {};
  try {
    const roster = await rosters.findOne({ id });
    if (!roster) return res.status(404).json({ error: 'not_found' });
    const amAdmin = Array.isArray(caller.roles) && caller.roles.includes('admin');
    const amAssigned = roster.assignedTo === caller.id;
    if (!amAdmin && !amAssigned) return res.status(403).json({ error: 'forbidden' });
    const studentsArr = roster.students || [];
    const idx = studentsArr.findIndex(s => s.id === sid);
    if (idx === -1) return res.status(404).json({ error: 'student_not_found' });
    const newStudents = studentsArr.filter(s => s.id !== sid);
    await rosters.update({ id }, { $set: { students: newStudents } }, { multi: false });
    res.status(204).send();
  } catch (e) {
    console.error('Remove student failed', e && e.message);
    res.status(500).json({ error: 'remove_failed' });
  }
});

// Assign a roster to a staff member (admin only)
app.post('/rosters/:id/assign', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller || !Array.isArray(caller.roles) || !caller.roles.includes('admin')) return res.status(403).json({ error: 'forbidden' });
  const { id } = req.params || {};
  const { staffId, staffEmail, clear } = req.body || {};
  // support clearing assignment when clear=true
  if (!clear && !staffId && !staffEmail) return res.status(400).json({ error: 'missing_staff' });
  try {
    const roster = await rosters.findOne({ id });
    if (!roster) return res.status(404).json({ error: 'not_found' });
    if (clear) {
      await rosters.update({ id }, { $set: { assignedTo: null } }, { multi: false });
      res.json({ id: roster.id, assignedTo: null, assignedToEmail: null });
      return;
    }
    let staff = null;
    if (staffId) staff = await db.findOne({ id: staffId, status: 'active' });
    if (!staff && staffEmail) staff = await db.findOne({ email: String(staffEmail).trim().toLowerCase(), status: 'active' });
    if (!staff) return res.status(404).json({ error: 'staff_not_found' });
    await rosters.update({ id }, { $set: { assignedTo: staff.id } }, { multi: false });
    res.json({ id: roster.id, assignedTo: staff.id, assignedToEmail: staff.email });
  } catch (e) {
    console.error('Assign roster failed', e && e.message);
    res.status(500).json({ error: 'assign_failed' });
  }
});

// Update roster properties (staffAccounted, etc.)
// When staffAccounted changes, update ALL rosters with the same assigned staff member
app.patch('/rosters/:id', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller) return res.status(401).json({ error: 'no_auth' });
  const { id } = req.params || {};
  if (!id) return res.status(400).json({ error: 'missing_id' });
  try {
    const roster = await rosters.findOne({ id });
    if (!roster) return res.status(404).json({ error: 'not_found' });
    // Check permission: admin or assigned staff
    const isAdmin = Array.isArray(caller.roles) && caller.roles.includes('admin');
    const isAssigned = roster.assignedTo === caller.id;
    if (!isAdmin && !isAssigned) return res.status(403).json({ error: 'forbidden' });
    
    const { staffAccounted } = req.body || {};
    const patch = {};
    if (typeof staffAccounted === 'boolean') patch.staffAccounted = staffAccounted;
    
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'no_changes' });
    
    // If staffAccounted is being updated and roster has assigned staff,
    // update ALL rosters with the same assigned staff member
    if (typeof staffAccounted === 'boolean' && roster.assignedTo) {
      await rosters.update(
        { assignedTo: roster.assignedTo },
        { $set: { staffAccounted } },
        { multi: true }
      );
      console.log(`[ROSTER] Updated staffAccounted=${staffAccounted} for all rosters with staff ${roster.assignedTo}`);
    } else {
      await rosters.update({ id }, { $set: patch }, { multi: false });
    }
    
    const updated = await rosters.findOne({ id });
    res.json(updated);
  } catch (e) {
    console.error('Update roster failed', e && e.message);
    res.status(500).json({ error: 'update_failed' });
  }
});

// Delete a roster (admin only)
app.delete('/rosters/:id', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller || !Array.isArray(caller.roles) || !caller.roles.includes('admin')) return res.status(403).json({ error: 'forbidden' });
  const { id } = req.params || {};
  if (!id) return res.status(400).json({ error: 'missing_id' });
  try {
    const info = await rosters.remove({ id }, { multi: false });
    if (!info || info === 0) return res.status(404).json({ error: 'not_found' });
    try { await rosters.persistence.compactDatafile(); } catch (e) { /* ignore */ }
    res.status(204).send();
  } catch (e) {
    console.error('Delete roster failed', e && e.message);
    res.status(500).json({ error: 'delete_failed' });
  }
});

// Push token registration endpoint
app.post('/user/register-push-token', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller) return res.status(401).json({ error: 'no_auth' });
  const { pushToken } = req.body || {};
  console.log(`[PUSH_TOKEN] Registering token for user: ${caller.email}`);
  console.log(`[PUSH_TOKEN] Token received: ${pushToken ? pushToken.substring(0, 30) + '...' : 'MISSING'}`);
  
  if (!pushToken) {
    console.error('[PUSH_TOKEN] Error: Missing push token in request body');
    return res.status(400).json({ error: 'missing_push_token' });
  }
  
  try {
    // Check if this user already has a token registered
    const existing = await pushTokens.findOne({ userId: caller.id });
    if (existing) {
      // Update existing token and roles
      console.log(`[PUSH_TOKEN] Updating existing token for user ${caller.email}`);
      await pushTokens.update({ userId: caller.id }, { $set: { 
        token: pushToken, 
        roles: caller.roles || [],
        updated_at: new Date().toISOString() 
      }});
    } else {
      // Insert new token with roles
      console.log(`[PUSH_TOKEN] Inserting new token for user ${caller.email}`);
      await pushTokens.insert({
        userId: caller.id,
        email: caller.email,
        token: pushToken,
        roles: caller.roles || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    console.log(`[PUSH_TOKEN] Successfully registered push token for ${caller.email}`);
    res.json({ success: true, message: 'Push token registered successfully' });
  } catch (e) {
    console.error(`[PUSH_TOKEN] Error registering push token: ${e && e.message}`);
    res.status(500).json({ error: 'register_failed', message: e && e.message });
  }
});

// Debug endpoint: List all registered push tokens (admin only)
app.get('/admin/push-tokens', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller || !Array.isArray(caller.roles) || !caller.roles.includes('admin')) {
    return res.status(403).json({ error: 'forbidden' });
  }
  try {
    const allTokens = await pushTokens.find({});
    console.log(`[DEBUG] Admin ${caller.email} requested push tokens list: ${allTokens.length} tokens found`);
    const tokenList = allTokens.map(t => ({
      userId: t.userId,
      email: t.email,
      token: t.token.substring(0, 30) + '...',
      isValid: Expo.isExpoPushToken(t.token),
      created_at: t.created_at,
      updated_at: t.updated_at
    }));
    res.json({ total: allTokens.length, tokens: tokenList });
  } catch (e) {
    console.error(`[DEBUG] Error listing push tokens: ${e && e.message}`);
    res.status(500).json({ error: 'list_failed', message: e && e.message });
  }
});


// Alerts endpoints
// Get all active alerts (requires auth)
app.get('/alerts', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller) return res.status(401).json({ error: 'no_auth' });
  try {
    const activeAlerts = await alerts.find({ status: 'active' });
    const out = activeAlerts.map(a => ({
      id: a.id || a._id,
      location: a.location,
      staff: a.staff,
      type: a.type,
      createdAt: a.created_at
    }));
    res.json(out);
  } catch (e) {
    console.error('Get alerts failed', e && e.message);
    res.status(500).json({ error: 'get_failed' });
  }
});

// Create an alert (any authenticated user)
app.post('/alerts', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller) {
    return res.status(401).json({ error: 'no_auth' });
  }
  const { location, staff, type } = req.body || {};
  if (!location || !type) return res.status(400).json({ error: 'missing_fields' });
  try {
    const id = makeId();
    const alert = {
      id,
      location: String(location).trim(),
      staff: String(staff || 'Unknown').trim(),
      type: String(type).trim(),
      status: 'active',
      created_at: new Date().toISOString()
    };
    await alerts.insert(alert);
    
    // Notify admins about the new alert
    await sendAdminNotifications(alert);
    
    res.status(201).json(alert);
  } catch (e) {
    console.error('Create alert failed', e && e.message);
    res.status(500).json({ error: 'create_failed' });
  }
});

// Confirm/resolve an alert (admin only) - Creates an active emergency
app.post('/alerts/:id/confirm', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller || !Array.isArray(caller.roles) || !caller.roles.includes('admin')) {
    return res.status(403).json({ error: 'forbidden' });
  }
  const { id } = req.params || {};
  const { requiresEvacuation = false } = req.body || {};
  try {
    const alert = await alerts.findOne({ id });
    if (!alert) return res.status(404).json({ error: 'not_found' });
    
    // Check if there's already an active emergency
    const existingEmergency = await emergencies.findOne({ status: 'active' });
    if (existingEmergency) {
      return res.status(409).json({ error: 'emergency_already_active', message: 'An emergency is already in progress' });
    }
    
    // Create an active emergency from this alert
    const emergency = {
      id: alert.id,
      location: alert.location,
      staff: alert.staff,
      type: alert.type,
      status: 'active',
      requires_evacuation: !!requiresEvacuation,
      confirmed_by: caller.email,
      confirmed_at: new Date().toISOString(),
      created_at: alert.created_at
    };
    await emergencies.insert(emergency);
    
    // Send emergency notifications to all users
    await sendEmergencyNotifications(alert);
    
    // Remove the alert (it's now an emergency)
    await alerts.remove({ id }, { multi: false });
    
    console.log(`[Emergency] Emergency ${emergency.id} activated by ${caller.email} (evacuation: ${emergency.requires_evacuation})`);
    res.json({ success: true, emergency });
  } catch (e) {
    console.error('Confirm alert failed', e && e.message);
    res.status(500).json({ error: 'confirm_failed' });
  }
});

// Cancel an alert
app.post('/alerts/:id/cancel', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller) return res.status(401).json({ error: 'no_auth' });
  const { id } = req.params || {};
  try {
    const alert = await alerts.findOne({ id });
    if (!alert) return res.status(404).json({ error: 'not_found' });
    await alerts.remove({ id }, { multi: false });
    res.json({ success: true });
  } catch (e) {
    console.error('Cancel alert failed', e && e.message);
    res.status(500).json({ error: 'cancel_failed' });
  }
});

// ============================================
// EMERGENCY STATE ENDPOINTS
// ============================================

// Get the currently active emergency (if any)
app.get('/emergency/active', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller) return res.status(401).json({ error: 'no_auth' });
  try {
    const activeEmergency = await emergencies.findOne({ status: 'active' });
    if (!activeEmergency) {
      return res.json({ active: false, emergency: null });
    }
    res.json({
      active: true,
      emergency: {
        id: activeEmergency.id,
        location: activeEmergency.location,
        type: activeEmergency.type,
        staff: activeEmergency.staff,
        requires_evacuation: activeEmergency.requires_evacuation || false,
        confirmed_by: activeEmergency.confirmed_by,
        confirmed_at: activeEmergency.confirmed_at,
        created_at: activeEmergency.created_at
      }
    });
  } catch (e) {
    console.error('Get active emergency failed', e && e.message);
    res.status(500).json({ error: 'get_failed' });
  }
});

// End emergency / All Clear (admin only)
app.post('/emergency/:id/end', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller || !Array.isArray(caller.roles) || !caller.roles.includes('admin')) {
    return res.status(403).json({ error: 'forbidden' });
  }
  const { id } = req.params || {};
  try {
    const emergency = await emergencies.findOne({ id, status: 'active' });
    if (!emergency) {
      return res.status(404).json({ error: 'not_found', message: 'No active emergency found with that ID' });
    }
    
    // Update emergency status to ended
    await emergencies.update(
      { id },
      { $set: { 
        status: 'ended', 
        ended_by: caller.email, 
        ended_at: new Date().toISOString() 
      }}
    );
    
    console.log(`[Emergency] Emergency ${id} ended by ${caller.email}`);
    
    // TODO: Send "All Clear" notifications to all users
    // This could be implemented similar to sendEmergencyNotifications
    
    res.json({ success: true, message: 'Emergency ended - All Clear' });
  } catch (e) {
    console.error('End emergency failed', e && e.message);
    res.status(500).json({ error: 'end_failed' });
  }
});

// Get emergency history (admin only)
app.get('/emergency/history', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller || !Array.isArray(caller.roles) || !caller.roles.includes('admin')) {
    return res.status(403).json({ error: 'forbidden' });
  }
  try {
    const allEmergencies = await emergencies.find({});
    const sorted = allEmergencies.sort((a, b) => 
      new Date(b.confirmed_at || b.created_at).getTime() - new Date(a.confirmed_at || a.created_at).getTime()
    );
    res.json(sorted);
  } catch (e) {
    console.error('Get emergency history failed', e && e.message);
    res.status(500).json({ error: 'get_failed' });
  }
});

const PORT = process.env.PORT || 5000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Server is running',
    time: new Date().toISOString()
  });
});

// Test endpoint to see current push tokens (admin only)
app.get('/admin/debug/push-tokens-count', async (req, res) => {
  const caller = await userFromToken(req);
  if (!caller || !Array.isArray(caller.roles) || !caller.roles.includes('admin')) {
    return res.status(403).json({ error: 'forbidden' });
  }
  try {
    const allTokens = await pushTokens.find({});
    console.log(`[DEBUG] Push tokens count: ${allTokens ? allTokens.length : 0}`);
    res.json({ 
      count: allTokens ? allTokens.length : 0,
      tokens: allTokens ? allTokens.map(t => ({
        userId: t.userId,
        email: t.email,
        tokenPreview: t.token.substring(0, 20) + '...',
        isValid: Expo.isExpoPushToken(t.token),
        createdAt: t.created_at,
        updatedAt: t.updated_at
      })) : []
    });
  } catch (e) {
    console.error(`[DEBUG] Error getting push tokens: ${e && e.message}`);
    res.status(500).json({ error: 'get_failed', message: e && e.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`Server listening on port ${PORT}`);
  console.log(`Health check: GET http://localhost:${PORT}/health`);
  console.log(`Push tokens (admin only): GET http://localhost:${PORT}/admin/debug/push-tokens-count`);
  console.log(`========================================`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the existing process or run with PORT=<new_port> npm start.`);
    process.exit(1);
  }
  console.error('Server failed to start:', err && err.message ? err.message : err);
  process.exit(1);
});
