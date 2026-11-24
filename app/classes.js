/* Studyly classes and assignments.
   Teachers create a class and share its join code; students join with the code. Teachers set quizzes
   (marked by the server) or topic tasks (students mark them done) and follow each student's activity.
   Teachers can also schedule live lessons (a link to a Google Meet, Zoom, Teams or WhatsApp call with a start
   time; Studyly does not host video) and post announcements to the class.
   This file adds the "My classes" page and a home-page reminder about live lessons, announcements and work due. */
(function () {
  const $ = id => document.getElementById(id);
  const esc = value => escapeHTML(value);
  let data = { role: null, classes: [] }, openClassId = null, teacherTab = 'students', studentTab = 'todo';
  let draft = null, quiz = null, busy = false, showAllNotes = false;

  document.getElementById('mainContent').insertAdjacentHTML('beforeend', `<style>
  .cls-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}.cls-head h1{margin:0 0 6px}.cls-head p{margin:0}
  .cls-form{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}.cls-form label{display:grid;gap:6px;color:#4a5065;font-size:13px;font-weight:700}.cls-form input,.cls-form select,.cls-form textarea{padding:11px 12px;border:1px solid var(--line);border-radius:11px;background:#fff;color:var(--ink);font:inherit}.cls-form textarea{min-height:70px;resize:vertical}.cls-form[hidden]{display:none}.cls-wide{flex:1 1 280px}.cls-wide input,.cls-wide textarea{width:100%}
  .cls-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}.cls-card{display:flex;flex-direction:column;gap:8px;padding:18px;border:1px solid var(--line);border-radius:16px;background:#fff}.cls-card h3{margin:0;font-size:17px}.cls-card .btn{align-self:flex-start;margin-top:auto}
  .cls-code-box{display:flex;flex-wrap:wrap;align-items:center;gap:14px;padding:16px 18px;border-radius:16px;background:linear-gradient(115deg,#f0efff,#e8f8f1)}.cls-code{font-family:ui-monospace,Consolas,monospace;font-size:28px;font-weight:900;letter-spacing:4px;color:#3f3794}
  .cls-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:18px 0 12px;border-bottom:1px solid var(--line)}.cls-tab{padding:10px 14px;border:0;border-bottom:2px solid transparent;background:none;color:var(--muted);font-weight:800}.cls-tab.active{border-bottom-color:#6d5dfc;color:#554bc8}
  .cls-table{width:100%;border-collapse:collapse;font-size:14px}.cls-table th,.cls-table td{padding:10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}.cls-table th{color:#667085;font-size:11px;letter-spacing:.5px;text-transform:uppercase}
  .cls-badge{display:inline-block;padding:4px 9px;border-radius:999px;background:#f0efff;color:#554bc8;font-size:11px;font-weight:800}.cls-badge.task{background:#e8f8f1;color:#168c69}.cls-badge.late{background:#fff0f1;color:#b4233c}.cls-badge.soon{background:#fff3e0;color:#a35a00}.cls-badge.done{background:#effcf6;color:#168c69}
  .cls-list{display:grid;gap:12px}.cls-assign{display:flex;flex-direction:column;gap:8px;padding:16px;border:1px solid var(--line);border-radius:16px;background:#fff}.cls-assign h3{margin:0;font-size:16px}.cls-assign p{margin:0}.cls-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;color:var(--muted);font-size:12px}.cls-actions{display:flex;flex-wrap:wrap;gap:8px}.cls-actions .btn{padding:9px 12px;font-size:13px}
  .cls-q{margin:10px 0;padding:14px;border:1px solid var(--line);border-radius:14px;background:#fff}.cls-q legend{font-weight:800;line-height:1.5}.cls-q label{display:flex;gap:9px;padding:8px;border-radius:9px;cursor:pointer}.cls-q label:hover{background:#f6f5ff}.cls-q .right{background:#ecfdf3}.cls-q .wrong{background:#fef2f2}.cls-q .why{margin:8px 0 0;padding:10px;border-radius:10px;background:#f2f8f5;font-size:13px;line-height:1.5}
  .cls-preview-q{display:grid;grid-template-columns:1fr auto;gap:8px;margin:8px 0;padding:12px;border:1px solid var(--line);border-radius:12px;background:#fff}.cls-preview-q ol{margin:6px 0 0;padding-left:22px}.cls-preview-q li{margin:2px 0}.cls-preview-q li.correct{color:#168c69;font-weight:800}
  .cls-empty{padding:26px;color:var(--muted);text-align:center}.cls-bar{height:6px;overflow:hidden;border-radius:9px;background:#eceef4}.cls-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2))}
  #homeAssignments{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin:0 0 16px;padding:14px 16px;border:1px solid #c9c3ff;border-radius:16px;background:#f7f6ff}#homeAssignments[hidden]{display:none}
  .home-cls-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;width:100%}.home-cls-row+.home-cls-row{padding-top:12px;border-top:1px solid var(--line)}
  .cls-badge.live{background:#fff0f1;color:#b4233c}.cls-badge.live:before{content:"";display:inline-block;width:7px;height:7px;margin-right:6px;border-radius:50%;background:currentColor;vertical-align:1px;animation:clsPulse 1.4s ease-in-out infinite}@keyframes clsPulse{50%{opacity:.3}}.cls-live-text{color:#b4233c}
  .cls-assign.past{opacity:.62}.cls-note-text{white-space:pre-wrap;line-height:1.6;overflow-wrap:anywhere}.cls-updates{display:grid;gap:12px;margin-top:22px}.cls-updates>h2{margin:0;font-size:19px}.cls-updates>.btn{justify-self:start}
  @media(prefers-reduced-motion:reduce){.cls-badge.live:before{animation:none}}
  @media(max-width:700px){.cls-table thead{display:none}.cls-table tr{display:grid;gap:4px;padding:10px 0;border-bottom:1px solid var(--line)}.cls-table td{padding:2px 0;border:0}.cls-code{font-size:24px}.cls-form label{width:100%}.cls-form input,.cls-form select{width:100%}}
  </style><section class="view" id="classes"><div id="classesRoot"></div></section>`);

  async function api(path, method = 'GET', body) {
    const res = await fetch('/api/classes' + path, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.error || 'Something went wrong. Try again.');
    return result;
  }
  async function load() { data = await api(''); renderHomeReminder(); return data; }
  function replaceClass(updated) { data.classes = data.classes.some(c => c.id === updated.id) ? data.classes.map(c => c.id === updated.id ? updated : c) : [...data.classes, updated]; }
  const isTeacher = () => currentAccount?.role === 'teacher';
  const today = () => dayKey(new Date());
  const niceDate = value => value ? new Date(value.length === 10 ? value + 'T12:00:00' : value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  function dueBadge(assignment, done) {
    if (done) return '<span class="cls-badge done">✓ Done</span>';
    if (!assignment.dueDate) return '';
    const days = Math.round((new Date(assignment.dueDate + 'T12:00:00') - new Date(today() + 'T12:00:00')) / 86_400_000);
    if (days < 0) return `<span class="cls-badge late">Overdue · was due ${esc(niceDate(assignment.dueDate))}</span>`;
    if (days <= 2) return `<span class="cls-badge soon">Due ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : 'in 2 days'}</span>`;
    return `<span class="cls-badge">Due ${esc(niceDate(assignment.dueDate))}</span>`;
  }
  const typeBadge = a => a.type === 'quiz' ? `<span class="cls-badge">Quiz · ${a.questionCount} question${a.questionCount === 1 ? '' : 's'}</span>` : '<span class="cls-badge task">Topic task</span>';
  const pending = () => data.classes.flatMap(c => c.assignments.filter(a => !a.submission).map(a => ({ ...a, className: c.name, classId: c.id })));

  /* ---------- Live lessons and announcements ---------- */
  const lessonEnd = l => Date.parse(l.startsAt) + l.duration * 60_000;
  const timeText = value => new Date(value).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
  const lessonWhen = l => `${new Date(l.startsAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${timeText(l.startsAt)} – ${timeText(lessonEnd(l))}`;
  const lessonLength = n => n < 60 ? `${n} minutes` : n === 60 ? '1 hour' : n === 90 ? '1½ hours' : '2 hours';
  // A lesson counts as "live" from 10 minutes before it starts until it ends, so students can join early.
  function lessonStatus(l) {
    const now = Date.now(), start = Date.parse(l.startsAt), end = lessonEnd(l);
    if (now >= end) return { key: 'past', badge: '<span class="cls-badge">Ended</span>' };
    if (now >= start - 10 * 60_000) return { key: 'live', badge: `<span class="cls-badge live">${now >= start ? 'Live now' : 'Starting soon'}</span>` };
    const mins = Math.round((start - now) / 60_000);
    if (mins < 24 * 60) return { key: 'soon', badge: `<span class="cls-badge soon">Starts in ${mins < 60 ? `${mins} min` : `${Math.round(mins / 60)} h`}</span>` };
    return { key: 'later', badge: `<span class="cls-badge">${esc(niceDate(l.startsAt))}</span>` };
  }
  // Names the app a call link opens, so students can see where a link goes before tapping it.
  const PLATFORMS = [[/(^|\.)meet\.google\.com$/, 'Google Meet'], [/(^|\.)zoom\.us$/, 'Zoom'], [/^teams\.(microsoft|live)\.com$/, 'Microsoft Teams'], [/(^|\.)whatsapp\.com$|^wa\.me$/, 'WhatsApp'], [/^meet\.jit\.si$/, 'Jitsi Meet'], [/(^|\.)youtube\.com$|^youtu\.be$/, 'YouTube']];
  function platform(url) {
    try { const host = new URL(url).hostname.replace(/^www\./, ''); return (PLATFORMS.find(([pattern]) => pattern.test(host)) || [null, host])[1]; } catch { return 'Call link'; }
  }
  const safeLink = url => /^https:\/\//i.test(url) ? url : '#';
  const ago = value => {
    const mins = Math.round((Date.now() - Date.parse(value)) / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.round(hours / 24);
    return days < 7 ? `${days} day${days === 1 ? '' : 's'} ago` : niceDate(value);
  };
  function lessonCard(l, className, teacher) {
    const st = lessonStatus(l), share = `Live lesson: ${l.title} (${lessonWhen(l)}). Join here: ${l.url}`;
    const join = st.key === 'past' && !teacher ? '' : `<a class="btn${st.key === 'live' ? '' : ' ghost'}" href="${esc(safeLink(l.url))}" target="_blank" rel="noopener noreferrer">${teacher ? 'Open call' : 'Join live lesson'} ↗</a>`;
    const tools = teacher ? `<button class="btn ghost" type="button" data-copy-link="${esc(l.url)}">Copy link</button><a class="btn ghost" href="https://wa.me/?text=${encodeURIComponent(share)}" target="_blank" rel="noopener noreferrer">Share on WhatsApp</a><button class="btn ghost" type="button" data-delete-lesson="${esc(l.id)}">Delete</button>` : '';
    return `<article class="cls-assign${st.key === 'past' ? ' past' : ''}"><div class="cls-meta">${st.badge}<span>Opens ${esc(platform(l.url))}</span>${className ? `<span>${esc(className)}</span>` : ''}</div><h3>${esc(l.title)}</h3><div class="cls-meta">${esc(lessonWhen(l))} · ${lessonLength(l.duration)}</div><div class="cls-actions">${join}${tools}</div></article>`;
  }
  function noteCard(n, className, teacherName, teacher) {
    return `<article class="cls-assign"><div class="cls-meta"><span aria-hidden="true">📢</span>${className ? `<b>${esc(className)}</b>` : ''}${teacherName ? `<span>${esc(teacherName)}</span>` : ''}<span>${esc(ago(n.createdAt))}</span></div><p class="cls-note-text">${esc(n.text)}</p>${teacher ? `<div class="cls-actions"><button class="btn ghost" type="button" data-delete-note="${esc(n.id)}">Delete</button></div>` : ''}</article>`;
  }
  const studentLessons = () => data.classes.flatMap(c => (c.lessons || []).map(l => ({ ...l, className: c.name }))).filter(l => lessonEnd(l) > Date.now()).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const studentNotes = () => data.classes.flatMap(c => (c.announcements || []).map(n => ({ ...n, className: c.name, teacherName: c.teacherName }))).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function renderHomeReminder() {
    const hero = document.querySelector('#home .home-hero');
    if (!hero || isTeacher()) return;
    let box = $('homeAssignments');
    if (!box) { hero.insertAdjacentHTML('beforebegin', '<div id="homeAssignments" hidden></div>'); box = $('homeAssignments'); }
    const now = Date.now(), rows = [];
    // The next live lesson in the coming 24 hours, a reminder about announcements from the last 3 days, then work due.
    const next = studentLessons().find(l => Date.parse(l.startsAt) - now < 86_400_000);
    if (next) {
      const st = lessonStatus(next), start = Date.parse(next.startsAt);
      const when = st.key === 'live' ? (now >= start ? '<b class="cls-live-text">Live now</b>' : '<b class="cls-live-text">starting soon</b>') : `starts ${esc(timeText(next.startsAt))} ${dayKey(new Date(start)) === today() ? 'today' : 'tomorrow'}`;
      rows.push(`<div class="home-cls-row"><span>🎥 <b>${esc(next.title)}</b> · ${when} <small class="muted">${esc(next.className)}</small></span><a class="btn" href="${esc(safeLink(next.url))}" target="_blank" rel="noopener noreferrer">Join live lesson ↗</a></div>`);
    }
    const fresh = studentNotes().filter(n => now - Date.parse(n.createdAt) < 3 * 86_400_000);
    if (fresh.length) rows.push(`<div class="home-cls-row"><span>📢 <b>${fresh.length === 1 ? 'New announcement' : `${fresh.length} new announcements`}</b> · ${esc(fresh[0].className)}: ${esc(fresh[0].text.slice(0, 70))}${fresh[0].text.length > 70 ? '…' : ''}</span><button class="btn ghost" type="button" data-go="classes">Read</button></div>`);
    const todo = pending(), late = todo.filter(a => a.dueDate && a.dueDate < today()).length;
    if (todo.length) rows.push(`<div class="home-cls-row"><span>📋 <b>${todo.length} class assignment${todo.length === 1 ? '' : 's'} to do</b>${late ? ` · <span class="cls-live-text">${late} overdue</span>` : ''}</span><button class="btn" type="button" data-go="classes">Open my classes →</button></div>`);
    box.hidden = !rows.length;
    box.innerHTML = rows.join('');
  }

  /* ---------- Teacher pages ---------- */
  function subjectOptions(level, chosen, allowBlank) {
    const subjects = Object.keys(curriculum[level] || {});
    return (allowBlank ? '<option value="">All subjects</option>' : '') + subjects.map(s => `<option ${s === chosen ? 'selected' : ''}>${esc(s)}</option>`).join('');
  }
  function renderTeacher() {
    const root = $('classesRoot');
    const item = data.classes.find(c => c.id === openClassId);
    if (item) { renderTeacherClass(item); return; }
    root.innerHTML = `<div class="cls-head"><div><h1>My classes</h1><p class="muted">Create a class, share its join code with your students, then set quizzes and topic tasks.</p></div></div>
      <form class="card section cls-form" id="createClassForm"><label class="cls-wide">Class name<input id="newClassName" maxlength="60" required placeholder="e.g. SS2 Gold — Chemistry"></label><label>Level<select id="newClassLevel">${classes.map(c => `<option ${c === state.profile.class ? 'selected' : ''}>${c}</option>`).join('')}</select></label><label>Subject<select id="newClassSubject">${subjectOptions(state.profile.class, '', true)}</select></label><button class="btn" type="submit">Create class</button></form>
      <div class="section cls-grid">${data.classes.map(c => {
        const done = c.assignments.reduce((n, a) => n + a.results.filter(r => r.submittedAt).length, 0), due = c.assignments.length * c.students.length;
        return `<article class="cls-card"><span class="cls-badge">${esc(c.level)}${c.subject ? ' · ' + esc(c.subject) : ''}</span><h3>${esc(c.name)}</h3><p class="muted" style="margin:0">${c.students.length} student${c.students.length === 1 ? '' : 's'} · ${c.assignments.length} assignment${c.assignments.length === 1 ? '' : 's'}</p><p style="margin:0">Join code: <b class="cls-code" style="font-size:18px;letter-spacing:2px">${esc(c.code)}</b></p>${due ? `<div class="cls-bar" title="Submissions"><i style="width:${Math.round(done / due * 100)}%"></i></div><small class="muted">${done} of ${due} submissions in</small>` : ''}<button class="btn" type="button" data-class-open="${esc(c.id)}">Open class →</button></article>`;
      }).join('') || '<div class="card cls-empty">No classes yet. Create your first class above.</div>'}</div>`;
  }
  function renderTeacherClass(item) {
    const root = $('classesRoot');
    const share = `Join my Studyly class "${item.name}". Open Studyly, go to My classes and enter the code ${item.code}.`;
    root.innerHTML = `<button class="btn ghost" type="button" data-class-back>← All classes</button>
      <div class="cls-head section"><div><span class="cls-badge">${esc(item.level)}${item.subject ? ' · ' + esc(item.subject) : ''}</span><h1 style="margin-top:8px">${esc(item.name)}</h1><p class="muted">${item.students.length} student${item.students.length === 1 ? '' : 's'} · created ${esc(niceDate(item.createdAt))}</p></div><button class="btn ghost" type="button" data-class-delete="${esc(item.id)}">Delete class</button></div>
      <div class="cls-code-box section"><div><small class="muted">Students join with this code</small><div class="cls-code">${esc(item.code)}</div></div><div class="cls-actions"><button class="btn" type="button" data-copy-code="${esc(item.code)}">Copy code</button><a class="btn ghost" href="https://wa.me/?text=${encodeURIComponent(share)}" target="_blank" rel="noopener noreferrer">Share on WhatsApp</a></div></div>
      <div class="cls-tabs" role="tablist">${[['students', 'Students'], ['assignments', 'Assignments'], ['lessons', 'Live lessons'], ['news', 'Announcements'], ['insights', 'Class insights']].map(([id, label]) => `<button class="cls-tab ${teacherTab === id ? 'active' : ''}" type="button" role="tab" aria-selected="${teacherTab === id}" data-class-tab="${id}">${label}</button>`).join('')}</div>
      <div id="classTabBody"></div>`;
    const body = $('classTabBody');
    if (teacherTab === 'students') body.innerHTML = teacherStudents(item);
    else if (teacherTab === 'assignments') body.innerHTML = teacherAssignments(item);
    else if (teacherTab === 'lessons') body.innerHTML = teacherLessons(item);
    else if (teacherTab === 'news') body.innerHTML = teacherNews(item);
    else body.innerHTML = teacherInsights(item);
    if (teacherTab === 'assignments') syncDraftForm(item);
  }
  function teacherStudents(item) {
    if (!item.students.length) return `<div class="card cls-empty">No students have joined yet. Share the code <b>${esc(item.code)}</b> with your class.</div>`;
    return `<div class="card table-wrap"><table class="cls-table"><thead><tr><th>Student</th><th>Last active</th><th>This week</th><th>Accuracy</th><th>Needs help with</th><th></th></tr></thead><tbody>${item.students.map(s => `<tr><td><b>${esc(s.name)}</b><br><small class="muted">${esc(s.studentClass)} · 🔥 ${s.streak} day streak</small></td><td>${s.lastActive ? esc(niceDate(s.lastActive)) : '<span class="muted">Not yet</span>'}</td><td>${s.activeDays} active day${s.activeDays === 1 ? '' : 's'}<br><small class="muted">${s.weekQuestions} practice questions</small></td><td>${s.accuracy === null ? '<span class="muted">—</span>' : s.accuracy + '%'}<br><small class="muted">${s.attempts} answered</small></td><td>${s.weak.length ? s.weak.slice(0, 3).map(w => `${esc(w.topic)} <small class="muted">(${w.accuracy}%)</small>`).join('<br>') : '<span class="muted">Nothing flagged</span>'}</td><td><button class="btn ghost" type="button" data-remove-student="${esc(s.id)}">Remove</button></td></tr>`).join('')}</tbody></table></div>`;
  }
  function teacherAssignments(item) {
    const subject = draft?.subject || item.subject || Object.keys(curriculum[item.level] || {})[0];
    const form = `<form class="card cls-form" id="assignmentForm"><h2 style="flex-basis:100%;margin:0">New assignment</h2>
      <label>Type<select id="asgType"><option value="quiz" ${draft?.type !== 'task' ? 'selected' : ''}>Quiz (marked automatically)</option><option value="task" ${draft?.type === 'task' ? 'selected' : ''}>Topic task (study, then mark done)</option></select></label>
      <label>Subject<select id="asgSubject">${subjectOptions(item.level, subject, false)}</select></label><label>Topic<select id="asgTopic"></select></label><label>Due date<input type="date" id="asgDue" value="${esc(draft?.dueDate || '')}"></label>
      <label class="cls-wide">Title<input id="asgTitle" maxlength="100" value="${esc(draft?.title || '')}" placeholder="Leave blank to use the topic name"></label>
      <label class="cls-wide">Instructions for students (optional)<textarea id="asgInstructions" maxlength="1000" placeholder="e.g. Read the lesson note first, then try the quiz without your notes.">${esc(draft?.instructions || '')}</textarea></label>
      <div id="asgQuizTools" class="cls-form" style="flex-basis:100%"><label>Number of questions<select id="asgCount">${[5, 10, 15, 20].map(n => `<option ${n === (draft?.count || 10) ? 'selected' : ''}>${n}</option>`).join('')}</select></label><button class="btn ghost" type="button" id="asgGenerate">✨ Write questions with AI</button></div>
      <div id="asgPreview" style="flex-basis:100%"></div>
      <div class="cls-actions" style="flex-basis:100%"><button class="btn" type="submit" id="asgPublish">Publish assignment</button><span class="muted" id="asgStatus" role="status" aria-live="polite"></span></div></form>`;
    const list = item.assignments.map(a => {
      const submitted = a.results.filter(r => r.submittedAt), scores = submitted.filter(r => Number.isFinite(r.score));
      const average = scores.length ? Math.round(scores.reduce((n, r) => n + r.score / r.total, 0) / scores.length * 100) : null;
      return `<article class="cls-assign"><div class="cls-meta">${typeBadge(a)}${dueBadge(a, false)}<span>${esc(a.subject)} · ${esc(a.topic)}</span></div><h3>${esc(a.title)}</h3>${a.instructions ? `<p class="muted">${esc(a.instructions)}</p>` : ''}<div class="cls-meta"><b>${submitted.length} of ${a.results.length}</b> submitted${average !== null ? ` · average score <b>${average}%</b>` : ''}</div><div class="cls-actions"><button class="btn ghost" type="button" data-results="${esc(a.id)}">${draft?.openResults === a.id ? 'Hide results' : 'See results'}</button><button class="btn ghost" type="button" data-delete-assignment="${esc(a.id)}">Delete</button></div>${draft?.openResults === a.id ? assignmentResults(a) : ''}</article>`;
    }).join('');
    return form + `<h2 class="section">Set assignments</h2><div class="cls-list">${list || '<div class="card cls-empty">No assignments yet.</div>'}</div>`;
  }
  function assignmentResults(a) {
    const rows = a.results.map(r => `<tr><td>${esc(r.name)}</td><td>${r.submittedAt ? (a.type === 'quiz' ? `${r.score} / ${r.total} (${Math.round(r.score / r.total * 100)}%)` : '✓ Done') : '<span class="muted">Not submitted</span>'}</td><td>${r.submittedAt ? esc(niceDate(r.submittedAt)) : ''}</td></tr>`).join('');
    let hardest = '';
    if (a.type === 'quiz') {
      const answered = a.results.filter(r => Array.isArray(r.answers));
      if (answered.length) {
        const stats = a.questions.map((q, i) => ({ i, q, pct: Math.round(answered.filter(r => r.answers[i] === q.answer).length / answered.length * 100) })).sort((x, y) => x.pct - y.pct).slice(0, 3);
        hardest = `<p style="margin:10px 0 4px"><b>Hardest questions</b></p><ol style="margin:0;padding-left:20px">${stats.map(s => `<li>Q${s.i + 1}: ${esc(s.q.question)} — <b>${s.pct}%</b> correct</li>`).join('')}</ol>`;
      }
    }
    return `<div class="table-wrap"><table class="cls-table"><thead><tr><th>Student</th><th>Result</th><th>Submitted</th></tr></thead><tbody>${rows || '<tr><td colspan="3" class="muted">No students in this class yet.</td></tr>'}</tbody></table></div>${hardest}`;
  }
  function teacherInsights(item) {
    if (!item.students.length) return '<div class="card cls-empty">Insights appear once students join and start practising.</div>';
    const weakCounts = {};
    item.students.forEach(s => s.weak.forEach(w => { const key = w.subject + ' · ' + w.topic; weakCounts[key] = (weakCounts[key] || 0) + 1; }));
    const weak = Object.entries(weakCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const withAccuracy = item.students.filter(s => s.accuracy !== null);
    const average = withAccuracy.length ? Math.round(withAccuracy.reduce((n, s) => n + s.accuracy, 0) / withAccuracy.length) : null;
    const inactive = item.students.filter(s => !s.activeDays);
    const active = [...item.students].sort((a, b) => b.weekQuestions - a.weekQuestions).slice(0, 3).filter(s => s.weekQuestions);
    return `<div class="grid"><div class="card"><h3>Average accuracy</h3><div class="stat">${average === null ? '—' : average + '%'}</div><p class="muted">Across ${withAccuracy.length} student${withAccuracy.length === 1 ? ' who has' : 's who have'} practised.</p></div><div class="card"><h3>Active this week</h3><div class="stat">${item.students.length - inactive.length} / ${item.students.length}</div><p class="muted">${inactive.length ? 'Not active yet: ' + inactive.slice(0, 5).map(s => esc(s.name)).join(', ') + (inactive.length > 5 ? '…' : '') : 'Everyone has studied this week.'}</p></div><div class="card"><h3>Most practice this week</h3>${active.length ? `<ol style="margin:0;padding-left:20px">${active.map(s => `<li>${esc(s.name)} — ${s.weekQuestions} questions</li>`).join('')}</ol>` : '<p class="muted">No practice recorded this week.</p>'}</div></div>
      <div class="card section"><h2>Topics the class finds hard</h2><p class="muted">Topics where students score below 70% in practice. Consider reteaching these or setting a task.</p>${weak.length ? `<table class="cls-table"><tbody>${weak.map(([topic, n]) => `<tr><td>${esc(topic)}</td><td>${n} student${n === 1 ? '' : 's'}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No weak topics flagged yet.</p>'}</div>`;
  }
  function teacherLessons(item) {
    const date = today(), lessons = item.lessons || [];
    const upcoming = lessons.filter(l => lessonEnd(l) > Date.now()), past = lessons.filter(l => lessonEnd(l) <= Date.now()).reverse().slice(0, 10);
    return `<form class="card cls-form" id="lessonForm"><h2 style="flex-basis:100%;margin:0">Schedule a live lesson</h2><p class="muted" style="flex-basis:100%;margin:0">Create the call in Google Meet, Zoom, Microsoft Teams or WhatsApp, then paste its link here. Your students will see it in My classes and on their home page, with a Join button from 10 minutes before the start.</p>
      <label class="cls-wide">Lesson title<input id="lessonTitle" maxlength="80" required placeholder="e.g. Revision: quadratic equations"></label>
      <label class="cls-wide">Call link<input id="lessonUrl" type="url" maxlength="300" required placeholder="https://meet.google.com/abc-defg-hij"></label>
      <label>Date<input type="date" id="lessonDate" required value="${date}" min="${date}"></label><label>Start time<input type="time" id="lessonTime" required value="16:00"></label>
      <label>Length<select id="lessonLength">${[30, 45, 60, 90, 120].map(n => `<option value="${n}" ${n === 60 ? 'selected' : ''}>${lessonLength(n)}</option>`).join('')}</select></label>
      <div class="cls-actions" style="flex-basis:100%"><button class="btn" type="submit">Schedule lesson</button></div></form>
      <h2 class="section">Upcoming</h2><div class="cls-list">${upcoming.map(l => lessonCard(l, '', true)).join('') || '<div class="card cls-empty">No live lessons scheduled.</div>'}</div>
      ${past.length ? `<h2 class="section">Past lessons</h2><div class="cls-list">${past.map(l => lessonCard(l, '', true)).join('')}</div>` : ''}`;
  }
  function teacherNews(item) {
    const notes = item.announcements || [];
    return `<form class="card cls-form" id="noteForm"><h2 style="flex-basis:100%;margin:0">Post an announcement</h2>
      <label class="cls-wide">Message to the class<textarea id="noteText" maxlength="1000" required placeholder="e.g. Our test is on Friday. It covers chapters 3 and 4, so bring your calculator."></textarea></label>
      <div class="cls-actions" style="flex-basis:100%;align-items:center"><button class="btn" type="submit">Post to class</button><span class="muted">Every student in this class will see it.</span></div></form>
      <h2 class="section">Posted</h2><div class="cls-list">${notes.map(n => noteCard(n, '', '', true)).join('') || '<div class="card cls-empty">No announcements yet.</div>'}</div>`;
  }
  function syncDraftForm(item) {
    const subjectEl = $('asgSubject'), topicEl = $('asgTopic'), typeEl = $('asgType');
    const topics = curriculum[item.level]?.[subjectEl.value] || [];
    topicEl.innerHTML = topics.map(t => `<option ${t === draft?.topic ? 'selected' : ''}>${esc(t)}</option>`).join('');
    $('asgQuizTools').hidden = typeEl.value !== 'quiz';
    const questions = draft?.questions || [];
    $('asgPreview').innerHTML = typeEl.value === 'quiz' && questions.length ? `<p style="margin:4px 0"><b>${questions.length} question${questions.length === 1 ? '' : 's'} ready.</b> Check each one; remove any you don't want.</p>${questions.map((q, i) => `<div class="cls-preview-q"><div><b>${i + 1}. ${questionHTML(q.question)}</b><ol type="A">${q.options.map((o, j) => `<li class="${j === q.answer ? 'correct' : ''}">${questionHTML(o)}${j === q.answer ? ' ✓' : ''}</li>`).join('')}</ol>${q.explanation ? `<small class="muted">${esc(q.explanation)}</small>` : ''}</div><button class="btn ghost" type="button" data-drop-question="${i}" aria-label="Remove question ${i + 1}">✕</button></div>`).join('')}` : '';
  }
  function readDraft(item) {
    draft = { ...(draft || {}), type: $('asgType').value, subject: $('asgSubject').value, topic: $('asgTopic').value, dueDate: $('asgDue').value, title: $('asgTitle').value, instructions: $('asgInstructions').value, count: Number($('asgCount').value) || 10, classId: item.id };
    return draft;
  }
  async function generateQuiz(item, button) {
    const d = readDraft(item);
    if (!d.topic) { toast('Choose a topic first.'); return; }
    button.disabled = true;
    const status = $('asgStatus');
    const questions = [];
    try {
      while (questions.length < d.count) {
        status.textContent = `Writing questions… ${questions.length} of ${d.count} (this can take up to a minute)`;
        const result = await requestAI({ kind: 'questions', class: item.level, subject: d.subject, topic: d.topic, topics: [d.topic], count: Math.min(10, d.count - questions.length) });
        const fresh = (result.questions || []).filter(q => !questions.some(x => x.question === q.question));
        if (!fresh.length) break;
        questions.push(...fresh.map(q => ({ question: q.question, options: q.options, answer: q.answer, explanation: q.explanation })));
      }
      draft.questions = questions.slice(0, d.count);
      status.textContent = draft.questions.length ? '' : 'No questions came back. Try again in a minute.';
    } catch (error) {
      if (questions.length) draft.questions = questions;
      status.textContent = error.message;
    } finally { button.disabled = false; syncDraftForm(item); }
  }
  async function publish(item) {
    const d = readDraft(item);
    if (d.type === 'quiz' && !d.questions?.length) { $('asgStatus').textContent = 'Write the questions with AI first.'; return; }
    try {
      const result = await api(`/${item.id}/assignments`, 'POST', { type: d.type, subject: d.subject, topic: d.topic, title: d.title, instructions: d.instructions, dueDate: d.dueDate, questions: d.type === 'quiz' ? d.questions : [] });
      replaceClass(result.class);
      draft = null;
      toast('Assignment published');
      renderTeacherClass(result.class);
    } catch (error) { $('asgStatus').textContent = error.message; }
  }

  /* ---------- Student pages ---------- */
  function renderStudent() {
    const root = $('classesRoot');
    if (quiz) { renderQuiz(); return; }
    const all = data.classes.flatMap(c => c.assignments.map(a => ({ ...a, className: c.name, classId: c.id, level: c.level })));
    const todo = all.filter(a => !a.submission).sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
    const done = all.filter(a => a.submission).sort((a, b) => b.submission.submittedAt.localeCompare(a.submission.submittedAt));
    const list = studentTab === 'todo' ? todo : done;
    const lessons = studentLessons(), notes = studentNotes();
    const updates = (lessons.length ? `<div class="cls-updates"><h2>🎥 Live lessons</h2><div class="cls-list">${lessons.slice(0, 5).map(l => lessonCard(l, l.className, false)).join('')}</div></div>` : '')
      + (notes.length ? `<div class="cls-updates"><h2>📢 Announcements</h2><div class="cls-list">${(showAllNotes ? notes : notes.slice(0, 3)).map(n => noteCard(n, n.className, n.teacherName, false)).join('')}</div>${notes.length > 3 ? `<button class="btn ghost" type="button" data-all-notes>${showAllNotes ? 'Show fewer' : `Show all ${notes.length}`}</button>` : ''}</div>` : '');
    root.innerHTML = `<div class="cls-head"><div><h1>My classes</h1><p class="muted">Join your teacher's class with its code to get live lessons, announcements, quizzes and tasks.</p></div></div>
      <form class="card section cls-form" id="joinClassForm"><label class="cls-wide">Class code<input id="joinCode" maxlength="12" autocomplete="off" placeholder="e.g. K7P2QX" style="text-transform:uppercase;letter-spacing:2px;font-weight:800"></label><button class="btn" type="submit">Join class</button></form>
      ${updates}
      ${data.classes.length ? `<div class="cls-tabs" role="tablist"><button class="cls-tab ${studentTab === 'todo' ? 'active' : ''}" type="button" data-student-tab="todo">To do (${todo.length})</button><button class="cls-tab ${studentTab === 'done' ? 'active' : ''}" type="button" data-student-tab="done">Done (${done.length})</button><button class="cls-tab ${studentTab === 'classes' ? 'active' : ''}" type="button" data-student-tab="classes">Classes (${data.classes.length})</button></div>
      ${studentTab === 'classes' ? `<div class="cls-grid">${data.classes.map(c => `<article class="cls-card"><span class="cls-badge">${esc(c.level)}${c.subject ? ' · ' + esc(c.subject) : ''}</span><h3>${esc(c.name)}</h3><p class="muted" style="margin:0">Teacher: ${esc(c.teacherName)} · ${c.assignments.length} assignment${c.assignments.length === 1 ? '' : 's'}</p><button class="btn ghost" type="button" data-leave-class="${esc(c.id)}">Leave class</button></article>`).join('')}</div>`
        : `<div class="cls-list">${list.map(studentAssignmentCard).join('') || `<div class="card cls-empty">${studentTab === 'todo' ? '🎉 Nothing to do right now.' : 'Nothing submitted yet.'}</div>`}</div>`}`
        : '<div class="card cls-empty section">You have not joined a class yet. Ask your teacher for the class code.</div>'}`;
  }
  function studentAssignmentCard(a) {
    const s = a.submission;
    const result = s ? (a.type === 'quiz' ? `<div class="cls-meta"><b>Score: ${s.score} / ${s.total} (${Math.round(s.score / s.total * 100)}%)</b> · submitted ${esc(niceDate(s.submittedAt))}</div>` : `<div class="cls-meta">Marked done ${esc(niceDate(s.submittedAt))}</div>`) : '';
    const buttons = a.type === 'quiz'
      ? `<button class="btn" type="button" data-take-quiz="${esc(a.id)}" data-class="${esc(a.classId)}">${s ? 'Review answers' : 'Start quiz'}</button>`
      : `<button class="btn ghost" type="button" data-guide="${esc(a.topic)}" data-s="${esc(a.subject)}">Lesson note</button><button class="btn ghost" type="button" data-practice-topic="${esc(a.topic)}" data-s="${esc(a.subject)}">Practise</button><button class="btn ghost" type="button" data-topic-cards="${esc(a.topic)}" data-s="${esc(a.subject)}">Flashcards</button>${s ? '' : `<button class="btn" type="button" data-task-done="${esc(a.id)}" data-class="${esc(a.classId)}">Mark as done</button>`}`;
    return `<article class="cls-assign"><div class="cls-meta">${typeBadge(a)}${dueBadge(a, Boolean(s))}<span>${esc(a.className)}</span></div><h3>${esc(a.title)}</h3><div class="cls-meta">${esc(a.subject)} · ${esc(a.topic)}</div>${a.instructions ? `<p>${esc(a.instructions)}</p>` : ''}${result}<div class="cls-actions">${buttons}</div></article>`;
  }
  function renderQuiz() {
    const item = data.classes.find(c => c.id === quiz.classId), a = item?.assignments.find(x => x.id === quiz.id);
    if (!a) { quiz = null; renderStudent(); return; }
    const s = a.submission;
    $('classesRoot').innerHTML = `<button class="btn ghost" type="button" data-quiz-back>← Back to assignments</button>
      <div class="section"><div class="cls-meta">${typeBadge(a)}<span>${esc(item.name)}</span><span>${esc(a.subject)} · ${esc(a.topic)}</span></div><h1 style="margin:8px 0">${esc(a.title)}</h1>${a.instructions ? `<p>${esc(a.instructions)}</p>` : ''}${s ? `<div class="card"><h2 style="margin:0">Your score: ${s.score} / ${s.total} (${Math.round(s.score / s.total * 100)}%)</h2><p class="muted" style="margin:6px 0 0">Green shows the correct answer. Read the explanations for any you missed.</p></div>` : `<p class="muted">Answer every question, then submit. You can only submit once.</p>`}</div>
      ${a.questions.map((q, i) => `<fieldset class="cls-q" ${s ? 'disabled' : ''}><legend>${i + 1}. ${questionHTML(q.question)}</legend>${q.options.map((o, j) => {
        const picked = s ? s.answers?.[i] === j : quiz.answers[i] === j;
        const cls = s ? (j === q.answer ? 'right' : picked ? 'wrong' : '') : '';
        return `<label class="${cls}"><input type="radio" name="clsq${i}" value="${j}" ${picked ? 'checked' : ''}> <span>${String.fromCharCode(65 + j)}. ${questionHTML(o)}</span></label>`;
      }).join('')}${s && q.explanation ? `<p class="why">${esc(q.explanation)}</p>` : ''}</fieldset>`).join('')}
      ${s ? '' : '<div class="cls-actions"><button class="btn" type="button" data-submit-quiz>Submit quiz</button></div>'}`;
    document.querySelectorAll('#classesRoot input[type=radio]').forEach(input => input.addEventListener('change', () => { quiz.answers[Number(input.name.slice(4))] = Number(input.value); }));
  }
  async function submitQuiz() {
    const item = data.classes.find(c => c.id === quiz.classId), a = item.assignments.find(x => x.id === quiz.id);
    const unanswered = a.questions.filter((_, i) => quiz.answers[i] === undefined).length;
    if (unanswered && !confirm(`You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. Submit anyway?`)) return;
    try {
      const result = await api(`/${item.id}/assignments/${a.id}/submit`, 'POST', { answers: a.questions.map((_, i) => quiz.answers[i] ?? null) });
      replaceClass(result.class);
      const mine = result.class.assignments.find(x => x.id === a.id)?.submission;
      if (mine) {
        // Count the quiz in the learner's own practice record so weak topics and reports include it.
        const key = topicKey(item.level, a.subject, a.topic), stat = state.topicStats[key] || { attempts: 0, correct: 0 };
        stat.attempts += mine.total; stat.correct += mine.score; state.topicStats[key] = stat;
        state.attempts += mine.total; state.correct += mine.score; state.xp += 5 * mine.score;
        trackActivity('questions', mine.total); trackActivity('correct', mine.score); trackActivity('assignments');
        markActivity(); save();
      }
      renderHomeReminder(); renderQuiz(); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) { toast(error.message); }
  }

  async function render() {
    const root = $('classesRoot');
    if (!data.role) root.innerHTML = '<p class="muted">Loading your classes…</p>';
    try { await load(); } catch (error) { root.innerHTML = `<div class="card cls-empty">${esc(error.message)}</div>`; return; }
    isTeacher() ? renderTeacher() : renderStudent();
  }
  const rerender = () => isTeacher() ? renderTeacher() : renderStudent();

  // Runs one form action at a time, so a double click or Enter-and-click cannot create two classes.
  async function once(form, action) {
    if (busy) return;
    busy = true;
    const button = form.querySelector('button[type=submit]');
    if (button) button.disabled = true;
    try { await action(); } catch (error) { toast(error.message); }
    finally { busy = false; if (button?.isConnected) button.disabled = false; }
  }
  document.addEventListener('submit', async e => {
    if (e.target.id === 'createClassForm') {
      e.preventDefault();
      await once(e.target, async () => { const result = await api('', 'POST', { name: $('newClassName').value, level: $('newClassLevel').value, subject: $('newClassSubject').value }); replaceClass(result.class); openClassId = result.class.id; teacherTab = 'students'; toast('Class created. Share the join code with your students.'); renderTeacher(); });
    }
    if (e.target.id === 'joinClassForm') {
      e.preventDefault();
      await once(e.target, async () => { const result = await api('/join', 'POST', { code: $('joinCode').value }); replaceClass(result.class); studentTab = 'todo'; toast(`You joined ${result.class.name}`); renderStudent(); renderHomeReminder(); });
    }
    if (e.target.id === 'assignmentForm') {
      e.preventDefault();
      const item = data.classes.find(c => c.id === openClassId);
      if (item) await once(e.target, () => publish(item));
    }
    if (e.target.id === 'lessonForm') {
      e.preventDefault();
      const item = data.classes.find(c => c.id === openClassId);
      // The date and time are the teacher's local time; the server stores the moment in UTC.
      if (item) await once(e.target, async () => {
        const startsAt = new Date(`${$('lessonDate').value}T${$('lessonTime').value}`);
        if (Number.isNaN(startsAt.getTime())) throw new Error('Choose the date and start time.');
        const result = await api(`/${item.id}/lessons`, 'POST', { title: $('lessonTitle').value, url: $('lessonUrl').value.trim(), startsAt: startsAt.toISOString(), duration: Number($('lessonLength').value) });
        replaceClass(result.class); toast('Live lesson scheduled. Your students can see it now.'); renderTeacherClass(result.class);
      });
    }
    if (e.target.id === 'noteForm') {
      e.preventDefault();
      const item = data.classes.find(c => c.id === openClassId);
      if (item) await once(e.target, async () => {
        const result = await api(`/${item.id}/announcements`, 'POST', { text: $('noteText').value });
        replaceClass(result.class); toast('Announcement posted'); renderTeacherClass(result.class);
      });
    }
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'newClassLevel') $('newClassSubject').innerHTML = subjectOptions(e.target.value, '', true);
    const item = data.classes.find(c => c.id === openClassId);
    if (item && ['asgType', 'asgSubject'].includes(e.target.id)) { readDraft(item); if (e.target.id === 'asgSubject') { draft.topic = ''; draft.questions = []; } syncDraftForm(item); }
    if (item && e.target.id === 'asgTopic') { readDraft(item); draft.questions = []; syncDraftForm(item); }
  });
  document.addEventListener('click', async e => {
    const t = e.target;
    if (!t.closest('#classes')) return;
    const open = t.closest('[data-class-open]');
    if (open) { openClassId = open.dataset.classOpen; teacherTab = 'students'; draft = null; renderTeacher(); window.scrollTo({ top: 0 }); return; }
    if (t.closest('[data-class-back]')) { openClassId = null; draft = null; renderTeacher(); return; }
    const tab = t.closest('[data-class-tab]');
    if (tab) { const item = data.classes.find(c => c.id === openClassId); if (item && teacherTab === 'assignments' && $('asgType')) readDraft(item); teacherTab = tab.dataset.classTab; renderTeacher(); return; }
    const copy = t.closest('[data-copy-code]');
    if (copy) { try { await navigator.clipboard.writeText(copy.dataset.copyCode); toast('Code copied'); } catch { toast('Select the code to copy it'); } return; }
    const del = t.closest('[data-class-delete]');
    if (del && confirm('Delete this class, its assignments and all results? This cannot be undone.')) { try { await api('/' + del.dataset.classDelete, 'DELETE'); data.classes = data.classes.filter(c => c.id !== del.dataset.classDelete); openClassId = null; renderTeacher(); } catch (error) { toast(error.message); } return; }
    const remove = t.closest('[data-remove-student]');
    if (remove && confirm('Remove this student from the class? Their results for this class will no longer be shown.')) { try { const result = await api(`/${openClassId}/members/${remove.dataset.removeStudent}`, 'DELETE'); replaceClass(result.class); renderTeacher(); } catch (error) { toast(error.message); } return; }
    if (t.id === 'asgGenerate') { const item = data.classes.find(c => c.id === openClassId); if (item) generateQuiz(item, t); return; }
    const drop = t.closest('[data-drop-question]');
    if (drop) { const item = data.classes.find(c => c.id === openClassId); readDraft(item); draft.questions.splice(Number(drop.dataset.dropQuestion), 1); syncDraftForm(item); return; }
    const results = t.closest('[data-results]');
    if (results) { const item = data.classes.find(c => c.id === openClassId); if ($('asgType')) readDraft(item); draft = { ...(draft || {}), openResults: draft?.openResults === results.dataset.results ? null : results.dataset.results }; renderTeacherClass(item); return; }
    const delA = t.closest('[data-delete-assignment]');
    if (delA && confirm('Delete this assignment and its results?')) { try { const result = await api(`/${openClassId}/assignments/${delA.dataset.deleteAssignment}`, 'DELETE'); replaceClass(result.class); renderTeacher(); } catch (error) { toast(error.message); } return; }
    const copyLink = t.closest('[data-copy-link]');
    if (copyLink) { try { await navigator.clipboard.writeText(copyLink.dataset.copyLink); toast('Link copied'); } catch { toast('Copy the link from the call app instead'); } return; }
    const delLesson = t.closest('[data-delete-lesson]');
    if (delLesson && confirm('Delete this live lesson? Students will no longer see it.')) { try { const result = await api(`/${openClassId}/lessons/${delLesson.dataset.deleteLesson}`, 'DELETE'); replaceClass(result.class); renderTeacher(); } catch (error) { toast(error.message); } return; }
    const delNote = t.closest('[data-delete-note]');
    if (delNote && confirm('Delete this announcement?')) { try { const result = await api(`/${openClassId}/announcements/${delNote.dataset.deleteNote}`, 'DELETE'); replaceClass(result.class); renderTeacher(); } catch (error) { toast(error.message); } return; }
    if (t.closest('[data-all-notes]')) { showAllNotes = !showAllNotes; renderStudent(); return; }
    const studentTabButton = t.closest('[data-student-tab]');
    if (studentTabButton) { studentTab = studentTabButton.dataset.studentTab; renderStudent(); return; }
    const leave = t.closest('[data-leave-class]');
    if (leave && confirm('Leave this class? Your teacher will no longer see your results for it.')) { try { await api(`/${leave.dataset.leaveClass}/leave`, 'POST', {}); data.classes = data.classes.filter(c => c.id !== leave.dataset.leaveClass); renderStudent(); renderHomeReminder(); } catch (error) { toast(error.message); } return; }
    const take = t.closest('[data-take-quiz]');
    if (take) { quiz = { classId: take.dataset.class, id: take.dataset.takeQuiz, answers: {} }; renderQuiz(); window.scrollTo({ top: 0 }); return; }
    if (t.closest('[data-quiz-back]')) { quiz = null; renderStudent(); return; }
    if (t.closest('[data-submit-quiz]')) { if (!busy) { busy = true; await submitQuiz().finally(() => { busy = false; }); } return; }
    const done = t.closest('[data-task-done]');
    if (done) { try { const result = await api(`/${done.dataset.class}/assignments/${done.dataset.taskDone}/submit`, 'POST', {}); replaceClass(result.class); trackActivity('assignments'); markActivity(); save(); toast('Task marked as done'); renderStudent(); renderHomeReminder(); } catch (error) { toast(error.message); } }
  });

  window.studylyViewHooks = window.studylyViewHooks || {};
  window.studylyViewHooks.classes = () => { quiz = null; render(); };
  // Opening Home fetches the student's classes again, so a newly scheduled lesson or announcement shows there.
  const previousHomeHook = window.studylyViewHooks.home;
  window.studylyViewHooks.home = (...args) => { previousHomeHook?.(...args); if (currentAccount && !isTeacher()) load().catch(() => {}); };
  // "Starts in 20 min" and "Live now" depend on the clock, so the home reminder refreshes every minute.
  setInterval(() => { if (data.role && !isTeacher() && !document.hidden) renderHomeReminder(); }, 60_000);
  window.studylySetupHooks = window.studylySetupHooks || {};
  window.studylySetupHooks.classes = () => { if (!isTeacher()) load().catch(() => {}); };
  window.studylyClasses = { load, pending: () => pending() };
})();
