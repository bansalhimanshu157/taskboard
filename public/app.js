/* Taskboard front-end: talks to the Express API with fetch() and renders the DOM dynamically. */
const API = (window.API_BASE || '') + '/api';
const TOKEN_KEY = 'taskboard_token';

const $ = (id) => document.getElementById(id);
const state = { tasks: [], filter: 'all', query: '' };

/* ---------- helpers ---------- */
async function api(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) logout(); // token expired / invalid
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function show(view) {
  $('auth-view').hidden = view !== 'auth';
  $('app-view').hidden = view !== 'app';
}

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node[k] = v;
  });
  children.forEach((c) => c != null && node.append(c));
  return node;
}

/* ---------- auth ---------- */
function setAuthTab(which) {
  const login = which === 'login';
  $('login-form').hidden = !login;
  $('register-form').hidden = login;
  $('tab-login').classList.toggle('active', login);
  $('tab-register').classList.toggle('active', !login);
  $('tab-login').setAttribute('aria-selected', login);
  $('tab-register').setAttribute('aria-selected', !login);
}
$('tab-login').onclick = () => setAuthTab('login');
$('tab-register').onclick = () => setAuthTab('register');

async function handleAuth(path, body, errorEl) {
  errorEl.textContent = '';
  try {
    const data = await api(path, { method: 'POST', body: JSON.stringify(body) });
    localStorage.setItem(TOKEN_KEY, data.token);
    enterApp(data.user);
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

$('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  handleAuth('/auth/login', {
    email: $('login-email').value.trim(),
    password: $('login-password').value,
  }, $('login-error'));
});

$('register-form').addEventListener('submit', (e) => {
  e.preventDefault();
  handleAuth('/auth/register', {
    name: $('reg-name').value.trim(),
    email: $('reg-email').value.trim(),
    password: $('reg-password').value,
  }, $('register-error'));
});

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  state.tasks = [];
  resetForm();
  show('auth');
}
$('logout-btn').onclick = logout;

async function enterApp(user) {
  $('user-name').textContent = user.name;
  show('app');
  await loadTasks();
}

/* ---------- tasks (CRUD) ---------- */
async function loadTasks() {
  try {
    state.tasks = await api('/tasks');
    render();
  } catch (err) {
    toast(err.message);
  }
}

function resetForm() {
  $('task-form').reset();
  $('task-id').value = '';
  $('form-title').textContent = 'Add a task';
  $('task-submit').textContent = 'Add task';
  $('task-cancel').hidden = true;
  $('task-error').textContent = '';
}

function startEdit(task) {
  $('task-id').value = task._id;
  $('task-title').value = task.title;
  $('task-desc').value = task.description || '';
  $('task-priority').value = task.priority;
  $('task-due').value = task.dueDate ? task.dueDate.slice(0, 10) : '';
  $('form-title').textContent = 'Edit task';
  $('task-submit').textContent = 'Save changes';
  $('task-cancel').hidden = false;
  $('task-title').focus();
}
$('task-cancel').onclick = resetForm;

$('task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('task-error').textContent = '';
  const id = $('task-id').value;
  const body = {
    title: $('task-title').value.trim(),
    description: $('task-desc').value.trim(),
    priority: $('task-priority').value,
    dueDate: $('task-due').value || null,
  };
  if (!body.title) {
    $('task-error').textContent = 'Give your task a title.';
    return;
  }
  try {
    if (id) {
      const updated = await api('/tasks/' + id, { method: 'PUT', body: JSON.stringify(body) });
      state.tasks = state.tasks.map((t) => (t._id === id ? updated : t));
      toast('Changes saved');
    } else {
      const created = await api('/tasks', { method: 'POST', body: JSON.stringify(body) });
      state.tasks.unshift(created);
      toast('Task added');
    }
    resetForm();
    render();
  } catch (err) {
    $('task-error').textContent = err.message;
  }
});

async function toggleDone(task) {
  try {
    const updated = await api('/tasks/' + task._id, {
      method: 'PUT',
      body: JSON.stringify({ status: task.status === 'done' ? 'pending' : 'done' }),
    });
    state.tasks = state.tasks.map((t) => (t._id === task._id ? updated : t));
    render();
  } catch (err) {
    toast(err.message);
  }
}

async function removeTask(task) {
  if (!confirm('Delete "' + task.title + '"?')) return;
  try {
    await api('/tasks/' + task._id, { method: 'DELETE' });
    state.tasks = state.tasks.filter((t) => t._id !== task._id);
    if ($('task-id').value === task._id) resetForm();
    render();
    toast('Task deleted');
  } catch (err) {
    toast(err.message);
  }
}

/* ---------- rendering ---------- */
function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function visibleTasks() {
  const q = state.query.toLowerCase();
  return state.tasks.filter(
    (t) =>
      (state.filter === 'all' || t.status === state.filter) &&
      (!q || t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q))
  );
}

function render() {
  const list = $('task-list');
  list.replaceChildren();
  const tasks = visibleTasks();
  const done = state.tasks.filter((t) => t.status === 'done').length;
  $('summary').textContent = state.tasks.length
    ? `${done} of ${state.tasks.length} completed`
    : '';

  const empty = $('empty');
  empty.hidden = tasks.length > 0;
  if (!tasks.length) {
    empty.textContent = state.tasks.length
      ? 'No tasks match this view.'
      : 'No tasks yet. Add your first one on the left.';
  }

  tasks.forEach((task) => {
    const isDone = task.status === 'done';
    const overdue = task.dueDate && !isDone && new Date(task.dueDate) < new Date(new Date().toDateString());

    const checkbox = el('input', {
      type: 'checkbox',
      checked: isDone,
      ariaLabel: 'Mark "' + task.title + '" as ' + (isDone ? 'pending' : 'done'),
      onchange: () => toggleDone(task),
    });

    const meta = el('div', { class: 'meta' },
      el('span', {}, task.priority[0].toUpperCase() + task.priority.slice(1) + ' priority'),
      task.dueDate ? el('span', { class: overdue ? 'overdue' : '' }, (overdue ? 'Overdue: ' : 'Due ') + formatDate(task.dueDate)) : null
    );

    const body = el('div', {},
      el('div', { class: 'task-title' }, task.title),
      task.description ? el('p', { class: 'task-desc' }, task.description) : null,
      meta
    );

    const actions = el('div', { class: 'task-actions' },
      el('button', { class: 'btn ghost small', onclick: () => startEdit(task) }, 'Edit'),
      el('button', { class: 'btn ghost small danger', onclick: () => removeTask(task) }, 'Delete')
    );

    list.append(el('li', { class: `task ${task.priority} ${isDone ? 'done' : ''}` }, checkbox, body, actions));
  });
}

document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    state.filter = chip.dataset.filter;
    document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === chip));
    render();
  });
});
$('search').addEventListener('input', (e) => {
  state.query = e.target.value.trim();
  render();
});

/* ---------- start ---------- */
(async function init() {
  if (!localStorage.getItem(TOKEN_KEY)) return show('auth');
  try {
    const { user } = await api('/auth/me');
    enterApp(user);
  } catch {
    show('auth');
  }
})();
