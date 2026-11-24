/* Studyly weekly report for parents.
   Adds a card to the Progress page that summarises the last 7 days (from the daily activity counters),
   with buttons to share it on WhatsApp, copy it, or print / save it as a PDF. */
(function () {
  const $ = id => document.getElementById(id);
  const esc = value => escapeHTML(value);

  document.getElementById('progress').insertAdjacentHTML('beforeend', `<style>
  .report-card .between{flex-wrap:wrap}.report{margin-top:16px;padding:22px;border:1px solid var(--line);border-radius:18px;background:#fff}.report h2{margin:0}.report-sub{margin:4px 0 16px;color:var(--muted)}
  .report-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.report-stat{padding:12px;border:1px solid var(--line);border-radius:13px;background:#fafbff}.report-stat b{display:block;font-size:22px}.report-stat span{color:var(--muted);font-size:12px}
  .report h3{margin:18px 0 6px;font-size:15px}.report ul{margin:0;padding-left:20px;line-height:1.7}.report-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.report-actions .btn{text-decoration:none}
  @media(max-width:700px){.report-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media print{body.print-report *{visibility:hidden!important}body.print-report #parentReport,body.print-report #parentReport *{visibility:visible!important}body.print-report #parentReport{position:absolute;top:0;left:0;width:100%;border:0}body.print-report .report-actions{display:none!important}}
  </style><div class="section card report-card"><div class="between"><div><h2 style="margin:0">Weekly report for parents</h2><p class="muted" style="margin:6px 0 0">A short summary of the last 7 days that you can share with a parent or guardian.</p></div><button class="btn" type="button" id="makeParentReport">Create this week's report</button></div><div id="parentReport" hidden></div></div>`);

  const day = offset => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - offset); return d; };
  const nice = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  async function build() {
    const start = dayKey(day(6)), counts = { questions: 0, correct: 0, cards: 0, tutor: 0, skills: 0, mocks: 0, assignments: 0 };
    Object.entries(state.daily || {}).filter(([key]) => key >= start).forEach(([, c]) => Object.keys(counts).forEach(k => { counts[k] += Number(c?.[k]) || 0; }));
    const activeDays = (state.activityDates || []).filter(key => key >= start).length;
    const stats = Object.entries(state.topicStats || {}).map(([key, v]) => { const [cls, subject, topic] = key.split('::'); return { cls, subject, topic, attempts: v.attempts, pct: Math.round(v.correct / Math.max(1, v.attempts) * 100) }; });
    const weak = stats.filter(s => s.attempts >= 2 && s.pct < 70).sort((a, b) => a.pct - b.pct).slice(0, 4);
    const strong = stats.filter(s => s.attempts >= 3 && s.pct >= 80).sort((a, b) => b.pct - a.pct).slice(0, 4);
    const mocks = (state.cbtHistory || []).filter(h => dayKey(new Date(h.date)) >= start);
    let pending = [], doneThisWeek = 0;
    try {
      await window.studylyClasses?.load();
      pending = window.studylyClasses?.pending() || [];
    } catch {}
    doneThisWeek = counts.assignments;
    const due = window.studylyRevise?.summary()?.due || 0;
    const accuracy = counts.questions ? Math.round(counts.correct / counts.questions * 100) : null;

    const steps = [];
    if (activeDays < 4) steps.push('Aim to study on at least 4 days next week. Even 15 minutes a day helps.');
    weak.slice(0, 2).forEach(w => steps.push(`Revise ${w.topic} (${w.subject}) with the lesson note and flashcards, then practise it again.`));
    if (pending.length) steps.push(`Finish ${pending.length} class assignment${pending.length === 1 ? '' : 's'} set by the teacher.`);
    if (due) steps.push(`Review the ${due} flashcard${due === 1 ? '' : 's'} due in Revise.`);
    if (!mocks.length && /^(JSS3|SS2|SS3)$/.test(state.profile.class)) steps.push('Take a timed mock paper to practise working under exam time.');
    if (accuracy !== null && accuracy >= 80 && counts.questions >= 20) steps.push('Accuracy is strong. Move on to harder topics or a longer mock paper.');
    if (!steps.length) steps.push('Keep up the steady work and try one new topic next week.');

    return { start: day(6), end: day(0), counts, activeDays, weak, strong, mocks, pending, doneThisWeek, accuracy, steps };
  }

  function lines(r) {
    const name = state.profile.name || 'Student', school = state.profile.school ? `, ${state.profile.school}` : '';
    const out = [
      `Studyly weekly report — ${name} (${state.profile.class}${school})`,
      `${nice(r.start)} – ${nice(r.end)} ${r.end.getFullYear()}`,
      '',
      `• Studied on ${r.activeDays} of 7 days · current streak ${state.streak || 0} day${state.streak === 1 ? '' : 's'}`,
      `• Practice questions: ${r.counts.questions} answered${r.accuracy === null ? '' : `, ${r.accuracy}% correct`}`,
      `• Flashcards reviewed: ${r.counts.cards}`,
      `• Questions asked to the AI tutor: ${r.counts.tutor}`
    ];
    if (r.counts.skills) out.push(`• Online skills: ${r.counts.skills} chapter exam${r.counts.skills === 1 ? '' : 's'} passed`);
    if (r.mocks.length) out.push(`• Mock papers: ${r.mocks.map(m => `${m.title.replace(/ · .*$/, '')} ${m.mode === 'jamb' ? `${m.score}/${m.max}` : `${m.score}%`}`).join('; ')}`);
    if (r.doneThisWeek || r.pending.length) out.push(`• Class assignments: ${r.doneThisWeek} completed this week${r.pending.length ? `, ${r.pending.length} still to do` : ''}`);
    if (r.strong.length) out.push('', 'Doing well in: ' + r.strong.map(s => `${s.topic} (${s.pct}%)`).join(', '));
    if (r.weak.length) out.push('', 'Needs more practice: ' + r.weak.map(s => `${s.topic} (${s.pct}%)`).join(', '));
    out.push('', 'Next steps:', ...r.steps.map(s => `- ${s}`));
    return out;
  }

  async function show() {
    const button = $('makeParentReport'), box = $('parentReport');
    button.disabled = true; button.textContent = 'Preparing report…';
    try {
      const r = await build(), text = lines(r).join('\n');
      const stat = (value, label) => `<div class="report-stat"><b>${value}</b><span>${label}</span></div>`;
      box.hidden = false;
      box.className = 'report';
      box.innerHTML = `<h2>Weekly report: ${esc(state.profile.name || 'Student')}</h2><p class="report-sub">${esc(state.profile.class)}${state.profile.school ? ' · ' + esc(state.profile.school) : ''} · ${esc(nice(r.start))} – ${esc(nice(r.end))} ${r.end.getFullYear()}</p>
        <div class="report-stats">${stat(`${r.activeDays}/7`, 'days studied')}${stat(r.counts.questions, 'practice questions')}${stat(r.accuracy === null ? '—' : r.accuracy + '%', 'correct')}${stat(r.counts.cards, 'flashcards reviewed')}${stat(r.counts.tutor, 'tutor questions')}${stat(state.streak || 0, 'day streak')}${stat(r.mocks.length, 'mock papers')}${stat(r.doneThisWeek, 'assignments done')}</div>
        ${r.mocks.length ? `<h3>Mock papers</h3><ul>${r.mocks.map(m => `<li>${esc(m.title)}: <b>${m.mode === 'jamb' ? `${m.score}/${m.max}` : `${m.score}%`}</b></li>`).join('')}</ul>` : ''}
        ${r.strong.length ? `<h3>Doing well in</h3><ul>${r.strong.map(s => `<li>${esc(s.topic)} <span class="muted">(${esc(s.subject)}, ${s.pct}%)</span></li>`).join('')}</ul>` : ''}
        ${r.weak.length ? `<h3>Needs more practice</h3><ul>${r.weak.map(s => `<li>${esc(s.topic)} <span class="muted">(${esc(s.subject)}, ${s.pct}%)</span></li>`).join('')}</ul>` : ''}
        ${r.pending.length ? `<h3>Class assignments still to do</h3><ul>${r.pending.slice(0, 6).map(a => `<li>${esc(a.title)} <span class="muted">(${esc(a.className)}${a.dueDate ? ', due ' + esc(a.dueDate) : ''})</span></li>`).join('')}</ul>` : ''}
        <h3>Next steps</h3><ul>${r.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
        <div class="report-actions"><a class="btn" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener noreferrer">Share on WhatsApp</a><button class="btn ghost" type="button" id="copyParentReport">Copy text</button><button class="btn ghost" type="button" id="printParentReport">Print or save as PDF</button></div>`;
      box.dataset.text = text;
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } finally { button.disabled = false; button.textContent = "Create this week's report"; }
  }

  document.addEventListener('click', async e => {
    if (e.target.id === 'makeParentReport') show();
    if (e.target.id === 'copyParentReport') { try { await navigator.clipboard.writeText($('parentReport').dataset.text || ''); toast('Report copied'); } catch { toast('Select the report text to copy it'); } }
    if (e.target.id === 'printParentReport') { document.body.classList.add('print-report'); window.print(); }
  });
  window.addEventListener('afterprint', () => document.body.classList.remove('print-report'));
  window.studylySetupHooks = window.studylySetupHooks || {};
  window.studylySetupHooks.report = () => { const box = $('parentReport'); if (box) { box.hidden = true; box.innerHTML = ''; } };
})();
