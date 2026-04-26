import React, { useCallback, useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/tasks', label: 'Tasks', icon: '✅' },
  { path: '/projects', label: 'Projects', icon: '🤝' },
  { path: '/reminders', label: 'Reminders', icon: '🔔' },
  { path: '/notes', label: 'Notes', icon: '📝' },
  { path: '/uploads', label: 'Uploads', icon: '📁' },
];

const emptyAuthForm = { fullName: '', email: '', password: '', confirmPassword: '', newPassword: '' };
const emptyTaskForm = { title: '', description: '', course: '', dueDate: '', priority: 'Medium', status: 'Pending' };
const emptyProjectForm = {
  title: '',
  description: '',
  course: '',
  dueDate: '',
  memberName: '',
  memberEmail: '',
  memberRole: 'Member',
};
const emptyReminderForm = { message: '', remindAt: '' };
const emptyNoteForm = { title: '', content: '' };

function getInitialPath() {
  const hashPath = window.location.hash.replace('#', '');
  return hashPath || '/login';
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function formatDate(value) {
  if (!value) return 'No date set';
  try {
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDateTime(value) {
  if (!value) return 'No time set';
  try {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function App() {
  const [path, setPath] = useState(getInitialPath);
  const [token, setToken] = useState(localStorage.getItem('taskbridgeToken') || '');
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('taskbridgeUser');
    return raw ? JSON.parse(raw) : null;
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [dashboard, setDashboard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [uploads, setUploads] = useState([]);

  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [projectForm, setProjectForm] = useState(emptyProjectForm);
  const [reminderForm, setReminderForm] = useState(emptyReminderForm);
  const [noteForm, setNoteForm] = useState(emptyNoteForm);
  const [uploadFile, setUploadFile] = useState(null);

  const isAuthenticated = Boolean(token && user);
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const navigate = useCallback((nextPath) => {
    window.location.hash = nextPath;
    setPath(nextPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const handleHashChange = () => setPath(getInitialPath());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!isAuthenticated && !['/login', '/register', '/reset-password'].includes(path)) {
      navigate('/login');
    }
    if (isAuthenticated && ['/login', '/register', '/reset-password', '/'].includes(path)) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, path, navigate]);

  const api = useCallback(async (endpoint, options = {}) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
      },
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
      throw new Error(data?.message || data || 'Request failed. Please try again.');
    }
    return data;
  }, []);

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    if (text) {
      window.setTimeout(() => setMessage({ type: '', text: '' }), 4500);
    }
  }, []);

  const loadProtectedData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
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
      showMessage('error', error.message);
      if (error.message.toLowerCase().includes('token')) logout(false);
    } finally {
      setLoading(false);
    }
  }, [api, authHeaders, showMessage, token]);

  useEffect(() => {
    if (isAuthenticated) loadProtectedData();
  }, [isAuthenticated, loadProtectedData]);

  function saveAuth(data) {
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('taskbridgeToken', data.token);
    localStorage.setItem('taskbridgeUser', JSON.stringify(data.user));
    navigate('/dashboard');
  }

  function logout(showNotice = true) {
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
    setAuthForm(emptyAuthForm);
    navigate('/login');
    if (showNotice) showMessage('success', 'You have been logged out successfully.');
  }

  function validateAuth(mode) {
    if (mode === 'register' && authForm.fullName.trim().length < 2) return 'Full name must be at least 2 characters.';
    if (!validateEmail(authForm.email)) return 'Please enter a valid email address.';
    if (mode !== 'reset' && authForm.password.length < 6) return 'Password must be at least 6 characters.';
    if (mode === 'register' && authForm.password !== authForm.confirmPassword) return 'Passwords do not match.';
    if (mode === 'reset' && authForm.newPassword.length < 6) return 'New password must be at least 6 characters.';
    return '';
  }

  async function handleRegister(e) {
    e.preventDefault();
    const error = validateAuth('register');
    if (error) return showMessage('error', error);
    try {
      setLoading(true);
      const data = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName: authForm.fullName.trim(), email: authForm.email.trim(), password: authForm.password }),
      });
      saveAuth(data);
      showMessage('success', 'Account created successfully. Welcome to TaskBridge!');
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    const error = validateAuth('login');
    if (error) return showMessage('error', error);
    try {
      setLoading(true);
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: authForm.email.trim(), password: authForm.password }),
      });
      saveAuth(data);
      showMessage('success', 'Login successful.');
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    const error = validateAuth('reset');
    if (error) return showMessage('error', error);
    try {
      setLoading(true);
      await api('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: authForm.email.trim(), newPassword: authForm.newPassword }),
      });
      setAuthForm(emptyAuthForm);
      navigate('/login');
      showMessage('success', 'Password changed. Please log in with your new password.');
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  }

  function validateTask() {
    if (taskForm.title.trim().length < 3) return 'Task title must be at least 3 characters.';
    if (!taskForm.dueDate) return 'Please select a task due date.';
    return '';
  }

  async function addTask(e) {
    e.preventDefault();
    const error = validateTask();
    if (error) return showMessage('error', error);
    try {
      await api('/api/tasks', { method: 'POST', headers: authHeaders, body: JSON.stringify(taskForm) });
      setTaskForm(emptyTaskForm);
      showMessage('success', 'Task added successfully.');
      await loadProtectedData();
      navigate('/tasks');
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  async function quickToggleTask(task) {
    try {
      await api(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ ...task, status: task.status === 'Completed' ? 'Pending' : 'Completed' }),
      });
      showMessage('success', 'Task status updated.');
      await loadProtectedData();
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  async function deleteTask(id) {
    try {
      await api(`/api/tasks/${id}`, { method: 'DELETE', headers: authHeaders });
      showMessage('success', 'Task deleted.');
      await loadProtectedData();
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  function validateProject() {
    if (projectForm.title.trim().length < 3) return 'Project title must be at least 3 characters.';
    if (!projectForm.dueDate) return 'Please select a project due date.';
    if (projectForm.memberEmail && !validateEmail(projectForm.memberEmail)) return 'Team member email is not valid.';
    return '';
  }

  async function addProject(e) {
    e.preventDefault();
    const error = validateProject();
    if (error) return showMessage('error', error);
    try {
      const members = projectForm.memberName.trim()
        ? [{ memberName: projectForm.memberName.trim(), memberEmail: projectForm.memberEmail.trim(), role: projectForm.memberRole }]
        : [];
      await api('/api/projects', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          title: projectForm.title.trim(),
          description: projectForm.description.trim(),
          course: projectForm.course.trim(),
          dueDate: projectForm.dueDate,
          members,
        }),
      });
      setProjectForm(emptyProjectForm);
      showMessage('success', 'Project saved successfully.');
      await loadProtectedData();
      navigate('/projects');
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  async function deleteProject(id) {
    try {
      await api(`/api/projects/${id}`, { method: 'DELETE', headers: authHeaders });
      showMessage('success', 'Project deleted.');
      await loadProtectedData();
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  function validateReminder() {
    if (reminderForm.message.trim().length < 3) return 'Reminder message must be at least 3 characters.';
    if (!reminderForm.remindAt) return 'Please choose a reminder date and time.';
    return '';
  }

  async function addReminder(e) {
    e.preventDefault();
    const error = validateReminder();
    if (error) return showMessage('error', error);
    try {
      await api('/api/reminders', { method: 'POST', headers: authHeaders, body: JSON.stringify(reminderForm) });
      setReminderForm(emptyReminderForm);
      showMessage('success', 'Reminder added successfully.');
      await loadProtectedData();
      navigate('/reminders');
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  async function markReminderRead(id) {
    try {
      await api(`/api/reminders/${id}/read`, { method: 'PUT', headers: authHeaders });
      showMessage('success', 'Reminder marked as read.');
      await loadProtectedData();
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  async function deleteReminder(id) {
    try {
      await api(`/api/reminders/${id}`, { method: 'DELETE', headers: authHeaders });
      showMessage('success', 'Reminder deleted.');
      await loadProtectedData();
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  function validateNote() {
    if (noteForm.title.trim().length < 3) return 'Note title must be at least 3 characters.';
    if (noteForm.content.trim().length < 5) return 'Note content must be at least 5 characters.';
    return '';
  }

  async function addNote(e) {
    e.preventDefault();
    const error = validateNote();
    if (error) return showMessage('error', error);
    try {
      await api('/api/notes', { method: 'POST', headers: authHeaders, body: JSON.stringify(noteForm) });
      setNoteForm(emptyNoteForm);
      showMessage('success', 'Note saved successfully.');
      await loadProtectedData();
      navigate('/notes');
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  async function deleteNote(id) {
    try {
      await api(`/api/notes/${id}`, { method: 'DELETE', headers: authHeaders });
      showMessage('success', 'Note deleted.');
      await loadProtectedData();
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  async function uploadDocument(e) {
    e.preventDefault();
    if (!uploadFile) return showMessage('error', 'Please choose a file before uploading.');
    if (uploadFile.size > 8 * 1024 * 1024) return showMessage('error', 'File size must be under 8 MB.');
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      await api('/api/uploads', { method: 'POST', headers: authHeaders, body: formData });
      setUploadFile(null);
      e.currentTarget.reset();
      showMessage('success', 'File uploaded successfully.');
      await loadProtectedData();
      navigate('/uploads');
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  async function deleteUpload(id) {
    try {
      await api(`/api/uploads/${id}`, { method: 'DELETE', headers: authHeaders });
      showMessage('success', 'File deleted.');
      await loadProtectedData();
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  if (!isAuthenticated) {
    return (
      <AuthShell
        path={path}
        authForm={authForm}
        setAuthForm={setAuthForm}
        navigate={navigate}
        message={message}
        loading={loading}
        handleLogin={handleLogin}
        handleRegister={handleRegister}
        handleResetPassword={handleResetPassword}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar path={path} navigate={navigate} user={user} logout={logout} />
      <main className="main-content">
        <TopBar path={path} user={user} loading={loading} navigate={navigate} />
        {message.text && <Toast type={message.type} text={message.text} />}
        {path === '/dashboard' && <Dashboard dashboard={dashboard} tasks={tasks} projects={projects} reminders={reminders} navigate={navigate} />}
        {path === '/tasks' && (
          <TasksPage taskForm={taskForm} setTaskForm={setTaskForm} addTask={addTask} tasks={tasks} quickToggleTask={quickToggleTask} deleteTask={deleteTask} />
        )}
        {path === '/projects' && (
          <ProjectsPage projectForm={projectForm} setProjectForm={setProjectForm} addProject={addProject} projects={projects} deleteProject={deleteProject} />
        )}
        {path === '/reminders' && (
          <RemindersPage reminderForm={reminderForm} setReminderForm={setReminderForm} addReminder={addReminder} reminders={reminders} markReminderRead={markReminderRead} deleteReminder={deleteReminder} />
        )}
        {path === '/notes' && <NotesPage noteForm={noteForm} setNoteForm={setNoteForm} addNote={addNote} notes={notes} deleteNote={deleteNote} />}
        {path === '/uploads' && <UploadsPage uploadDocument={uploadDocument} setUploadFile={setUploadFile} uploads={uploads} deleteUpload={deleteUpload} />}
        {!navItems.some((item) => item.path === path) && <NotFound navigate={navigate} />}
      </main>
    </div>
  );
}

function AuthShell({ path, authForm, setAuthForm, navigate, message, loading, handleLogin, handleRegister, handleResetPassword }) {
  const mode = path === '/register' ? 'register' : path === '/reset-password' ? 'reset' : 'login';
  return (
    <div className="auth-shell">
      <section className="auth-hero">
        <div className="brand-mark">TB</div>
        <p className="eyebrow">TaskBridge Student Workspace</p>
        <h1>Plan every class, assignment, and group project in one place.</h1>
        <p>
          A professional full-stack student planner with account access, deadline tracking, collaboration, reminders, notes, and file uploads.
        </p>
        <div className="hero-grid">
          <MiniFeature title="Secure login" text="Private student workspace" />
          <MiniFeature title="Smart planning" text="Tasks, dates, priorities" />
          <MiniFeature title="Team-ready" text="Projects and members" />
        </div>
      </section>

      <section className="card auth-card">
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => navigate('/login')}>Login</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => navigate('/register')}>Register</button>
        </div>
        <h2>{mode === 'register' ? 'Create your account' : mode === 'reset' ? 'Reset password' : 'Welcome back'}</h2>
        <p className="muted">Use your student account details to continue.</p>
        {message.text && <Toast type={message.type} text={message.text} />}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="form-grid" noValidate>
            <LabeledInput label="Email" type="email" placeholder="student@email.com" value={authForm.email} onChange={(value) => setAuthForm({ ...authForm, email: value })} />
            <LabeledInput label="Password" type="password" placeholder="At least 6 characters" value={authForm.password} onChange={(value) => setAuthForm({ ...authForm, password: value })} />
            <button className="primary-btn" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
            <button type="button" className="text-btn" onClick={() => navigate('/reset-password')}>Forgot password?</button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="form-grid" noValidate>
            <LabeledInput label="Full name" placeholder="Herinkumar Patel" value={authForm.fullName} onChange={(value) => setAuthForm({ ...authForm, fullName: value })} />
            <LabeledInput label="Email" type="email" placeholder="student@email.com" value={authForm.email} onChange={(value) => setAuthForm({ ...authForm, email: value })} />
            <LabeledInput label="Password" type="password" placeholder="At least 6 characters" value={authForm.password} onChange={(value) => setAuthForm({ ...authForm, password: value })} />
            <LabeledInput label="Confirm password" type="password" placeholder="Re-enter password" value={authForm.confirmPassword} onChange={(value) => setAuthForm({ ...authForm, confirmPassword: value })} />
            <button className="primary-btn" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} className="form-grid" noValidate>
            <LabeledInput label="Registered email" type="email" placeholder="student@email.com" value={authForm.email} onChange={(value) => setAuthForm({ ...authForm, email: value })} />
            <LabeledInput label="New password" type="password" placeholder="At least 6 characters" value={authForm.newPassword} onChange={(value) => setAuthForm({ ...authForm, newPassword: value })} />
            <button className="primary-btn" disabled={loading}>{loading ? 'Updating...' : 'Change Password'}</button>
            <button type="button" className="secondary-btn" onClick={() => navigate('/login')}>Back to Login</button>
          </form>
        )}
      </section>
    </div>
  );
}

function Sidebar({ path, navigate, user, logout }) {
  return (
    <aside className="sidebar">
      <button className="logo-button" onClick={() => navigate('/dashboard')} aria-label="Go to dashboard">
        <span className="brand-mark small">TB</span>
        <span>TaskBridge</span>
      </button>
      <nav className="nav-list" aria-label="Main navigation">
        {navItems.map((item) => (
          <a key={item.path} href={`#${item.path}`} className={path === item.path ? 'active' : ''}>
            <span>{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="avatar">{user.fullName?.charAt(0) || 'U'}</div>
          <div>
            <strong>{user.fullName}</strong>
            <span>{user.email}</span>
          </div>
        </div>
        <button className="secondary-btn full" onClick={() => logout(true)}>Logout</button>
      </div>
    </aside>
  );
}

function TopBar({ path, user, loading, navigate }) {
  const title = navItems.find((item) => item.path === path)?.label || 'Page';
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Welcome, {user.fullName}</p>
        <h1>{title}</h1>
      </div>
      <div className="top-actions">
        {loading && <span className="loading-pill">Syncing...</span>}
        <button className="primary-btn" onClick={() => navigate('/tasks')}>+ New Task</button>
      </div>
    </header>
  );
}

function Dashboard({ dashboard, tasks, projects, reminders, navigate }) {
  const stats = dashboard?.stats || {};
  return (
    <>
      <section className="stats-grid">
        <StatCard label="Total Tasks" value={stats.totalTasks || 0} icon="✅" />
        <StatCard label="Completed" value={stats.completedTasks || 0} icon="🏁" />
        <StatCard label="Projects" value={stats.activeProjects || 0} icon="🤝" />
        <StatCard label="Unread Reminders" value={stats.unreadReminders || 0} icon="🔔" />
        <StatCard label="Notes" value={stats.notes || 0} icon="📝" />
        <StatCard label="Uploads" value={stats.uploads || 0} icon="📁" />
      </section>

      <section className="dashboard-grid">
        <div className="card span-2">
          <div className="section-heading">
            <div>
              <h2>Upcoming Deadlines</h2>
              <p className="muted">The next assignments and study tasks that need attention.</p>
            </div>
            <button className="secondary-btn" onClick={() => navigate('/tasks')}>Manage Tasks</button>
          </div>
          <div className="list compact">
            {tasks.slice(0, 5).map((task) => <TaskRow key={task.id} task={task} />)}
            {tasks.length === 0 && <EmptyState title="No tasks yet" text="Create your first task to start tracking deadlines." action="Add Task" onClick={() => navigate('/tasks')} />}
          </div>
        </div>

        <div className="card">
          <div className="section-heading">
            <h2>Project Snapshot</h2>
            <button className="text-btn" onClick={() => navigate('/projects')}>View all</button>
          </div>
          <div className="list compact">
            {projects.slice(0, 4).map((project) => <ProjectMini key={project.id} project={project} />)}
            {projects.length === 0 && <p className="muted">No group projects added.</p>}
          </div>
        </div>

        <div className="card">
          <div className="section-heading">
            <h2>Reminder Center</h2>
            <button className="text-btn" onClick={() => navigate('/reminders')}>Open</button>
          </div>
          <div className="list compact">
            {reminders.slice(0, 4).map((reminder) => (
              <div key={reminder.id} className="mini-card">
                <strong>{reminder.message}</strong>
                <span>{formatDateTime(reminder.remindAt)} • {reminder.isRead ? 'Read' : 'Unread'}</span>
              </div>
            ))}
            {reminders.length === 0 && <p className="muted">No reminders scheduled.</p>}
          </div>
        </div>
      </section>
    </>
  );
}

function TasksPage({ taskForm, setTaskForm, addTask, tasks, quickToggleTask, deleteTask }) {
  return (
    <section className="page-grid">
      <div className="card form-card">
        <h2>Add Task</h2>
        <p className="muted">Track assignments, exams, and class deadlines.</p>
        <form onSubmit={addTask} className="form-grid" noValidate>
          <LabeledInput label="Task title" placeholder="Finish database project" value={taskForm.title} onChange={(value) => setTaskForm({ ...taskForm, title: value })} />
          <LabeledInput label="Course" placeholder="WEB CIS325" value={taskForm.course} onChange={(value) => setTaskForm({ ...taskForm, course: value })} />
          <label>
            Description
            <textarea placeholder="Short notes about this task" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
          </label>
          <div className="two-col">
            <LabeledInput label="Due date" type="date" value={taskForm.dueDate} onChange={(value) => setTaskForm({ ...taskForm, dueDate: value })} />
            <label>
              Priority
              <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                <option>Low</option><option>Medium</option><option>High</option>
              </select>
            </label>
          </div>
          <label>
            Status
            <select value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}>
              <option>Pending</option><option>In Progress</option><option>Completed</option>
            </select>
          </label>
          <button className="primary-btn">Save Task</button>
        </form>
      </div>
      <div className="card list-card">
        <h2>All Tasks</h2>
        <div className="list">
          {tasks.map((task) => (
            <div key={task.id} className="list-item">
              <TaskRow task={task} />
              <div className="row-actions">
                <button className="secondary-btn small" onClick={() => quickToggleTask(task)}>{task.status === 'Completed' ? 'Undo' : 'Complete'}</button>
                <button className="danger-btn small" onClick={() => deleteTask(task.id)}>Delete</button>
              </div>
            </div>
          ))}
          {tasks.length === 0 && <EmptyState title="No tasks saved" text="Add a task using the form on the left." />}
        </div>
      </div>
    </section>
  );
}

function ProjectsPage({ projectForm, setProjectForm, addProject, projects, deleteProject }) {
  return (
    <section className="page-grid">
      <div className="card form-card">
        <h2>Project Collaboration</h2>
        <p className="muted">Create shared assignments and add classmates.</p>
        <form onSubmit={addProject} className="form-grid" noValidate>
          <LabeledInput label="Project title" placeholder="Marketing research presentation" value={projectForm.title} onChange={(value) => setProjectForm({ ...projectForm, title: value })} />
          <LabeledInput label="Course" placeholder="BUS 402" value={projectForm.course} onChange={(value) => setProjectForm({ ...projectForm, course: value })} />
          <label>
            Description
            <textarea placeholder="Project goal, deliverables, and notes" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />
          </label>
          <LabeledInput label="Due date" type="date" value={projectForm.dueDate} onChange={(value) => setProjectForm({ ...projectForm, dueDate: value })} />
          <div className="divider-label">Optional team member</div>
          <LabeledInput label="Member name" placeholder="Classmate name" value={projectForm.memberName} onChange={(value) => setProjectForm({ ...projectForm, memberName: value })} />
          <LabeledInput label="Member email" type="email" placeholder="classmate@email.com" value={projectForm.memberEmail} onChange={(value) => setProjectForm({ ...projectForm, memberEmail: value })} />
          <label>
            Member role
            <select value={projectForm.memberRole} onChange={(e) => setProjectForm({ ...projectForm, memberRole: e.target.value })}>
              <option>Member</option><option>Leader</option><option>Reviewer</option>
            </select>
          </label>
          <button className="primary-btn">Save Project</button>
        </form>
      </div>
      <div className="card list-card">
        <h2>Active Projects</h2>
        <div className="card-grid">
          {projects.map((project) => (
            <article key={project.id} className="project-card">
              <div className="badge">{project.course || 'General'}</div>
              <h3>{project.title}</h3>
              <p>{project.description || 'No description added.'}</p>
              <p className="muted">Due {formatDate(project.dueDate)}</p>
              <div className="member-list">
                {project.members?.length ? project.members.map((member) => (
                  <span key={member.id}>{member.memberName} · {member.role}</span>
                )) : <span>No members yet</span>}
              </div>
              <button className="danger-btn small" onClick={() => deleteProject(project.id)}>Delete Project</button>
            </article>
          ))}
          {projects.length === 0 && <EmptyState title="No projects saved" text="Create a project to track group work." />}
        </div>
      </div>
    </section>
  );
}

function RemindersPage({ reminderForm, setReminderForm, addReminder, reminders, markReminderRead, deleteReminder }) {
  return (
    <section className="page-grid">
      <div className="card form-card">
        <h2>Add Reminder</h2>
        <p className="muted">Schedule deadline notifications and important updates.</p>
        <form onSubmit={addReminder} className="form-grid" noValidate>
          <LabeledInput label="Reminder message" placeholder="Submit discussion reply" value={reminderForm.message} onChange={(value) => setReminderForm({ ...reminderForm, message: value })} />
          <LabeledInput label="Reminder date and time" type="datetime-local" value={reminderForm.remindAt} onChange={(value) => setReminderForm({ ...reminderForm, remindAt: value })} />
          <button className="primary-btn">Add Reminder</button>
        </form>
      </div>
      <div className="card list-card">
        <h2>Notifications & Reminders</h2>
        <div className="list">
          {reminders.map((reminder) => (
            <div key={reminder.id} className={`list-item ${reminder.isRead ? 'is-read' : ''}`}>
              <div>
                <strong>{reminder.message}</strong>
                <div className="muted">{formatDateTime(reminder.remindAt)} • {reminder.isRead ? 'Read' : 'Unread'}</div>
              </div>
              <div className="row-actions">
                {!reminder.isRead && <button className="secondary-btn small" onClick={() => markReminderRead(reminder.id)}>Mark Read</button>}
                <button className="danger-btn small" onClick={() => deleteReminder(reminder.id)}>Delete</button>
              </div>
            </div>
          ))}
          {reminders.length === 0 && <EmptyState title="No reminders yet" text="Add a reminder to stay ahead of deadlines." />}
        </div>
      </div>
    </section>
  );
}

function NotesPage({ noteForm, setNoteForm, addNote, notes, deleteNote }) {
  return (
    <section className="page-grid">
      <div className="card form-card">
        <h2>Create Note</h2>
        <p className="muted">Keep class notes, research ideas, and assignment details together.</p>
        <form onSubmit={addNote} className="form-grid" noValidate>
          <LabeledInput label="Note title" placeholder="Database project notes" value={noteForm.title} onChange={(value) => setNoteForm({ ...noteForm, title: value })} />
          <label>
            Content
            <textarea placeholder="Write your note here..." value={noteForm.content} onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })} />
          </label>
          <button className="primary-btn">Save Note</button>
        </form>
      </div>
      <div className="card list-card">
        <h2>Saved Notes</h2>
        <div className="card-grid">
          {notes.map((note) => (
            <article key={note.id} className="note-card">
              <h3>{note.title}</h3>
              <p>{note.content}</p>
              <button className="danger-btn small" onClick={() => deleteNote(note.id)}>Delete Note</button>
            </article>
          ))}
          {notes.length === 0 && <EmptyState title="No notes saved" text="Save your first note using the form." />}
        </div>
      </div>
    </section>
  );
}

function UploadsPage({ uploadDocument, setUploadFile, uploads, deleteUpload }) {
  return (
    <section className="page-grid">
      <div className="card form-card">
        <h2>Upload Files</h2>
        <p className="muted">Store assignment documents, rubrics, screenshots, and resources.</p>
        <form onSubmit={uploadDocument} className="form-grid" noValidate>
          <label>
            Choose file
            <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
          </label>
          <button className="primary-btn">Upload File</button>
          <p className="help-text">Maximum recommended file size: 8 MB.</p>
        </form>
      </div>
      <div className="card list-card">
        <h2>Uploaded Files</h2>
        <div className="list">
          {uploads.map((file) => (
            <div key={file.id} className="list-item">
              <div>
                <strong>{file.originalName}</strong>
                <div className="muted">Uploaded {formatDate(file.createdAt)}</div>
              </div>
              <div className="row-actions">
                <a className="secondary-link" href={file.url} target="_blank" rel="noreferrer">Open</a>
                <button className="danger-btn small" onClick={() => deleteUpload(file.id)}>Delete</button>
              </div>
            </div>
          ))}
          {uploads.length === 0 && <EmptyState title="No files uploaded" text="Upload a course document to keep it with your tasks." />}
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function TaskRow({ task }) {
  return (
    <div className="task-row">
      <div className={`priority-dot ${task.priority?.toLowerCase() || 'medium'}`} />
      <div>
        <strong>{task.title}</strong>
        <div className="muted">{task.course || 'General'} • Due {formatDate(task.dueDate)} • {task.status}</div>
        {task.description && <p>{task.description}</p>}
      </div>
    </div>
  );
}

function ProjectMini({ project }) {
  return (
    <div className="mini-card">
      <strong>{project.title}</strong>
      <span>{project.course || 'General'} • Due {formatDate(project.dueDate)}</span>
    </div>
  );
}

function EmptyState({ title, text, action, onClick }) {
  return (
    <div className="empty-state">
      <div>✨</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && <button className="secondary-btn" onClick={onClick}>{action}</button>}
    </div>
  );
}

function LabeledInput({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <label>
      {label}
      <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Toast({ type, text }) {
  return <div className={`toast ${type === 'error' ? 'error' : 'success'}`}>{text}</div>;
}

function MiniFeature({ title, text }) {
  return (
    <div className="mini-feature">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function NotFound({ navigate }) {
  return (
    <div className="card not-found">
      <h2>Page not found</h2>
      <p className="muted">The selected route does not exist in TaskBridge.</p>
      <button className="primary-btn" onClick={() => navigate('/dashboard')}>Return to Dashboard</button>
    </div>
  );
}

export default App;
