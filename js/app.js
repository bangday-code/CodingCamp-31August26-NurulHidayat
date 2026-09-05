/* =====================================================
   LIFE DASHBOARD — app.js
   ===================================================== */

'use strict';

/* ─────────────────────────────────────────
   UTILITIES
───────────────────────────────────────── */

/** Show a temporary toast message */
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

/** Pad a number to 2 digits */
function pad(n) {
  return String(n).padStart(2, '0');
}

/* ─────────────────────────────────────────
   1. GREETING — CLOCK & DATE
───────────────────────────────────────── */

(function initGreeting() {
  const clockEl    = document.getElementById('clock');
  const dateEl     = document.getElementById('date');
  const greetingEl = document.getElementById('greeting');

  const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];

  function tick() {
    const now  = new Date();
    const h    = now.getHours();
    const m    = now.getMinutes();
    const s    = now.getSeconds();

    /* Clock */
    clockEl.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;

    /* Date */
    dateEl.textContent =
      `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

    /* Greeting */
    let greet;
    if (h >= 5  && h < 12) greet = '☀️ Good Morning';
    else if (h >= 12 && h < 17) greet = '🌤️ Good Afternoon';
    else if (h >= 17 && h < 21) greet = '🌆 Good Evening';
    else                         greet = '🌙 Good Night';

    greetingEl.textContent = greet;
  }

  tick();
  setInterval(tick, 1000);
})();


/* ─────────────────────────────────────────
   2. FOCUS TIMER (POMODORO)
───────────────────────────────────────── */

(function initTimer() {
  const display     = document.getElementById('timer-display');
  const minutesInput = document.getElementById('timer-minutes');
  const btnStart    = document.getElementById('btn-start');
  const btnStop     = document.getElementById('btn-stop');
  const btnReset    = document.getElementById('btn-reset');
  const ringProgress = document.getElementById('ring-progress');
  const timerCard   = document.querySelector('.timer-card');

  const CIRCUMFERENCE = 2 * Math.PI * 52; // 326.73

  let totalSeconds  = 25 * 60;
  let remaining     = totalSeconds;
  let intervalId    = null;
  let isRunning     = false;

  /* ---- helpers ---- */
  function updateDisplay() {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    display.textContent = `${pad(m)}:${pad(s)}`;

    // progress ring
    const progress = remaining / totalSeconds;
    const offset   = CIRCUMFERENCE * (1 - progress);
    ringProgress.style.strokeDashoffset = offset;
  }

  function applyCustomTime() {
    if (isRunning) return; // don't allow change while running
    let val = parseInt(minutesInput.value, 10);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 120) val = 120;
    minutesInput.value = val;
    totalSeconds = val * 60;
    remaining    = totalSeconds;
    updateDisplay();
  }

  function start() {
    if (isRunning) return;
    // re-apply custom time in case user changed it
    applyCustomTime();
    isRunning = true;
    timerCard.classList.add('running');
    btnStart.disabled = true;
    minutesInput.disabled = true;

    intervalId = setInterval(() => {
      if (remaining <= 0) {
        clearInterval(intervalId);
        isRunning = false;
        timerCard.classList.remove('running');
        btnStart.disabled = false;
        minutesInput.disabled = false;
        showToast('🎉 Focus session complete! Take a break.');
        return;
      }
      remaining--;
      updateDisplay();
    }, 1000);
  }

  function stop() {
    if (!isRunning) return;
    clearInterval(intervalId);
    isRunning = false;
    timerCard.classList.remove('running');
    btnStart.disabled = false;
    minutesInput.disabled = false;
  }

  function reset() {
    stop();
    applyCustomTime();
  }

  /* ---- events ---- */
  btnStart.addEventListener('click', start);
  btnStop.addEventListener('click', stop);
  btnReset.addEventListener('click', reset);

  minutesInput.addEventListener('change', applyCustomTime);
  minutesInput.addEventListener('blur',   applyCustomTime);

  // Keyboard shortcut: Space to start/stop when not focused on an input
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' &&
        !['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      isRunning ? stop() : start();
    }
  });

  updateDisplay();
})();


/* ─────────────────────────────────────────
   3. TO-DO LIST
───────────────────────────────────────── */

(function initTodo() {
  const taskInput  = document.getElementById('task-input');
  const btnAdd     = document.getElementById('btn-add-task');
  const taskList   = document.getElementById('task-list');
  const sortSelect = document.getElementById('sort-select');
  const footer     = document.getElementById('task-footer');

  /* ---- modal refs ---- */
  const overlay    = document.getElementById('modal-overlay');
  const modalInput = document.getElementById('modal-input');
  const modalSave  = document.getElementById('modal-save');
  const modalCancel = document.getElementById('modal-cancel');

  /* ---- state ---- */
  let tasks       = loadTasks();
  let editingId   = null;

  /* ── storage ── */
  function loadTasks() {
    try {
      return JSON.parse(localStorage.getItem('dashboard_tasks')) || [];
    } catch { return []; }
  }

  function saveTasks() {
    localStorage.setItem('dashboard_tasks', JSON.stringify(tasks));
  }

  /* ── render ── */
  function getSortedTasks() {
    const mode = sortSelect.value;
    const copy = [...tasks];
    if (mode === 'az')     copy.sort((a, b) => a.text.localeCompare(b.text));
    if (mode === 'za')     copy.sort((a, b) => b.text.localeCompare(a.text));
    if (mode === 'active') copy.sort((a, b) => Number(a.done) - Number(b.done));
    if (mode === 'done')   copy.sort((a, b) => Number(b.done) - Number(a.done));
    return copy;
  }

  function render() {
    taskList.innerHTML = '';
    const sorted = getSortedTasks();

    sorted.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item${task.done ? ' done' : ''}`;
      li.dataset.id = task.id;

      li.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${task.done ? 'checked' : ''} aria-label="Mark done" />
        <span class="task-text">${escapeHtml(task.text)}</span>
        <div class="task-actions">
          <button class="btn-icon btn-edit" title="Edit task">✏️</button>
          <button class="btn btn-danger btn-delete" title="Delete task">Delete</button>
        </div>`;

      taskList.appendChild(li);
    });

    updateFooter();
  }

  function updateFooter() {
    const total  = tasks.length;
    const done   = tasks.filter(t => t.done).length;
    const active = total - done;
    footer.textContent = total === 0
      ? 'No tasks yet. Add one above!'
      : `${active} active · ${done} done · ${total} total`;
  }

  /* ── add task ── */
  function addTask() {
    const text = taskInput.value.trim();
    if (!text) { showToast('Please enter a task name.'); return; }

    // Duplicate check (case-insensitive)
    const isDuplicate = tasks.some(
      t => t.text.toLowerCase() === text.toLowerCase()
    );
    if (isDuplicate) {
      showToast('⚠️ Task already exists!');
      taskInput.select();
      return;
    }

    tasks.push({ id: Date.now(), text, done: false });
    saveTasks();
    render();
    taskInput.value = '';
    taskInput.focus();
  }

  /* ── toggle done ── */
  function toggleDone(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.done = !task.done;
      saveTasks();
      render();
    }
  }

  /* ── delete ── */
  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
  }

  /* ── edit (modal) ── */
  function openEdit(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    editingId = id;
    modalInput.value = task.text;
    overlay.classList.remove('hidden');
    modalInput.focus();
    modalInput.select();
  }

  function saveEdit() {
    const newText = modalInput.value.trim();
    if (!newText) { showToast('Task cannot be empty.'); return; }

    // Duplicate check excluding the task being edited
    const isDuplicate = tasks.some(
      t => t.id !== editingId && t.text.toLowerCase() === newText.toLowerCase()
    );
    if (isDuplicate) {
      showToast('⚠️ Another task with this name already exists!');
      return;
    }

    const task = tasks.find(t => t.id === editingId);
    if (task) {
      task.text = newText;
      saveTasks();
      render();
    }
    closeModal();
  }

  function closeModal() {
    overlay.classList.add('hidden');
    editingId = null;
  }

  /* ── event delegation on task list ── */
  taskList.addEventListener('click', (e) => {
    const li = e.target.closest('.task-item');
    if (!li) return;
    const id = Number(li.dataset.id);

    if (e.target.classList.contains('task-checkbox')) toggleDone(id);
    if (e.target.classList.contains('btn-delete'))   deleteTask(id);
    if (e.target.classList.contains('btn-edit'))      openEdit(id);
  });

  /* ── add task events ── */
  btnAdd.addEventListener('click', addTask);
  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTask();
  });

  /* ── sort ── */
  sortSelect.addEventListener('change', render);

  /* ── modal events ── */
  modalSave.addEventListener('click', saveEdit);
  modalCancel.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  modalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') closeModal();
  });

  /* ── html escape ── */
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  render();
})();


/* ─────────────────────────────────────────
   4. QUICK LINKS
───────────────────────────────────────── */

(function initQuickLinks() {
  const nameInput = document.getElementById('link-name');
  const urlInput  = document.getElementById('link-url');
  const btnAdd    = document.getElementById('btn-add-link');
  const container = document.getElementById('links-container');

  /* ── storage ── */
  function loadLinks() {
    try {
      return JSON.parse(localStorage.getItem('dashboard_links')) || defaultLinks();
    } catch { return defaultLinks(); }
  }

  function defaultLinks() {
    return [
      { id: 1, name: 'Google',   url: 'https://google.com' },
      { id: 2, name: 'Gmail',    url: 'https://mail.google.com' },
      { id: 3, name: 'Calendar', url: 'https://calendar.google.com' },
    ];
  }

  function saveLinks(links) {
    localStorage.setItem('dashboard_links', JSON.stringify(links));
  }

  /* ── render ── */
  function render(links) {
    container.innerHTML = '';
    links.forEach(link => {
      const chip = document.createElement('a');
      chip.className   = 'link-chip';
      chip.href        = link.url;
      chip.target      = '_blank';
      chip.rel         = 'noopener noreferrer';
      chip.title       = link.url;

      const nameSpan = document.createElement('span');
      nameSpan.textContent = link.name;

      const removeBtn = document.createElement('button');
      removeBtn.className   = 'link-remove';
      removeBtn.textContent = '×';
      removeBtn.title       = 'Remove link';
      removeBtn.setAttribute('aria-label', `Remove ${link.name}`);

      removeBtn.addEventListener('click', (e) => {
        e.preventDefault(); // don't follow the link
        e.stopPropagation();
        removeLink(link.id);
      });

      chip.appendChild(nameSpan);
      chip.appendChild(removeBtn);
      container.appendChild(chip);
    });
  }

  /* ── add ── */
  function addLink() {
    const name = nameInput.value.trim();
    let   url  = urlInput.value.trim();

    if (!name) { showToast('Please enter a link name.'); nameInput.focus(); return; }
    if (!url)  { showToast('Please enter a URL.');       urlInput.focus();  return; }

    // Auto-prefix protocol
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    // Basic URL validation
    try { new URL(url); }
    catch { showToast('Please enter a valid URL.'); urlInput.focus(); return; }

    const links = loadLinks();

    // Duplicate name check
    if (links.some(l => l.name.toLowerCase() === name.toLowerCase())) {
      showToast('⚠️ A link with that name already exists!');
      return;
    }

    links.push({ id: Date.now(), name, url });
    saveLinks(links);
    render(links);

    nameInput.value = '';
    urlInput.value  = '';
    nameInput.focus();
  }

  /* ── remove ── */
  function removeLink(id) {
    const links = loadLinks().filter(l => l.id !== id);
    saveLinks(links);
    render(links);
  }

  /* ── events ── */
  btnAdd.addEventListener('click', addLink);
  [nameInput, urlInput].forEach(el => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addLink();
    });
  });

  render(loadLinks());
})();
