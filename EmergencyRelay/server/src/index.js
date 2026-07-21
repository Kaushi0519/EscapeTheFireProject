const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const crypto = require('crypto');

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

async function migrateFromJson(users) {
  const jsonFile = path.join(__dirname, '../data/users.json');
  try {
    if (!fs.existsSync(jsonFile)) return;
    const raw = fs.readFileSync(jsonFile, 'utf8');
    const rows = JSON.parse(raw || '[]');
    for (const u of rows) {
      try {
        await users.insert({
          id: u.id,
          email: u.email,
          password_hash: u.password_hash,
          roles: u.roles || ['staff'],
          status: u.status || 'active',
          created_at: u.created_at || new Date().toISOString(),
          session: u.session || null,
        });
      } catch (e) {
        // ignore insert conflict (already migrated)
      }
    }
  } catch (e) {
    console.warn('Migration from JSON failed:', e && e.message);
  }
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

// Initialize DB (NeDB) and migrate JSON data
const db = openDb();
(async () => { await migrateFromJson(db); })();

// Create a separate NeDB for rosters
const rostersFile = path.join(DB_DIR, 'rosters.db');
const rosters = nedb.create({ filename: rostersFile, autoload: true });

// Create a NeDB for students
const studentsFile = path.join(DB_DIR, 'students.db');
const students = nedb.create({ filename: studentsFile, autoload: true });

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
(async () => { await migrateRostersFromJson(); })();

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

// Admin creates a user
// Admin creates a user
app.post('/admin/users/create', async (req, res) => {
  const { email, password, roles } = req.body || {};
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
    };
    await db.insert(doc);
    res.status(201).json({ id, email: normalized, roles: doc.roles });
  } catch (e) {
    console.error('Create user failed', e && e.message);
    return res.status(500).json({ error: 'create_failed' });
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

app.delete('/admin/users/:id', async (req, res) => {
  const { id } = req.params || {};
  if (!id) return res.status(400).json({ error: 'missing_id' });
  const caller = await userFromToken(req);
  if (!caller || !Array.isArray(caller.roles) || !caller.roles.includes('admin')) {
    return res.status(403).json({ error: 'forbidden' });
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
    const out = rows.map(r => ({ id: r.id, email: r.email, roles: r.roles, status: r.status }));
    res.json(out);
  } catch (e) {
    console.error('List users failed', e && e.message);
    res.status(500).json({ error: 'list_failed' });
  }
});

// Rosters endpoints
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
      out.push({ id: r.id || r._id, name: r.name, assignedTo: r.assignedTo || null, assignedToEmail: assignedEmail, created_at: r.created_at });
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
    if (r.assignedTo) {
      const u = await db.findOne({ id: r.assignedTo });
      if (u) assignedEmail = u.email;
    }
    res.json({ id: r.id || r._id, name: r.name, students: r.students || [], assignedTo: r.assignedTo || null, assignedToEmail: assignedEmail, created_at: r.created_at });
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
    // update fields
    if (typeof accounted !== 'undefined') students[idx].accounted = !!accounted;
    if (typeof name !== 'undefined') students[idx].name = String(name);
    if (typeof imageUrl !== 'undefined') students[idx].imageUrl = imageUrl;
    await rosters.update({ id }, { $set: { students } }, { multi: false });
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`server listening ${PORT}`));
