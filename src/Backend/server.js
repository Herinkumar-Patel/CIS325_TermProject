const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { getDb } = require('./db');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'taskbridge-secret-key';

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, safeName);
  },
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

function createToken(user) {
  return jwt.sign({ id: user.id, email: user.email, fullName: user.fullName }, JWT_SECRET, { expiresIn: '7d' });
}

app.get('/', (_req, res) => {
  res.json({ message: 'TaskBridge API is running.' });
});

app.post('/api/auth/register', async (req, res) => {
  const db = await getDb();
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'Full name, email, and password are required.' });
  }

  const existing = await db.get('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  if (existing) {
    return res.status(409).json({ message: 'User already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await db.run(
    'INSERT INTO users (fullName, email, passwordHash) VALUES (?, ?, ?)',
    [fullName.trim(), email.trim().toLowerCase(), passwordHash]
  );

  const user = { id: result.lastID, fullName: fullName.trim(), email: email.trim().toLowerCase() };
  const token = createToken(user);
  res.status(201).json({ token, user });
});

app.post('/api/auth/login', async (req, res) => {
  const db = await getDb();
  const { email, password } = req.body;

  const user = await db.get('SELECT * FROM users WHERE email = ?', [String(email || '').trim().toLowerCase()]);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const isMatch = await bcrypt.compare(password || '', user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const safeUser = { id: user.id, fullName: user.fullName, email: user.email };
  res.json({ token: createToken(safeUser), user: safeUser });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const db = await getDb();
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ message: 'Email and new password are required.' });
  }

  const user = await db.get('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.run('UPDATE users SET passwordHash = ? WHERE id = ?', [passwordHash, user.id]);
  res.json({ message: 'Password updated successfully.' });
});

app.get('/api/dashboard', authMiddleware, async (req, res) => {
  const db = await getDb();
  const [tasks, projects, reminders, notes, uploads] = await Promise.all([
    db.all('SELECT * FROM tasks WHERE userId = ? ORDER BY dueDate ASC, id DESC', [req.user.id]),
    db.all('SELECT * FROM projects WHERE ownerId = ? ORDER BY dueDate ASC, id DESC', [req.user.id]),
    db.all('SELECT * FROM reminders WHERE userId = ? ORDER BY remindAt ASC, id DESC', [req.user.id]),
    db.all('SELECT * FROM notes WHERE userId = ? ORDER BY id DESC', [req.user.id]),
    db.all('SELECT * FROM uploads WHERE userId = ? ORDER BY id DESC', [req.user.id]),
  ]);

  res.json({
    stats: {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status === 'Completed').length,
      activeProjects: projects.length,
      unreadReminders: reminders.filter((r) => !r.isRead).length,
      notes: notes.length,
      uploads: uploads.length,
    },
    upcomingTasks: tasks.slice(0, 5),
    recentProjects: projects.slice(0, 5),
    reminders: reminders.slice(0, 5),
  });
});

app.get('/api/tasks', authMiddleware, async (req, res) => {
  const db = await getDb();
  const tasks = await db.all('SELECT * FROM tasks WHERE userId = ? ORDER BY dueDate ASC, id DESC', [req.user.id]);
  res.json(tasks);
});

app.post('/api/tasks', authMiddleware, async (req, res) => {
  const db = await getDb();
  const { title, description = '', course = '', dueDate = '', priority = 'Medium', status = 'Pending' } = req.body;
  if (!title) return res.status(400).json({ message: 'Task title is required.' });

  const result = await db.run(
    'INSERT INTO tasks (userId, title, description, course, dueDate, priority, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, title, description, course, dueDate, priority, status]
  );
  const task = await db.get('SELECT * FROM tasks WHERE id = ?', [result.lastID]);
  res.status(201).json(task);
});

app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const { title, description = '', course = '', dueDate = '', priority = 'Medium', status = 'Pending' } = req.body;
  const current = await db.get('SELECT * FROM tasks WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);
  if (!current) return res.status(404).json({ message: 'Task not found.' });

  await db.run(
    'UPDATE tasks SET title = ?, description = ?, course = ?, dueDate = ?, priority = ?, status = ? WHERE id = ? AND userId = ?',
    [title, description, course, dueDate, priority, status, req.params.id, req.user.id]
  );
  const updated = await db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  res.json(updated);
});

app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const result = await db.run('DELETE FROM tasks WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);
  if (!result.changes) return res.status(404).json({ message: 'Task not found.' });
  res.json({ message: 'Task deleted successfully.' });
});

app.get('/api/projects', authMiddleware, async (req, res) => {
  const db = await getDb();
  const projects = await db.all('SELECT * FROM projects WHERE ownerId = ? ORDER BY dueDate ASC, id DESC', [req.user.id]);
  for (const project of projects) {
    project.members = await db.all('SELECT * FROM project_members WHERE projectId = ? ORDER BY id ASC', [project.id]);
  }
  res.json(projects);
});

app.post('/api/projects', authMiddleware, async (req, res) => {
  const db = await getDb();
  const { title, description = '', course = '', dueDate = '', members = [] } = req.body;
  if (!title) return res.status(400).json({ message: 'Project title is required.' });

  const result = await db.run(
    'INSERT INTO projects (ownerId, title, description, course, dueDate) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, title, description, course, dueDate]
  );

  for (const member of members) {
    if (member.memberName) {
      await db.run(
        'INSERT INTO project_members (projectId, memberName, memberEmail, role) VALUES (?, ?, ?, ?)',
        [result.lastID, member.memberName, member.memberEmail || '', member.role || 'Member']
      );
    }
  }

  const project = await db.get('SELECT * FROM projects WHERE id = ?', [result.lastID]);
  project.members = await db.all('SELECT * FROM project_members WHERE projectId = ?', [result.lastID]);
  res.status(201).json(project);
});

app.delete('/api/projects/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const result = await db.run('DELETE FROM projects WHERE id = ? AND ownerId = ?', [req.params.id, req.user.id]);
  if (!result.changes) return res.status(404).json({ message: 'Project not found.' });
  res.json({ message: 'Project deleted successfully.' });
});

app.get('/api/reminders', authMiddleware, async (req, res) => {
  const db = await getDb();
  const reminders = await db.all('SELECT * FROM reminders WHERE userId = ? ORDER BY remindAt ASC, id DESC', [req.user.id]);
  res.json(reminders);
});

app.post('/api/reminders', authMiddleware, async (req, res) => {
  const db = await getDb();
  const { message, remindAt = '' } = req.body;
  if (!message) return res.status(400).json({ message: 'Reminder message is required.' });
  const result = await db.run('INSERT INTO reminders (userId, message, remindAt) VALUES (?, ?, ?)', [req.user.id, message, remindAt]);
  const reminder = await db.get('SELECT * FROM reminders WHERE id = ?', [result.lastID]);
  res.status(201).json(reminder);
});

app.put('/api/reminders/:id/read', authMiddleware, async (req, res) => {
  const db = await getDb();
  await db.run('UPDATE reminders SET isRead = 1 WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);
  const reminder = await db.get('SELECT * FROM reminders WHERE id = ?', [req.params.id]);
  res.json(reminder);
});

app.delete('/api/reminders/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const result = await db.run('DELETE FROM reminders WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);
  if (!result.changes) return res.status(404).json({ message: 'Reminder not found.' });
  res.json({ message: 'Reminder deleted successfully.' });
});

app.get('/api/notes', authMiddleware, async (req, res) => {
  const db = await getDb();
  const notes = await db.all('SELECT * FROM notes WHERE userId = ? ORDER BY id DESC', [req.user.id]);
  res.json(notes);
});

app.post('/api/notes', authMiddleware, async (req, res) => {
  const db = await getDb();
  const { title, content = '' } = req.body;
  if (!title) return res.status(400).json({ message: 'Note title is required.' });
  const result = await db.run('INSERT INTO notes (userId, title, content) VALUES (?, ?, ?)', [req.user.id, title, content]);
  const note = await db.get('SELECT * FROM notes WHERE id = ?', [result.lastID]);
  res.status(201).json(note);
});

app.delete('/api/notes/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const result = await db.run('DELETE FROM notes WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);
  if (!result.changes) return res.status(404).json({ message: 'Note not found.' });
  res.json({ message: 'Note deleted successfully.' });
});

app.get('/api/uploads', authMiddleware, async (req, res) => {
  const db = await getDb();
  const uploads = await db.all('SELECT * FROM uploads WHERE userId = ? ORDER BY id DESC', [req.user.id]);
  const withUrls = uploads.map((file) => ({ ...file, url: `http://localhost:${PORT}/uploads/${file.storedName}` }));
  res.json(withUrls);
});

app.post('/api/uploads', authMiddleware, upload.single('file'), async (req, res) => {
  const db = await getDb();
  if (!req.file) return res.status(400).json({ message: 'Please choose a file.' });

  const result = await db.run(
    'INSERT INTO uploads (userId, originalName, storedName, filePath) VALUES (?, ?, ?, ?)',
    [req.user.id, req.file.originalname, req.file.filename, req.file.path]
  );
  const fileRecord = await db.get('SELECT * FROM uploads WHERE id = ?', [result.lastID]);
  res.status(201).json({ ...fileRecord, url: `http://localhost:${PORT}/uploads/${req.file.filename}` });
});

app.delete('/api/uploads/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const file = await db.get('SELECT * FROM uploads WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);
  if (!file) return res.status(404).json({ message: 'File not found.' });

  if (fs.existsSync(file.filePath)) fs.unlinkSync(file.filePath);
  await db.run('DELETE FROM uploads WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);
  res.json({ message: 'File deleted successfully.' });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`TaskBridge backend running at http://localhost:${PORT}`);
});
