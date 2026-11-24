/* Studyly CBT & mock papers.
   A computer-based test screen in the style of the JAMB UTME (subject tabs, timer, question map, on-screen
   calculator, keyboard keys A–D / N / P / F / S), plus WAEC/NECO and BECE objective papers.
   Questions come from the saved bank first; the AI tutor writes any extra ones, which are saved for reuse.
   They are original practice questions in each exam's style, not real past questions. */
(function () {
  const $ = id => document.getElementById(id);
  const esc = value => escapeHTML(value);
  const ACTIVE_KEY = 'studyly_cbt_active';
  const JAMB_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Agricultural Science', 'Geography', 'Economics', 'Commerce', 'Financial Accounting', 'Government', 'Literature in English', 'History', 'Christian Religious Studies', 'Islamic Studies', 'Computer Studies', 'French', 'Yoruba', 'Igbo', 'Hausa', 'Visual Arts', 'Food and Nutrition'];
  const JAMB_LENGTHS = {
    quick: { label: 'Quick practice', english: 10, other: 10 },
    half: { label: 'Half paper', english: 30, other: 20 },
    full: { label: 'Full UTME', english: 60, other: 40 }
  };
  const WAEC_GRADES = [[75, 'A1'], [70, 'B2'], [65, 'B3'], [60, 'C4'], [55, 'C5'], [50, 'C6'], [45, 'D7'], [40, 'E8'], [0, 'F9']];
  let setup = { mode: 'jamb', jambSubjects: [], length: 'quick', subject: '', size: 20, exam: 'WAEC' };
  let paper = null, timer = null, preparing = false, reviewWrongOnly = false, showReview = false, calcOpen = false, calcText = '';

  document.getElementById('mainContent').insertAdjacentHTML('beforeend', `<style>
  .cbt-hero{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:25px 28px;border-radius:21px;color:#fff;background:linear-gradient(115deg,#0f1f3d,#1d4e89 65%,#2f7dc0)}.cbt-hero h1{margin:5px 0 8px;font-size:clamp(25px,3vw,36px)}.cbt-hero p{max-width:660px;margin:0;color:#dbeafe;line-height:1.6}
  .cbt-modes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.cbt-mode{display:grid;gap:4px;padding:16px;border:2px solid var(--line);border-radius:16px;background:#fff;color:var(--ink);text-align:left}.cbt-mode.active{border-color:#2f7dc0;background:#f2f8ff}.cbt-mode b{font-size:15px}.cbt-mode small{color:var(--muted)}
  .cbt-chips{display:flex;flex-wrap:wrap;gap:8px}.cbt-chip{padding:8px 12px;border:1px solid var(--line);border-radius:999px;background:#fff;color:#3c4257;font-size:13px;font-weight:700}.cbt-chip.on{border-color:#2f7dc0;background:#2f7dc0;color:#fff}.cbt-chip.fixed{border-color:#0f1f3d;background:#0f1f3d;color:#fff;cursor:default}
  .cbt-lengths{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.cbt-length{display:grid;gap:3px;padding:12px;border:2px solid var(--line);border-radius:14px;background:#fff;color:var(--ink);text-align:left}.cbt-length.active{border-color:#2f7dc0;background:#f2f8ff}.cbt-length small{color:var(--muted)}
  .cbt-row{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end}.cbt-row label{display:grid;gap:6px;color:#4a5065;font-size:13px;font-weight:700}.cbt-row select{min-width:200px;padding:11px 12px;border:1px solid var(--line);border-radius:11px;background:#fff}
  .cbt-prep{max-width:640px;margin:30px auto;text-align:center}.cbt-prep .progress{height:10px;margin:16px 0}
  .cbt-shell{overflow:hidden;border:1px solid #c9d6ea;border-radius:16px;background:#fff}.cbt-top{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 18px;background:#0f1f3d;color:#fff}.cbt-top small{display:block;color:#b8c7e0}.cbt-timer{padding:8px 14px;border-radius:10px;background:#ffffff1f;font-size:22px;font-weight:900;font-variant-numeric:tabular-nums}.cbt-timer.low{background:#c93a57}
  .cbt-tabs{display:flex;flex-wrap:wrap;gap:4px;padding:8px 10px 0;background:#e9eff8}.cbt-tab{padding:9px 14px;border:0;border-radius:10px 10px 0 0;background:transparent;color:#34405a;font-weight:800}.cbt-tab.active{background:#fff;color:#1d4e89}
  .cbt-body{display:grid;grid-template-columns:1fr 280px}.cbt-main{padding:20px 22px;border-right:1px solid #e3e9f3}.cbt-qhead{display:flex;justify-content:space-between;align-items:center;gap:10px;color:var(--muted);font-size:13px;font-weight:700}.cbt-question{margin:16px 0;font-size:19px;font-weight:700;line-height:1.55}
  .cbt-options{display:grid;gap:10px}.cbt-option{display:flex;align-items:center;gap:12px;padding:13px 14px;border:1px solid #d6dde9;border-radius:12px;background:#fff;color:var(--ink);text-align:left;font-size:15px}.cbt-option:hover{border-color:#2f7dc0}.cbt-option.picked{border-color:#2f7dc0;background:#eaf3ff}.cbt-letter{display:grid;place-items:center;flex:none;width:30px;height:30px;border-radius:50%;background:#e9eff8;color:#1d4e89;font-weight:900}.cbt-option.picked .cbt-letter{background:#2f7dc0;color:#fff}
  .cbt-navbtns{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;margin-top:18px}.cbt-side{padding:16px}.cbt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(36px,1fr));gap:6px}.cbt-num{height:34px;border:1px solid #d6dde9;border-radius:8px;background:#fff;color:#34405a;font-size:12px;font-weight:800}.cbt-num.answered{border-color:#23885f;background:#23885f;color:#fff}.cbt-num.flagged{box-shadow:inset 0 -4px 0 #e0a32c}.cbt-num.current{outline:2px solid #0f1f3d;outline-offset:1px}
  .cbt-legend{display:grid;gap:4px;margin:12px 0;color:var(--muted);font-size:12px}.cbt-legend i{display:inline-block;width:12px;height:12px;margin-right:6px;border-radius:3px;vertical-align:-2px}.cbt-side .btn{width:100%;margin-top:8px}.cbt-keys{margin:0;padding:10px 18px;border-top:1px solid #e3e9f3;background:#f7f9fc;color:var(--muted);font-size:12px}
  .cbt-calc{margin-top:10px;padding:10px;border:1px solid #d6dde9;border-radius:12px;background:#f7f9fc}.cbt-calc input{width:100%;margin-bottom:8px;padding:10px;border:1px solid #d6dde9;border-radius:8px;background:#fff;font-size:18px;font-weight:800;text-align:right}.cbt-calc-keys{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.cbt-calc-keys button{padding:9px 0;border-radius:8px;background:#fff;border:1px solid #d6dde9;font-weight:800}.cbt-calc-keys .op{background:#e9eff8;color:#1d4e89}.cbt-calc-keys .eq{background:#2f7dc0;color:#fff}
  .cbt-score{font-size:56px;font-weight:950;letter-spacing:-2px;line-height:1}.cbt-review .cls-q{margin:10px 0}
  .cbt-qrev{margin:10px 0;padding:14px;border:1px solid var(--line);border-radius:14px;background:#fff}.cbt-qrev p{margin:4px 0}.cbt-qrev .ok{color:#168c69;font-weight:800}.cbt-qrev .bad{color:#b4233c;font-weight:800}.cbt-qrev .why{margin-top:8px;padding:10px;border-radius:10px;background:#f2f8f5;font-size:13px}
  @media(max-width:900px){.cbt-body{grid-template-columns:1fr}.cbt-main{border-right:0;border-bottom:1px solid #e3e9f3}.cbt-modes,.cbt-lengths{grid-template-columns:1fr}}
  @media(max-width:700px){.cbt-hero{display:block;padding:21px}.cbt-question{font-size:17px}.cbt-timer{font-size:18px}.cbt-row select{min-width:0;width:100%}.cbt-row label{width:100%}.cbt-keys{display:none}}
  </style><section class="view" id="cbt"><div id="cbtRoot"></div></section>`);

  const shuffle = list => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clock = seconds => { const s = Math.max(0, Math.round(seconds)); return [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(n => String(n).padStart(2, '0')).join(':'); };
  const subjectsAt = levels => [...new Set(levels.flatMap(level => Object.keys(curriculum[level] || {})))];
  const label = subject => subject === 'English' ? 'Use of English' : subject;
  const saveActive = () => { try { localStorage.setItem(ACTIVE_KEY, JSON.stringify(paper)); } catch {} };
  const clearActive = () => { try { localStorage.removeItem(ACTIVE_KEY); } catch {} };

  function plan() {
    if (setup.mode === 'jamb') {
      const length = JAMB_LENGTHS[setup.length];
      const sections = [{ subject: 'English', count: length.english }, ...setup.jambSubjects.map(subject => ({ subject, count: length.other }))];
      const total = sections.reduce((n, s) => n + s.count, 0);
      return { title: `JAMB UTME practice · ${length.label}`, exam: 'JAMB / UTME', levels: ['SS1', 'SS2', 'SS3'], sections, seconds: Math.round(total * 40 / 60) * 60 };
    }
    const bece = setup.mode === 'bece', subject = setup.subject;
    return { title: `${bece ? 'BECE' : setup.exam} ${subject} · objective paper`, exam: bece ? 'BECE' : setup.exam, levels: bece ? ['JSS1', 'JSS2', 'JSS3'] : ['SS1', 'SS2', 'SS3'], sections: [{ subject, count: setup.size }], seconds: setup.size * 60 };
  }

  /* ---------- Setup ---------- */
  function renderSetup() {
    const ssSubjects = subjectsAt(['SS1', 'SS2', 'SS3']), jsSubjects = subjectsAt(['JSS1', 'JSS2', 'JSS3']);
    if (setup.mode !== 'jamb') {
      const list = setup.mode === 'bece' ? jsSubjects : ssSubjects;
      if (!list.includes(setup.subject)) setup.subject = list.includes('Mathematics') ? 'Mathematics' : list[0];
    }
    const p = plan(), history = (state.cbtHistory || []).slice(-5).reverse();
    const total = p.sections.reduce((n, s) => n + s.count, 0);
    const ready = setup.mode !== 'jamb' || setup.jambSubjects.length === 3;
    $('cbtRoot').innerHTML = `<div class="cbt-hero"><div><div class="home-eyebrow" style="color:#bfdbfe">EXAM PRACTICE</div><h1>CBT & mock papers</h1><p>Practise on a timed computer-based test screen like the JAMB UTME, or sit a WAEC, NECO or BECE objective paper. Get your score straight away and review every answer.</p></div></div>
      <h2 class="section">1. Choose the exam</h2>
      <div class="cbt-modes">${[['jamb', 'JAMB UTME (CBT)', 'Use of English + 3 subjects, scored out of 400'], ['waec', 'WAEC / NECO paper', 'One SS subject, objective questions'], ['bece', 'BECE paper', 'One JSS subject, objective questions']].map(([id, name, note]) => `<button class="cbt-mode ${setup.mode === id ? 'active' : ''}" type="button" data-cbt-mode="${id}"><b>${name}</b><small>${note}</small></button>`).join('')}</div>
      <h2 class="section">2. ${setup.mode === 'jamb' ? 'Pick 3 subjects' : 'Choose the paper'}</h2>
      ${setup.mode === 'jamb' ? `<div class="card"><p class="muted" style="margin-top:0">Use of English is compulsory. Pick the 3 subjects for your course (${setup.jambSubjects.length}/3 chosen).</p><div class="cbt-chips"><span class="cbt-chip fixed">Use of English ✓</span>${JAMB_SUBJECTS.filter(s => ssSubjects.includes(s)).map(s => `<button class="cbt-chip ${setup.jambSubjects.includes(s) ? 'on' : ''}" type="button" data-jamb-subject="${esc(s)}">${esc(s)}</button>`).join('')}</div>
        <h3>Length</h3><div class="cbt-lengths">${Object.entries(JAMB_LENGTHS).map(([id, l]) => { const n = l.english + 3 * l.other; return `<button class="cbt-length ${setup.length === id ? 'active' : ''}" type="button" data-jamb-length="${id}"><b>${l.label}</b><small>${n} questions · ${Math.round(n * 40 / 60)} minutes</small><small>English ${l.english} · others ${l.other} each</small></button>`; }).join('')}</div></div>`
        : `<div class="card cbt-row">${setup.mode === 'waec' ? `<label>Exam<select id="cbtExam">${['WAEC', 'NECO'].map(x => `<option ${setup.exam === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>` : ''}<label>Subject<select id="cbtSubject">${(setup.mode === 'bece' ? jsSubjects : ssSubjects).map(s => `<option ${setup.subject === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label><label>Questions<select id="cbtSize">${[20, 30, 50].map(n => `<option value="${n}" ${setup.size === n ? 'selected' : ''}>${n} questions · ${n} minutes</option>`).join('')}</select></label></div>`}
      <div class="card section"><div class="between"><div><h2 style="margin:0">${esc(p.title)}</h2><p class="muted" style="margin:6px 0 0">${total} questions · ${Math.round(p.seconds / 60)} minutes · ${p.sections.map(s => esc(label(s.subject))).join(', ') || 'choose subjects'}</p></div><div style="text-align:right"><button class="btn" type="button" data-cbt-start ${ready ? '' : 'disabled'}>Start exam →</button>${ready ? '' : `<small class="muted" style="display:block;margin-top:6px">Pick ${3 - setup.jambSubjects.length} more subject${3 - setup.jambSubjects.length === 1 ? '' : 's'} above to start</small>`}</div></div><p class="muted" style="font-size:12px;margin:12px 0 0">Questions come from Studyly's saved bank; the AI tutor writes any extra ones and saves them for next time. They are original practice questions in the exam's style, not real past questions. A long paper can take a minute or two to prepare the first time.</p></div>
      ${history.length ? `<div class="card section"><h2>Recent attempts</h2><div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Paper</th><th>Score</th></tr></thead><tbody>${history.map(h => `<tr><td>${esc(new Date(h.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))}</td><td>${esc(h.title)}</td><td><b>${h.mode === 'jamb' ? `${h.score} / ${h.max}` : `${h.score}%`}</b></td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
  }

  /* ---------- Preparing the paper ---------- */
  // Subjects are prepared at the same time, so a four-subject JAMB paper takes about as long as one subject.
  async function prepare() {
    if (preparing) return;
    const p = plan();
    preparing = true;
    const need = p.sections.reduce((n, s) => n + s.count, 0);
    const status = p.sections.map(s => ({ subject: s.subject, have: 0, want: s.count }));
    let lastError = null;
    const draw = () => {
      if (!preparing) return;
      const done = status.reduce((n, s) => n + Math.min(s.have, s.want), 0);
      $('cbtRoot').innerHTML = `<div class="card cbt-prep"><h2>Preparing your paper…</h2><div class="progress"><i style="width:${Math.round(done / need * 100)}%"></i></div>${status.map(s => `<div class="between" style="padding:6px 0;border-bottom:1px solid var(--line)"><span>${esc(label(s.subject))}</span><b>${Math.min(s.have, s.want)} / ${s.want}${s.have >= s.want ? ' ✓' : ''}</b></div>`).join('')}<p class="muted" style="font-size:12px;margin-top:14px">The AI tutor is writing the questions that are not in the saved bank yet. This usually takes under a minute, longer when Google's servers are busy. Keep this page open.</p></div>`;
    };
    const buildSection = async (section, st) => {
      const levels = p.levels.filter(level => curriculum[level]?.[section.subject]);
      const picked = shuffle(questions.filter(q => levels.includes(q.c) && q.s === section.subject)).slice(0, section.count);
      st.have = picked.length; draw();
      let batch = 0, failures = 0;
      while (picked.length < section.count && failures < 3 && levels.length) {
        const level = levels[batch++ % levels.length], topics = shuffle(curriculum[level][section.subject]).slice(0, 8);
        try {
          const result = await requestAI({ kind: 'questions', class: level, subject: section.subject, topic: topics[0], topics, count: Math.min(10, section.count - picked.length), exam: p.exam });
          const added = addAIQuestions(level, section.subject, result.questions).filter(q => !picked.includes(q));
          if (!added.length) failures++;
          picked.push(...added);
        } catch (error) { lastError = error; failures++; if (/limit|quota/i.test(error.message)) break; }
        st.have = picked.length; draw();
      }
      return { subject: section.subject, questions: shuffle(picked.slice(0, section.count)) };
    };
    draw();
    let built;
    try { built = await Promise.all(p.sections.map((section, i) => buildSection(section, status[i]))); }
    finally { preparing = false; }
    const have = built.reduce((n, s) => n + s.questions.length, 0);
    if (!have || (have < need && !confirm(`Only ${have} of ${need} questions could be prepared${lastError ? ` (${lastError.message})` : ''}. Start with these anyway?`))) {
      if (!have) toast(lastError ? lastError.message : 'No questions could be prepared. Try again later.');
      renderSetup();
      return;
    }
    const seconds = setup.mode === 'jamb' ? Math.max(5, Math.round(have * 40 / 60)) * 60 : have * 60;
    paper = {
      mode: setup.mode, title: p.title, candidate: state.profile.name, startedAt: Date.now(), endAt: Date.now() + seconds * 1000, seconds,
      sections: built.filter(s => s.questions.length).map(s => ({ subject: s.subject, questions: s.questions.map(q => ({ c: q.c, s: q.s, t: q.t, q: q.q, a: q.a, correct: q.correct, e: q.e })), answers: {}, flags: {} })),
      current: { s: 0, i: 0 }, submitted: false
    };
    saveActive();
    startTimer();
    renderExam();
  }

  /* ---------- Exam screen ---------- */
  function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
      if (!paper || paper.submitted) { clearInterval(timer); return; }
      const left = (paper.endAt - Date.now()) / 1000;
      const el = $('cbtTimer');
      if (el) { el.textContent = clock(left); el.classList.toggle('low', left < 300); }
      if (left <= 0) { toast('Time is up. Your paper has been submitted.'); submit(true); }
    }, 1000);
  }
  function renderExam() {
    const sec = paper.sections[paper.current.s], q = sec.questions[paper.current.i], picked = sec.answers[paper.current.i];
    const answered = s => Object.keys(s.answers).length;
    $('cbtRoot').innerHTML = `<div class="cbt-shell">
      <div class="cbt-top"><div><b>${esc(paper.title)}</b><small>Candidate: ${esc(paper.candidate)}</small></div><div class="cbt-timer" id="cbtTimer" role="timer" aria-label="Time left">${clock((paper.endAt - Date.now()) / 1000)}</div></div>
      <div class="cbt-tabs" role="tablist">${paper.sections.map((s, i) => `<button class="cbt-tab ${i === paper.current.s ? 'active' : ''}" type="button" role="tab" data-cbt-section="${i}">${esc(label(s.subject))} (${answered(s)}/${s.questions.length})</button>`).join('')}</div>
      <div class="cbt-body"><div class="cbt-main">
        <div class="cbt-qhead"><span>Question ${paper.current.i + 1} of ${sec.questions.length} · ${esc(label(sec.subject))}</span><button class="btn ghost" type="button" data-cbt-flag style="padding:7px 11px;font-size:12px">${sec.flags[paper.current.i] ? '⚑ Flagged' : '⚐ Flag for review'}</button></div>
        <div class="cbt-question">${questionHTML(q.q)}</div>
        <div class="cbt-options" role="radiogroup">${q.a.map((option, j) => `<button class="cbt-option ${picked === j ? 'picked' : ''}" type="button" role="radio" aria-checked="${picked === j}" data-cbt-pick="${j}"><span class="cbt-letter">${String.fromCharCode(65 + j)}</span><span>${questionHTML(option)}</span></button>`).join('')}</div>
        <div class="cbt-navbtns"><button class="btn ghost" type="button" data-cbt-move="-1">← Previous</button><button class="btn" type="button" data-cbt-move="1">Next →</button></div>
      </div><aside class="cbt-side">
        <div class="cbt-grid">${sec.questions.map((_, i) => `<button class="cbt-num ${sec.answers[i] !== undefined ? 'answered' : ''} ${sec.flags[i] ? 'flagged' : ''} ${i === paper.current.i ? 'current' : ''}" type="button" data-cbt-jump="${i}" aria-label="Question ${i + 1}">${i + 1}</button>`).join('')}</div>
        <div class="cbt-legend"><span><i style="background:#23885f"></i>Answered</span><span><i style="background:#fff;border:1px solid #d6dde9"></i>Not answered</span><span><i style="background:#e0a32c"></i>Flagged</span></div>
        <button class="btn ghost" type="button" data-cbt-calc>🧮 ${calcOpen ? 'Hide calculator' : 'Calculator'}</button>${calcOpen ? calculatorHtml() : ''}
        <button class="btn" type="button" data-cbt-submit>Submit paper</button>
      </aside></div>
      <p class="cbt-keys">Keyboard: A, B, C, D choose an answer · N next · P previous · F flag · S submit</p></div>`;
  }
  function calculatorHtml() {
    const keys = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '(', ')', '√', 'x²', 'C', '+', '⌫', '%', '='];
    return `<div class="cbt-calc"><input id="cbtCalcDisplay" readonly value="${esc(calcText)}" aria-label="Calculator display"><div class="cbt-calc-keys">${keys.map(k => `<button type="button" class="${/[÷×−+%√]|x²/.test(k) ? 'op' : k === '=' ? 'eq' : ''}" data-calc="${esc(k)}" ${k === '=' ? 'style="grid-column:span 2"' : ''}>${esc(k)}</button>`).join('')}</div></div>`;
  }
  function pressCalc(key) {
    if (key === 'C') calcText = '';
    else if (key === '⌫') calcText = calcText.slice(0, -1);
    else if (key === '=') {
      const expr = calcText.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/√/g, 'Math.sqrt').replace(/²/g, '**2').replace(/%/g, '/100');
      try {
        if (!/^(?:[0-9+\-*/().\s]|Math\.sqrt)*$/.test(expr)) throw new Error();
        const value = Function(`"use strict";return (${expr})`)();
        calcText = Number.isFinite(value) ? String(Math.round(value * 1e10) / 1e10) : 'Error';
      } catch { calcText = 'Error'; }
    } else {
      if (calcText === 'Error') calcText = '';
      calcText += key === '√' ? '√(' : key === 'x²' ? '²' : key;
    }
    const display = $('cbtCalcDisplay');
    if (display) display.value = calcText;
  }
  function pick(j) { const sec = paper.sections[paper.current.s]; if (j < sec.questions[paper.current.i].a.length) { sec.answers[paper.current.i] = j; saveActive(); renderExam(); } }
  function move(step) {
    const sec = paper.sections[paper.current.s], next = paper.current.i + step;
    if (next >= 0 && next < sec.questions.length) paper.current.i = next;
    else if (next >= sec.questions.length && paper.current.s < paper.sections.length - 1) paper.current = { s: paper.current.s + 1, i: 0 };
    else if (next < 0 && paper.current.s > 0) paper.current = { s: paper.current.s - 1, i: paper.sections[paper.current.s - 1].questions.length - 1 };
    saveActive(); renderExam();
  }
  function submit(timeUp) {
    if (!paper || paper.submitted) return;
    if (!timeUp) {
      const left = paper.sections.reduce((n, s) => n + s.questions.length - Object.keys(s.answers).length, 0);
      if (!confirm(left ? `You have ${left} unanswered question${left === 1 ? '' : 's'}. Submit your paper now?` : 'Submit your paper now?')) return;
    }
    clearInterval(timer);
    paper.submitted = true;
    paper.finishedAt = Date.now();
    let totalCorrect = 0, totalQuestions = 0;
    paper.sections.forEach(sec => {
      sec.correct = 0;
      sec.questions.forEach((q, i) => {
        const right = sec.answers[i] === q.correct, key = topicKey(q.c, q.s, q.t), stat = state.topicStats[key] || { attempts: 0, correct: 0 };
        stat.attempts++; if (right) { stat.correct++; sec.correct++; } state.topicStats[key] = stat;
        const qKey = questionKey(q);
        if (right) state.missedQuestions = state.missedQuestions.filter(k => k !== qKey);
        else if (!state.missedQuestions.includes(qKey)) state.missedQuestions.push(qKey);
      });
      totalCorrect += sec.correct; totalQuestions += sec.questions.length;
    });
    state.attempts += totalQuestions; state.correct += totalCorrect; state.xp += 3 * totalCorrect;
    const jamb = paper.mode === 'jamb';
    const score = jamb ? paper.sections.reduce((n, s) => n + Math.round(s.correct / s.questions.length * 100), 0) : Math.round(totalCorrect / Math.max(1, totalQuestions) * 100);
    paper.result = { score, max: jamb ? paper.sections.length * 100 : 100, correct: totalCorrect, total: totalQuestions };
    state.cbtHistory = [...(state.cbtHistory || []), { date: new Date().toISOString(), mode: paper.mode, title: paper.title, score, max: paper.result.max, sections: paper.sections.map(s => ({ subject: s.subject, correct: s.correct, total: s.questions.length })) }].slice(-20);
    trackActivity('questions', totalQuestions); trackActivity('correct', totalCorrect); trackActivity('mocks');
    markActivity(); save(); clearActive();
    showReview = false; reviewWrongOnly = false;
    renderResults();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- Results ---------- */
  function renderResults() {
    const r = paper.result, jamb = paper.mode === 'jamb';
    const grade = WAEC_GRADES.find(([min]) => r.score >= min)[1];
    const minutes = Math.max(1, Math.round((paper.finishedAt - paper.startedAt) / 60000));
    const byTopic = {};
    paper.sections.forEach(sec => sec.questions.forEach((q, i) => { const k = `${label(q.s)} · ${q.t}`; byTopic[k] ||= { right: 0, total: 0 }; byTopic[k].total++; if (sec.answers[i] === q.correct) byTopic[k].right++; }));
    const weak = Object.entries(byTopic).filter(([, v]) => v.right / v.total < 0.6).sort((a, b) => a[1].right / a[1].total - b[1].right / b[1].total).slice(0, 6);
    $('cbtRoot').innerHTML = `<div class="card"><div class="between"><div><span class="tag">RESULT</span><h1 style="margin:8px 0 4px">${esc(paper.title)}</h1><p class="muted" style="margin:0">${r.correct} of ${r.total} correct · ${minutes} minute${minutes === 1 ? '' : 's'}</p></div><div style="text-align:right"><div class="cbt-score">${jamb ? `${r.score}<span style="font-size:24px;color:var(--muted)">/${r.max}</span>` : `${r.score}%`}</div>${jamb ? '' : `<span class="tag">Rough grade guide: ${grade}</span>`}</div></div>
      <div class="table-wrap section"><table class="table"><thead><tr><th>Subject</th><th>Correct</th><th>${jamb ? 'Score /100' : 'Percentage'}</th></tr></thead><tbody>${paper.sections.map(s => `<tr><td>${esc(label(s.subject))}</td><td>${s.correct} / ${s.questions.length}</td><td><b>${Math.round(s.correct / s.questions.length * 100)}</b></td></tr>`).join('')}</tbody></table></div>
      ${jamb ? '<p class="muted" style="font-size:12px">Each subject is scored out of 100, like the UTME total of 400. Real UTME scores are calculated by JAMB and can differ.</p>' : '<p class="muted" style="font-size:12px">The grade guide uses common WAEC bands on this objective paper only; real results also include theory papers.</p>'}
      <div class="cls-actions" style="display:flex;flex-wrap:wrap;gap:8px"><button class="btn" type="button" data-cbt-review>${showReview ? 'Hide answers' : 'Review answers'}</button><button class="btn ghost" type="button" data-cbt-again>Take another paper</button></div></div>
      ${weak.length ? `<div class="card section"><h2>Topics to revise</h2><p class="muted">You scored below 60% on these. Revise them, then try another paper.</p><div class="list">${weak.map(([topic, v]) => `<div class="between" style="padding:10px 0;border-bottom:1px solid var(--line)"><span>${esc(topic)}</span><b>${v.right}/${v.total}</b></div>`).join('')}</div></div>` : ''}
      ${showReview ? `<div class="card section cbt-review"><div class="between"><h2 style="margin:0">Your answers</h2><label class="row"><input type="checkbox" data-cbt-wrong ${reviewWrongOnly ? 'checked' : ''}> Show only questions I got wrong</label></div>${paper.sections.map(sec => sec.questions.map((q, i) => ({ sec, q, i })).filter(x => !reviewWrongOnly || x.sec.answers[x.i] !== x.q.correct).map(({ sec, q, i }) => {
        const mine = sec.answers[i], right = mine === q.correct;
        return `<div class="cbt-qrev"><small class="muted">${esc(label(sec.subject))} · Question ${i + 1} · ${esc(q.t)}</small><p><b>${questionHTML(q.q)}</b></p><p class="${right ? 'ok' : 'bad'}">${mine === undefined ? 'Not answered' : `Your answer: ${String.fromCharCode(65 + mine)}. ${questionHTML(q.a[mine])} ${right ? '✓' : '✗'}`}</p>${right ? '' : `<p class="ok">Correct answer: ${String.fromCharCode(65 + q.correct)}. ${questionHTML(q.a[q.correct])}</p>`}${q.e ? `<p class="why">${esc(q.e)}</p>` : ''}</div>`;
      }).join('')).join('') || '<p class="muted">No wrong answers to show. Well done!</p>'}</div>` : ''}`;
  }

  function render() {
    if (currentAccount?.role === 'teacher') return;
    if (!paper) { try { const saved = JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null'); if (saved?.sections && !saved.submitted) paper = saved; } catch { clearActive(); } }
    if (paper && !paper.submitted) {
      if (paper.endAt <= Date.now()) { submit(true); return; }
      startTimer(); renderExam(); return;
    }
    if (paper?.submitted) { renderResults(); return; }
    if (!preparing) renderSetup();
  }

  document.addEventListener('click', e => {
    const t = e.target;
    if (!t.closest('#cbt')) return;
    const mode = t.closest('[data-cbt-mode]');
    if (mode) { setup.mode = mode.dataset.cbtMode; renderSetup(); return; }
    const subject = t.closest('[data-jamb-subject]');
    if (subject) { const s = subject.dataset.jambSubject, list = setup.jambSubjects; setup.jambSubjects = list.includes(s) ? list.filter(x => x !== s) : list.length < 3 ? [...list, s] : list; if (list.length === 3 && !list.includes(s)) toast('You can choose 3 subjects. Untick one first.'); renderSetup(); return; }
    const length = t.closest('[data-jamb-length]');
    if (length) { setup.length = length.dataset.jambLength; renderSetup(); return; }
    if (t.closest('[data-cbt-start]')) { prepare(); return; }
    if (!paper) return;
    const pickBtn = t.closest('[data-cbt-pick]');
    if (pickBtn) { pick(Number(pickBtn.dataset.cbtPick)); return; }
    const moveBtn = t.closest('[data-cbt-move]');
    if (moveBtn) { move(Number(moveBtn.dataset.cbtMove)); return; }
    const jump = t.closest('[data-cbt-jump]');
    if (jump) { paper.current.i = Number(jump.dataset.cbtJump); renderExam(); return; }
    const section = t.closest('[data-cbt-section]');
    if (section) { paper.current = { s: Number(section.dataset.cbtSection), i: 0 }; renderExam(); return; }
    if (t.closest('[data-cbt-flag]')) { const sec = paper.sections[paper.current.s]; sec.flags[paper.current.i] = !sec.flags[paper.current.i]; saveActive(); renderExam(); return; }
    if (t.closest('[data-cbt-calc]')) { calcOpen = !calcOpen; renderExam(); return; }
    const key = t.closest('[data-calc]');
    if (key) { pressCalc(key.dataset.calc); return; }
    if (t.closest('[data-cbt-submit]')) { submit(false); return; }
    if (t.closest('[data-cbt-review]')) { showReview = !showReview; renderResults(); return; }
    if (t.closest('[data-cbt-again]')) { paper = null; renderSetup(); window.scrollTo({ top: 0 }); }
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'cbtSubject') { setup.subject = e.target.value; renderSetup(); }
    if (e.target.id === 'cbtSize') { setup.size = Number(e.target.value); renderSetup(); }
    if (e.target.id === 'cbtExam') { setup.exam = e.target.value; renderSetup(); }
    if (e.target.matches('[data-cbt-wrong]')) { reviewWrongOnly = e.target.checked; renderResults(); }
  });
  document.addEventListener('keydown', e => {
    if (!paper || paper.submitted || !$('cbt')?.classList.contains('active') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || document.querySelector('.modal.open')) return;
    const key = e.key.toLowerCase();
    if ('abcd'.includes(key) && key.length === 1) { e.preventDefault(); pick(key.charCodeAt(0) - 97); }
    else if (key === 'n') { e.preventDefault(); move(1); }
    else if (key === 'p') { e.preventDefault(); move(-1); }
    else if (key === 'f') { e.preventDefault(); document.querySelector('[data-cbt-flag]')?.click(); }
    else if (key === 's') { e.preventDefault(); submit(false); }
  });

  window.studylyViewHooks = window.studylyViewHooks || {};
  window.studylyViewHooks.cbt = render;
})();
