import React, { useEffect, useMemo, useState } from 'react';

const API = 'http://localhost:5000';

function App() {
  const [view, setView] = useState('login');
  const [token, setToken] = useState(localStorage.getItem('taskbridgeToken') || '');
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('taskbridgeUser');
    return raw ? JSON.parse(raw) : null;
  });
  const [message, setMessage] = useState('');
  const [authForm, setAuthForm] = useState({ fullName: '', email: '', password: '', newPassword: '' });

  const [dashboard, setDashboard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [uploads, setUploads] = useState([]);

  const [taskForm, setTaskForm] = useState({ title: '', description: '', course: '', dueDate: '', priority: 'Medium', status: 'Pending' });
  const [projectForm, setProjectForm] = useState({ title: '', description: '', course: '', dueDate: '', memberName: '', memberEmail: '', memberRole: 'Member' });
  const [reminderForm, setReminderForm] = useState({ message: '', remindAt: '' });
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });
  const [uploadFile, setUploadFile] = useState(null);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  async function api(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Request failed');
    return data;
  }

  async function loadProtectedData() {
    if (!token) return;
    try {
      const [dashboardData, taskData, projectData, reminderData, noteData, uploadData] = await Promise.all([
        api('/api/dashboard', { headers: authHeaders }),
        api('/api/tasks', { headers: authHeaders }),
        api('/api/projects', { headers: authHeaders }),
        api('/api/reminders', { headers: authHeaders }),
        api('/api/notes', { headers: authHeaders }),
        api('/api/uploads', { headers: authHeaders }),
      ]);
      setDashboard(dashboardData);
      setTasks(taskData);
      setProjects(projectData);
      setReminders(reminderData);
      setNotes(noteData);
      setUploads(uploadData);
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    if (token && user) {
      setView('dashboard');
      loadProtectedData();
    }
  }, [token]);

  function saveAuth(data) {
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('taskbridgeToken', data.token);
    localStorage.setItem('taskbridgeUser', JSON.stringify(data.user));
  }

  async function handleRegister(e) {
    e.preventDefault();
    try {
      const data = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName: authForm.fullName, email: authForm.email, password: authForm.password }),
      });
      saveAuth(data);
      setMessage('Registration successful.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: authForm.email, password: authForm.password }),
      });
      saveAuth(data);
      setMessage('Login successful.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    try {
      await api('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: authForm.email, newPassword: authForm.newPassword }),
      });
      setView('login');
      setMessage('Password changed. You can log in now.');
      setAuthForm({ ...authForm, password: '', newPassword: '' });
    } catch (error) {
      setMessage(error.message);
    }
  }

  function logout() {
    localStorage.removeItem('taskbridgeToken');
    localStorage.removeItem('taskbridgeUser');
    setToken('');
    setUser(null);
    setDashboard(null);
    setTasks([]);
    setProjects([]);
    setReminders([]);
    setNotes([]);
    setUploads([]);
    setView('login');
  }

  async function addTask(e) {
    e.preventDefault();
    try {
      await api('/api/tasks', { method: 'POST', headers: authHeaders, body: JSON.stringify(taskForm) });
      setTaskForm({ title: '', description: '', course: '', dueDate: '', priority: 'Medium', status: 'Pending' });
      setMessage('Task added.');
      loadProtectedData();
    } catch (error) { setMessage(error.message); }
  }

  async function quickToggleTask(task) {
    try {
      await api(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ ...task, status: task.status === 'Completed' ? 'Pending' : 'Completed' }),
      });
      loadProtectedData();
    } catch (error) { setMessage(error.message); }
  }

  async function deleteTask(id) {
    try {
      await api(`/api/tasks/${id}`, { method: 'DELETE', headers: authHeaders });
      loadProtectedData();
    } catch (error) { setMessage(error.message); }
  }

  async function addProject(e) {
    e.preventDefault();
    try {
      const members = projectForm.memberName ? [{ memberName: projectForm.memberName, memberEmail: projectForm.memberEmail, role: projectForm.memberRole }] : [];
      await api('/api/projects', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ title: projectForm.title, description: projectForm.description, course: projectForm.course, dueDate: projectForm.dueDate, members }),
      });
      setProjectForm({ title: '', description: '', course: '', dueDate: '', memberName: '', memberEmail: '', memberRole: 'Member' });
      setMessage('Project added.');
      loadProtectedData();
    } catch (error) { setMessage(error.message); }
  }

  async function deleteProject(id) {
    try {
      await api(`/api/projects/${id}`, { method: 'DELETE', headers: authHeaders });
      loadProtectedData();
    } catch (error) { setMessage(error.message); }
  }

  async function addReminder(e) {
    e.preventDefault();
    try {
      await api('/api/reminders', { method: 'POST', headers: authHeaders, body: JSON.stringify(reminderForm) });
      setReminderForm({ message: '', remindAt: '' });
      loadProtectedData();
    } catch (error) { setMessage(error.message); }
  }

  async function markReminderRead(id) {
    try {
      await api(`/api/reminders/${id}/read`, { method: 'PUT', headers: authHeaders });
      loadProtectedData();
    } catch (error) { setMessage(error.message); }
  }

  async function deleteReminder(id) {
    try {
      await api(`/api/reminders/${id}`, { method: 'DELETE', headers: authHeaders });
      loadProtectedData();
    } catch (error) { setMessage(error.message); }
  }

  async function addNote(e) {
    e.preventDefault();
    try {
      await api('/api/notes', { method: 'POST', headers: authHeaders, body: JSON.stringify(noteForm) });
      setNoteForm({ title: '', content: '' });
      loadProtectedData();
    } catch (error) { setMessage(error.message); }
  }

  async function deleteNote(id) {
    try {
      await api(`/api/notes/${id}`, { method: 'DELETE', headers: authHeaders });
      loadProtectedData();
    } catch (error) { setMessage(error.message); }
  }

  async function uploadDocument(e) {
    e.preventDefault();
    if (!uploadFile) return setMessage('Choose a file first.');
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      await api('/api/uploads', { method: 'POST', headers: authHeaders, body: formData });
      setUploadFile(null);
      e.target.reset();
      loadProtectedData();
    } catch (error) { setMessage(error.message); }
  }

  async function deleteUpload(id) {
    try {
      await api(`/api/uploads/${id}`, { method: 'DELETE', headers: authHeaders });
      loadProtectedData();
    } catch (error) { setMessage(error.message); }
  }

  const authCard = (
    <div className="auth-shell">
      <div className="card auth-card">
        <h1>TaskBridge</h1>
        <p className="muted">Student planner with tasks, projects, reminders, notes, and uploads.</p>
        {message && <div className="banner">{message}</div>}

        {view === 'login' && (
          <form onSubmit={handleLogin} className="form-grid">
            <input placeholder="Email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
            <input placeholder="Password" type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
            <button type="submit">Login</button>
            <button type="button" className="ghost" onClick={() => setView('register')}>Create Account</button>
            <button type="button" className="link-btn" onClick={() => setView('reset')}>Forgot password?</button>
          </form>
        )}

        {view === 'register' && (
          <form onSubmit={handleRegister} className="form-grid">
            <input placeholder="Full name" value={authForm.fullName} onChange={(e) => setAuthForm({ ...authForm, fullName: e.target.value })} />
            <input placeholder="Email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
            <input placeholder="Password" type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
            <button type="submit">Register</button>
            <button type="button" className="ghost" onClick={() => setView('login')}>Back to Login</button>
          </form>
        )}

        {view === 'reset' && (
          <form onSubmit={handleResetPassword} className="form-grid">
            <input placeholder="Registered email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
            <input placeholder="New password" type="password" value={authForm.newPassword} onChange={(e) => setAuthForm({ ...authForm, newPassword: e.target.value })} />
            <button type="submit">Change Password</button>
            <button type="button" className="ghost" onClick={() => setView('login')}>Back to Login</button>
          </form>
        )}
      </div>
    </div>
  );

  if (!token || !user) return authCard;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>TaskBridge Dashboard</h1>
          <p className="muted">Welcome, {user.fullName}</p>
        </div>
        <button onClick={logout}>Logout</button>
      </header>

      {message && <div className="banner">{message}</div>}

      <section className="stats-grid">
        <StatCard label="Total Tasks" value={dashboard?.stats?.totalTasks ?? 0} />
        <StatCard label="Completed Tasks" value={dashboard?.stats?.completedTasks ?? 0} />
        <StatCard label="Projects" value={dashboard?.stats?.activeProjects ?? 0} />
        <StatCard label="Unread Reminders" value={dashboard?.stats?.unreadReminders ?? 0} />
        <StatCard label="Notes" value={dashboard?.stats?.notes ?? 0} />
        <StatCard label="Uploads" value={dashboard?.stats?.uploads ?? 0} />
      </section>

      <section className="grid-2">
        <div className="card">
          <h2>Add Task</h2>
          <form onSubmit={addTask} className="form-grid">
            <input placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
            <input placeholder="Description" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
            <input placeholder="Course" value={taskForm.course} onChange={(e) => setTaskForm({ ...taskForm, course: e.target.value })} />
            <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
            <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
              <option>Low</option><option>Medium</option><option>High</option>
            </select>
            <select value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}>
              <option>Pending</option><option>In Progress</option><option>Completed</option>
            </select>
            <button type="submit">Save Task</button>
          </form>
        </div>

        <div className="card">
          <h2>Upcoming Tasks</h2>
          <div className="list">
            {tasks.map((task) => (
              <div key={task.id} className="list-item">
                <div>
                  <strong>{task.title}</strong>
                  <div className="muted">{task.course} • Due {task.dueDate || 'N/A'} • {task.status}</div>
                </div>
                <div className="row-gap">
                  <button className="small" onClick={() => quickToggleTask(task)}>{task.status === 'Completed' ? 'Undo' : 'Complete'}</button>
                  <button className="small danger" onClick={() => deleteTask(task.id)}>Delete</button>
                </div>
              </div>
            ))}
            {tasks.length === 0 && <p className="muted">No tasks yet.</p>}
          </div>
        </div>
      </section>

      <section className="grid-2">
        <div className="card">
          <h2>Project Collaboration</h2>
          <form onSubmit={addProject} className="form-grid">
            <input placeholder="Project title" value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} />
            <input placeholder="Description" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />
            <input placeholder="Course" value={projectForm.course} onChange={(e) => setProjectForm({ ...projectForm, course: e.target.value })} />
            <input type="date" value={projectForm.dueDate} onChange={(e) => setProjectForm({ ...projectForm, dueDate: e.target.value })} />
            <input placeholder="Team member name" value={projectForm.memberName} onChange={(e) => setProjectForm({ ...projectForm, memberName: e.target.value })} />
            <input placeholder="Team member email" value={projectForm.memberEmail} onChange={(e) => setProjectForm({ ...projectForm, memberEmail: e.target.value })} />
            <select value={projectForm.memberRole} onChange={(e) => setProjectForm({ ...projectForm, memberRole: e.target.value })}>
              <option>Member</option><option>Leader</option><option>Reviewer</option>
            </select>
            <button type="submit">Save Project</button>
          </form>
          <div className="list">
            {projects.map((project) => (
              <div key={project.id} className="list-item vertical">
                <div>
                  <strong>{project.title}</strong>
                  <div className="muted">{project.course} • Due {project.dueDate || 'N/A'}</div>
                  <div>{project.description}</div>
                  <div className="muted">Members: {project.members?.map((m) => `${m.memberName} (${m.role})`).join(', ') || 'None added'}</div>
                </div>
                <button className="small danger" onClick={() => deleteProject(project.id)}>Delete</button>
              </div>
            ))}
            {projects.length === 0 && <p className="muted">No projects yet.</p>}
          </div>
        </div>

        <div className="card">
          <h2>Notifications & Reminders</h2>
          <form onSubmit={addReminder} className="form-grid">
            <input placeholder="Reminder message" value={reminderForm.message} onChange={(e) => setReminderForm({ ...reminderForm, message: e.target.value })} />
            <input type="datetime-local" value={reminderForm.remindAt} onChange={(e) => setReminderForm({ ...reminderForm, remindAt: e.target.value })} />
            <button type="submit">Add Reminder</button>
          </form>
          <div className="list">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="list-item">
                <div>
                  <strong>{reminder.message}</strong>
                  <div className="muted">{reminder.remindAt || 'No time set'} • {reminder.isRead ? 'Read' : 'Unread'}</div>
                </div>
                <div className="row-gap">
                  {!reminder.isRead && <button className="small" onClick={() => markReminderRead(reminder.id)}>Mark Read</button>}
                  <button className="small danger" onClick={() => deleteReminder(reminder.id)}>Delete</button>
                </div>
              </div>
            ))}
            {reminders.length === 0 && <p className="muted">No reminders yet.</p>}
          </div>
        </div>
      </section>

      <section className="grid-2">
        <div className="card">
          <h2>Notes</h2>
          <form onSubmit={addNote} className="form-grid">
            <input placeholder="Note title" value={noteForm.title} onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })} />
            <textarea placeholder="Write your note here" value={noteForm.content} onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })} />
            <button type="submit">Save Note</button>
          </form>
          <div className="list">
            {notes.map((note) => (
              <div key={note.id} className="list-item vertical">
                <div>
                  <strong>{note.title}</strong>
                  <div>{note.content}</div>
                </div>
                <button className="small danger" onClick={() => deleteNote(note.id)}>Delete</button>
              </div>
            ))}
            {notes.length === 0 && <p className="muted">No notes yet.</p>}
          </div>
        </div>

        <div className="card">
          <h2>File Uploads</h2>
          <form onSubmit={uploadDocument} className="form-grid">
            <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
            <button type="submit">Upload File</button>
          </form>
          <div className="list">
            {uploads.map((file) => (
              <div key={file.id} className="list-item">
                <a href={file.url} target="_blank" rel="noreferrer">{file.originalName}</a>
                <button className="small danger" onClick={() => deleteUpload(file.id)}>Delete</button>
              </div>
            ))}
            {uploads.length === 0 && <p className="muted">No files uploaded yet.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card stat-card">
      <div className="stat-value">{value}</div>
      <div className="muted">{label}</div>
    </div>
  );
}

export default App;
