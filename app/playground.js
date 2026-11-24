/* Studyly "Try it yourself" code playground for the online skills lessons.
   Learners edit an HTML example (with optional <style> and <script>) and see the result live, like Sololearn's
   code playground. The preview runs in a sandboxed iframe with scripts allowed but no access to Studyly itself.
   This file also styles the code blocks shown inside lessons. */
(function () {
  document.body.insertAdjacentHTML('beforeend', `<style>
  .skill-section{margin:24px 0}.skill-section h3{display:flex;align-items:center;gap:10px;margin:0 0 10px;font-size:18px}.skill-section-num{display:grid;place-items:center;flex:none;width:28px;height:28px;border-radius:50%;background:var(--soft);color:var(--accent);font-size:13px;font-weight:850}
  .skill-body .rich{font-size:15.5px;line-height:1.75}.skill-subhead{margin:16px 0 6px;font-size:15px}.skill-checklist{padding:0;list-style:none}.skill-checklist li{position:relative;margin:7px 0;padding-left:28px}.skill-checklist li:before{content:"";position:absolute;left:0;top:3px;width:16px;height:16px;border:2px solid var(--accent);border-radius:5px}
  .skill-mistakes{border-left:4px solid #e07a8c!important}.skill-task{border-left:4px solid var(--accent)!important}.skill-project{border-left:4px solid #2f9e74!important}.skill-resource{display:block;text-decoration:none;color:inherit}
  .code-card{overflow:hidden;margin:14px 0;border:1px solid #262a36;border-radius:14px;background:#0f1117}.code-head{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 10px 8px 14px;background:#171a23;color:#aeb4c8;font-size:12px;font-weight:800;letter-spacing:.4px}
  .code-btn{padding:7px 11px;border-radius:9px;background:rgba(255,255,255,.08);color:#e8eaf6;font-size:12px;font-weight:700;transition:transform .16s,filter .16s}.code-btn:active{transform:scale(.96)}.code-btn.run{background:var(--accent);color:#fff}.code-btn.run:hover{filter:brightness(1.07)}
  .code-body{margin:0;padding:14px;overflow:auto;color:#e8eaf6;font:13px/1.6 ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace;white-space:pre;tab-size:2}
  .code-output{padding:10px 14px;border-top:1px solid #262a36;background:#0b0d12}.code-output span{color:#8b93a7;font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase}.code-output pre{margin:6px 0 0;color:#9be3bf;font:13px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap}
  .playground-box{display:flex;flex-direction:column;gap:12px;width:100%;max-width:1100px;max-height:94vh;padding:18px}.playground-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:12px}.playground-head h2{margin:6px 0 0;font-size:18px}.playground-head .row{flex-wrap:nowrap}
  .playground-panes{display:grid;grid-template-columns:1fr 1fr;gap:12px;flex:1;min-height:0}.pg-pane{display:flex;flex-direction:column;gap:6px;min-height:0}.pg-label{color:var(--muted);font-size:12px;font-weight:800}.pg-label small{font-weight:600}
  #pgEditor{flex:1;min-height:360px;padding:14px;border:1px solid #262a36;border-radius:12px;background:#0f1117;color:#e8eaf6;font:13px/1.6 ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace;tab-size:2;white-space:pre;overflow:auto;resize:vertical}
  #pgPreview{flex:1;min-height:360px;border:1px solid var(--line);border-radius:12px;background:#fff}.pg-hint{margin:0;color:var(--muted);font-size:12px}
  @media(max-width:800px){.playground-box{padding:14px;max-height:96vh;overflow:auto}.playground-panes{display:flex;flex-direction:column;flex:none}.pg-pane{flex:none}#pgEditor{flex:none;height:230px;min-height:0}#pgPreview{flex:none;height:260px;min-height:0}}
  </style>
  <div class="modal" id="playgroundModal"><div class="modalBox playground-box" role="dialog" aria-modal="true" aria-labelledby="playgroundTitle" tabindex="-1">
    <div class="playground-head"><div><span class="tag">TRY IT YOURSELF</span><h2 id="playgroundTitle">Code playground</h2></div><div class="row"><button class="btn ghost" type="button" data-pg-reset>Reset</button><button class="btn" type="button" data-pg-run>Run ▶</button><button class="btn ghost" type="button" data-pg-close aria-label="Close the playground">✕</button></div></div>
    <div class="playground-panes"><div class="pg-pane"><div class="pg-label">Your code <small>· change it and the result updates</small></div><textarea id="pgEditor" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="Code editor"></textarea></div><div class="pg-pane"><div class="pg-label">Result</div><iframe id="pgPreview" title="Result of your code" sandbox="allow-scripts allow-modals"></iframe></div></div>
    <p class="pg-hint">Tip: Ctrl + Enter runs the code. Press Esc to close. Nothing you type here is saved or sent anywhere.</p>
  </div></div>`);

  const modal = document.getElementById('playgroundModal'), editor = document.getElementById('pgEditor'), preview = document.getElementById('pgPreview');
  let original = '', timer = null;
  // Key presses inside the preview never reach this page, so a small script added after the learner's code passes Esc back.
  const escBridge = '\n<script>addEventListener("keydown",e=>{if(e.key==="Escape")parent.postMessage("studyly-playground-close","*")})<\/script>';
  const run = () => { clearTimeout(timer); preview.srcdoc = editor.value + escBridge; };
  window.addEventListener('message', e => { if (e.source === preview.contentWindow && e.data === 'studyly-playground-close') modal.classList.remove('open'); });
  function open(source, title) {
    original = String(source || '');
    editor.value = original;
    document.getElementById('playgroundTitle').textContent = title || 'Code playground';
    modal.classList.add('open');
    run();
    setTimeout(() => editor.focus({ preventScroll: true }), 50);
  }
  editor.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 600); });
  editor.addEventListener('keydown', e => {
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); editor.setRangeText('  ', editor.selectionStart, editor.selectionEnd, 'end'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
  });
  modal.addEventListener('click', e => {
    if (e.target.closest('[data-pg-run]')) run();
    if (e.target.closest('[data-pg-reset]')) { editor.value = original; run(); editor.focus(); }
    if (e.target.closest('[data-pg-close]')) modal.classList.remove('open');
  });
  window.studylyPlayground = { open };
})();
