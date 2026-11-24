/* Studyly landing page, shown first to visitors who are not logged in.
   It is drawn inside a shadow root so its styles and the app's styles cannot affect each other, and it is only
   built when a logged-out visitor arrives. "Create your account" and "Log in" open the existing forms on the
   auth screen (#signup and #login in the address bar, so the browser's Back button returns here).
   Every number and feature on the page describes what Studyly really has; update them if the app changes. */
(function () {
  const host = document.getElementById('landing');
  const authScreen = document.getElementById('authScreen');
  if (!host || !authScreen) return;
  const AUTH_HASH = /^#(login|signup)$/;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let root = null, loggedOut = false;

  const check = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  const arrow = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  const ck = text => `<li><span class="ck">${check}</span><span>${text}</span></li>`;
  const icons = {
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7zM2 12l10 5 10-5M2 17l10 5 10-5"/>',
    timer: '<path d="M10 2h4M12 14l3-3"/><circle cx="12" cy="14" r="8"/>',
    code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    chart: '<path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    cap: '<path d="M21.42 10.92a1 1 0 0 0-.02-1.84L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.83l8.57 3.91a2 2 0 0 0 1.66 0zM22 10v6M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>'
  };
  const icon = name => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;

  const css = `
:host{--font-display:"Syne",system-ui,-apple-system,"Segoe UI",sans-serif;--font-body:"DM Sans",system-ui,-apple-system,"Segoe UI",sans-serif;--mono:ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace;--ease:cubic-bezier(.2,0,0,1);--max:1160px;
  color-scheme:dark;--bg:#121212;--panel:#1b1b1e;--panel2:#212125;--panel3:#2a2a2f;--ink:#f6f5f8;--text:#c7c6d3;--muted:#8b8a91;--line:#2b2b30;--line2:#3e3e44;--accent:#e1bac5;--accent-ink:#121212;--grad:linear-gradient(135deg,#e1bac5 0%,#b68362 100%);--soft:rgba(225,186,197,.1);--soft2:rgba(225,186,197,.18);--good:#72d7aa;--good-ink:#0b1a13;--good-soft:rgba(114,215,170,.12);--bad:#ff8a9b;--bad-ink:#2a0a10;--bad-soft:rgba(255,138,155,.12);--shadow:0 1px 0 rgba(255,255,255,.04) inset,0 0 0 1px rgba(255,255,255,.06),0 18px 40px rgba(0,0,0,.42);--glow1:rgba(225,186,197,.13);--glow2:rgba(182,131,98,.13);--nav-bg:rgba(18,18,18,.74);
  display:block;min-height:100vh;font-family:var(--font-body);font-size:16px;line-height:1.6;color:var(--text);background:radial-gradient(900px 560px at 85% -8%,var(--glow1),transparent 60%),radial-gradient(800px 520px at -10% 38%,var(--glow2),transparent 60%),var(--bg);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;overflow-x:clip}
:host([hidden]){display:none}
:host([data-theme="light"]){color-scheme:light;--bg:#f6f7fb;--panel:#fff;--panel2:#f3f4f8;--panel3:#e8eaf2;--ink:#111827;--text:#344054;--muted:#667085;--line:#e6e8ef;--line2:#d3d7e2;--accent:#6d5dfc;--accent-ink:#fff;--grad:linear-gradient(135deg,#7d70ff 0%,#5847ee 100%);--soft:#efedff;--soft2:#e2deff;--good:#0f9d74;--good-ink:#fff;--good-soft:#e3f7f0;--bad:#d9365e;--bad-ink:#fff;--bad-soft:#fde8ee;--shadow:0 0 0 1px rgba(17,24,39,.06),0 1px 2px rgba(17,24,39,.04),0 14px 34px rgba(17,24,39,.08);--glow1:rgba(109,93,252,.11);--glow2:rgba(23,184,151,.09);--nav-bg:rgba(246,247,251,.8)}
*,*::before,*::after{box-sizing:border-box}
h1,h2,h3{margin:0;font-family:var(--font-display);color:var(--ink);line-height:1.08;letter-spacing:-.025em;text-wrap:balance}
p,li{text-wrap:pretty}
a{color:inherit}
b,strong{color:var(--ink)}
button{font-family:inherit}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
::selection{background:var(--soft2);color:var(--ink)}
section{scroll-margin-top:76px}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.wrap{width:100%;max-width:var(--max);margin:0 auto;padding:0 24px}
.num{font-variant-numeric:tabular-nums}
.ic{fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}

.brand{padding:0;border:0;background:none;font-family:var(--font-display);font-size:22px;font-weight:800;letter-spacing:.08em;color:var(--ink);cursor:pointer}
.brand span{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:0 22px;border:0;border-radius:999px;background:var(--grad);color:var(--accent-ink);font:600 15px/1 var(--font-body);white-space:nowrap;cursor:pointer;transition-property:transform,filter,box-shadow;transition-duration:.16s;transition-timing-function:var(--ease)}
.btn:hover{filter:brightness(1.06);box-shadow:0 10px 26px var(--glow1)}
.btn:active{transform:scale(.96)}
.btn.ghost{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 1px var(--line2)}
.btn.ghost:hover{filter:none;box-shadow:inset 0 0 0 1px var(--accent)}
.btn.lg{min-height:54px;padding:0 28px;font-size:16px}
.btn.sm{min-height:42px;padding:0 16px;font-size:14px}
.btn svg{width:18px;height:18px;transition:transform .2s var(--ease)}
.btn:hover svg{transform:translateX(3px)}

.nav{position:sticky;top:0;z-index:50;transition:background-color .2s var(--ease),box-shadow .2s var(--ease)}
.nav.scrolled{background:var(--nav-bg);-webkit-backdrop-filter:saturate(1.4) blur(14px);backdrop-filter:saturate(1.4) blur(14px);box-shadow:0 1px 0 var(--line)}
.nav-in{display:flex;align-items:center;gap:20px;height:72px}
.nav-links{display:flex;gap:2px;margin-left:12px}
.nav-links a{padding:8px 12px;border-radius:999px;color:var(--muted);font-size:14.5px;font-weight:500;text-decoration:none;transition:color .16s,background-color .16s}
.nav-links a:hover{color:var(--ink);background:var(--soft)}
.nav-actions{display:flex;align-items:center;gap:10px;margin-left:auto}
.theme-toggle{position:relative;flex:none;width:44px;height:44px;border:0;border-radius:999px;background:transparent;color:var(--ink);box-shadow:inset 0 0 0 1px var(--line2);cursor:pointer;transition:box-shadow .16s,transform .16s var(--ease)}
.theme-toggle:hover{box-shadow:inset 0 0 0 1px var(--accent)}
.theme-toggle:active{transform:scale(.96)}
.theme-toggle svg{position:absolute;inset:0;margin:auto;width:20px;height:20px;transition:opacity .3s var(--ease),transform .3s var(--ease),filter .3s var(--ease)}
.theme-toggle .i-moon,:host([data-theme="light"]) .theme-toggle .i-sun{opacity:1;transform:scale(1);filter:blur(0)}
.theme-toggle .i-sun,:host([data-theme="light"]) .theme-toggle .i-moon{opacity:0;transform:scale(.25);filter:blur(4px)}

.hero{padding:48px 0 56px}
.hero-grid{display:grid;grid-template-columns:1.12fr .88fr;gap:48px;align-items:center}
.eyebrow{display:inline-flex;align-items:center;gap:10px;padding:5px 14px 5px 5px;border-radius:999px;background:var(--soft);color:var(--ink);font-size:13.5px;font-weight:600}
.eyebrow b{display:grid;place-items:center;flex:none;height:24px;padding:0 10px;border-radius:999px;background:var(--grad);color:var(--accent-ink);font-size:11.5px;letter-spacing:.04em;white-space:nowrap}
.hero h1{margin:22px 0 20px;font-size:clamp(36px,4.8vw,64px);font-weight:700;line-height:1.03;letter-spacing:-.035em}
.typed-line{display:block;min-height:1.06em;white-space:nowrap}
.typed{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.caret{display:inline-block;width:.07em;height:.8em;margin-left:.05em;border-radius:2px;background:var(--accent);vertical-align:-.04em;animation:blink 1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
.lead{max-width:540px;margin:0 0 30px;font-size:clamp(16.5px,1.5vw,18.5px)}
.hero-ctas{display:flex;flex-wrap:wrap;gap:12px}
.hero-meta{display:flex;flex-wrap:wrap;gap:8px 20px;margin:26px 0 0;padding:0;list-style:none;color:var(--muted);font-size:14px}
.hero-meta li{display:flex;align-items:center;gap:7px}
.hero-meta svg{width:16px;height:16px;color:var(--good);stroke-width:2.4}

.hero-art{position:relative;height:548px}
.hero-art::before{content:"";position:absolute;inset:6% 4%;border-radius:50%;background:radial-gradient(closest-side,var(--glow1),transparent);filter:blur(10px)}
.mock{position:absolute;border-radius:24px;background:var(--panel);box-shadow:var(--shadow)}
.mock small{display:block;color:var(--muted);font-size:12.5px;line-height:1.3}
.mock-main{top:44px;left:0;width:min(400px,88%);padding:22px}
.mm-top{display:flex;align-items:center;gap:12px}
.avatar{display:grid;place-items:center;flex:none;width:44px;height:44px;border-radius:50%;background:var(--grad);color:var(--accent-ink);font-family:var(--font-display);font-weight:700}
.mm-top b{display:block;font-family:var(--font-display);font-size:17px}
.mm-box{margin-top:16px;padding:14px;border-radius:16px;background:var(--panel2)}
.mm-label{display:flex;justify-content:space-between;color:var(--muted);font-size:13px}
.mm-label b{font-size:13px}
.days{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:10px}
.days i{height:8px;border-radius:999px;background:var(--panel3)}
.days i.on{background:var(--grad)}
.mm-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.mm-stats .mm-box{margin:0}
.mm-stats b{display:block;font-family:var(--font-display);font-size:24px;line-height:1.1}
.mm-next{display:flex;align-items:center;gap:12px}
.mm-next .ico{display:grid;place-items:center;flex:none;width:40px;height:40px;border-radius:12px;background:var(--soft);color:var(--accent)}
.mm-next .ico svg{width:20px;height:20px}
.mm-next b{display:block;font-size:15px}
.pill{margin-left:auto;padding:8px 14px;border-radius:999px;background:var(--grad);color:var(--accent-ink);font-size:13px;font-weight:600}
.mock-chat{right:0;bottom:0;width:min(330px,80%);padding:16px;animation:float 7s ease-in-out infinite}
.chat-head{display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:14px}
.chat-head svg{width:18px;height:18px;color:var(--accent)}
.chat-head small{margin-left:auto}
.bubble{width:fit-content;max-width:92%;margin:0 0 8px;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.45}
.bubble.me{margin-left:auto;border-bottom-right-radius:6px;background:var(--grad);color:var(--accent-ink)}
.bubble.ai{margin-bottom:0;border-bottom-left-radius:6px;background:var(--panel2)}
.mock-timer{top:0;right:6%;display:flex;align-items:center;gap:12px;padding:12px 18px 12px 12px;border-radius:18px;animation:float 6s ease-in-out -2s infinite}
.mock-timer .ico{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:var(--soft);color:var(--accent)}
.mock-timer .ico svg{width:20px;height:20px}
.mock-timer b{font-family:var(--font-display);font-size:18px}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}

.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);border-radius:24px;background:var(--panel);box-shadow:var(--shadow)}
.stat{padding:26px 24px;text-align:center}
.stat+.stat{box-shadow:-1px 0 0 var(--line)}
.stat b{display:block;font-family:var(--font-display);font-size:clamp(32px,3.6vw,44px);font-weight:700;line-height:1.1;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.stat span{color:var(--muted);font-size:14.5px}

.section{padding:104px 0 0}
.sec-head{max-width:660px;margin:0 auto 48px;text-align:center}
.kicker{display:inline-block;margin-bottom:14px;color:var(--accent);font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.sec-head h2,.split h2,.cta h2{font-size:clamp(30px,4vw,48px)}
.sec-head p,.split-text>p{margin:16px 0 0;color:var(--muted);font-size:17.5px}

.features{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.feature{padding:26px;border-radius:24px;background:var(--panel);box-shadow:var(--shadow);transition:transform .25s var(--ease)}
.feature:hover{transform:translateY(-3px)}
.f-ico{display:grid;place-items:center;width:48px;height:48px;margin-bottom:18px;border-radius:14px;background:var(--soft);color:var(--accent)}
.f-ico svg{width:24px;height:24px}
.feature h3{margin-bottom:8px;font-size:20px}
.feature p{margin:0;color:var(--muted);font-size:15.5px}

.split{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}
.split.flip{grid-template-columns:1.1fr .9fr}
.split.flip .split-text{order:2}
.checks{display:grid;gap:12px;margin:26px 0 0;padding:0;list-style:none}
.checks li{display:flex;align-items:flex-start;gap:12px}
.ck{display:grid;place-items:center;flex:none;width:24px;height:24px;margin-top:1px;border-radius:50%;background:var(--good-soft);color:var(--good)}
.ck svg{width:14px;height:14px;stroke-width:2.6}
.note{margin:20px 0 0;color:var(--muted);font-size:14px}

.cbt{padding:22px;border-radius:28px;background:var(--panel);box-shadow:var(--shadow)}
.cbt-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding-bottom:16px;box-shadow:0 1px 0 var(--line)}
.cbt-head small{display:block;color:var(--muted);font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.cbt-head b{font-family:var(--font-display);font-size:19px}
.cbt-time{display:flex;align-items:center;gap:8px;padding:8px 14px 8px 10px;border-radius:999px;background:var(--soft);color:var(--ink);font-weight:700}
.cbt-time svg{width:18px;height:18px;color:var(--accent)}
.cbt-progress{display:flex;align-items:center;gap:12px;margin:16px 0 0;color:var(--muted);font-size:13.5px}
.bar{flex:1;height:6px;border-radius:999px;background:var(--panel3);overflow:hidden}
.bar i{display:block;width:33%;height:100%;border-radius:inherit;background:var(--grad);transition:width .4s var(--ease)}
.cbt-q{margin:16px 0;color:var(--ink);font-size:18px;font-weight:600;line-height:1.45}
.cbt-opts{display:grid;gap:10px}
.opt{display:flex;align-items:center;gap:12px;width:100%;min-height:54px;padding:8px 14px 8px 8px;border:0;border-radius:16px;background:var(--panel2);color:var(--ink);font:500 15.5px/1.35 var(--font-body);text-align:left;cursor:pointer;box-shadow:inset 0 0 0 1px var(--line);transition:box-shadow .16s,background-color .16s}
.opt:hover:not(:disabled){box-shadow:inset 0 0 0 1px var(--accent)}
.opt:disabled{cursor:default}
.opt .key{display:grid;place-items:center;flex:none;width:38px;height:38px;border-radius:8px;background:var(--panel3);font-family:var(--font-display);font-weight:700;transition:background-color .16s,color .16s}
.opt.correct{background:var(--good-soft);box-shadow:inset 0 0 0 1.5px var(--good)}
.opt.correct .key{background:var(--good);color:var(--good-ink)}
.opt.wrong{background:var(--bad-soft);box-shadow:inset 0 0 0 1.5px var(--bad)}
.opt.wrong .key{background:var(--bad);color:var(--bad-ink)}
.cbt-why{margin:14px 0 0;padding:14px 16px;border-radius:16px;background:var(--soft);font-size:15px;animation:rise .3s var(--ease)}
@keyframes rise{from{opacity:0;transform:translateY(6px)}}
.cbt-foot{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;margin-top:18px}
.cbt-foot span{color:var(--muted);font-size:13px}

.code-demo{overflow:hidden;border-radius:24px;background:#0f1117;box-shadow:0 0 0 1px rgba(255,255,255,.07),0 18px 40px rgba(0,0,0,.35)}
.cd-bar{display:flex;align-items:center;gap:12px;height:48px;padding:0 10px 0 16px;background:#171a23;color:#aeb4c8;font:600 12.5px var(--mono)}
.cd-bar .dots{display:flex;gap:6px}
.cd-bar .dots i{width:10px;height:10px;border-radius:50%;background:#3a3f4f}
.cd-bar button{margin-left:auto;min-height:32px;padding:0 12px;border:0;border-radius:9px;background:rgba(255,255,255,.08);color:#e8eaf6;font:600 12.5px var(--font-body);cursor:pointer;transition:background-color .16s,transform .16s var(--ease)}
.cd-bar button:hover{background:rgba(255,255,255,.14)}
.cd-bar button:active{transform:scale(.96)}
.cd-panes{display:grid}
.cd-editor{display:block;width:100%;height:262px;margin:0;padding:16px;border:0;background:transparent;color:#e8eaf6;font:13.5px/1.65 var(--mono);tab-size:2;white-space:pre;resize:none;outline:none}
.cd-result{display:flex;flex-direction:column;gap:6px;padding:10px;background:#0b0d12}
.cd-result span{padding:2px 4px;color:#8b93a7;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.cd-preview{flex:1;width:100%;min-height:190px;border:0;border-radius:14px;background:#fff}
.cd-hint{margin:12px 4px 0;color:var(--muted);font-size:13.5px;text-align:center}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:24px 0 0;padding:0;list-style:none}
.chips li{padding:7px 13px;border-radius:999px;background:var(--panel);color:var(--ink);font-size:13.5px;font-weight:500;box-shadow:var(--shadow)}

.duo{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.duo-card{display:flex;flex-direction:column;padding:32px;border-radius:28px;background:var(--panel);box-shadow:var(--shadow)}
.duo-card .f-ico{margin-bottom:20px}
.duo-card h3{font-size:26px}
.duo-card>p{margin:8px 0 0;color:var(--muted)}
.duo-card .checks{margin-bottom:24px}
.duo-card .foot-note{margin:auto 0 0;padding:14px 16px;border-radius:16px;background:var(--panel2);color:var(--muted);font-size:14.5px}
.duo-card .btn{align-self:flex-start;margin-top:auto}

.steps{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin:0;padding:0;list-style:none}
.steps::before{content:"";position:absolute;top:27px;left:16.66%;right:16.66%;height:1px;background:linear-gradient(90deg,transparent,var(--line2) 12%,var(--line2) 88%,transparent)}
.steps li{position:relative;text-align:center}
.step-n{position:relative;display:grid;place-items:center;width:56px;height:56px;margin:0 auto 18px;border-radius:50%;background:var(--panel);box-shadow:var(--shadow);color:var(--accent);font-family:var(--font-display);font-size:20px;font-weight:700}
.steps h3{margin-bottom:8px;font-size:20px}
.steps p{max-width:300px;margin:0 auto;color:var(--muted);font-size:15.5px}

.faq{display:grid;gap:12px;max-width:780px;margin:0 auto}
.faq details{border-radius:20px;background:var(--panel);box-shadow:var(--shadow)}
.faq summary{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px 22px;color:var(--ink);font-size:16.5px;font-weight:600;list-style:none;cursor:pointer}
.faq summary::-webkit-details-marker{display:none}
.plus{position:relative;flex:none;width:30px;height:30px;border-radius:50%;background:var(--soft)}
.plus::before,.plus::after{content:"";position:absolute;top:50%;left:50%;width:12px;height:2px;margin:-1px 0 0 -6px;border-radius:2px;background:var(--accent);transition:transform .25s var(--ease)}
.plus::after{transform:rotate(90deg)}
.faq details[open] .plus::after{transform:rotate(0)}
.faq .ans{margin:0;padding:0 22px 20px;color:var(--muted);animation:rise .25s var(--ease)}

.cta{position:relative;overflow:hidden;padding:64px 32px;border-radius:32px;background:radial-gradient(500px 260px at 90% 0%,var(--glow1),transparent 70%),radial-gradient(460px 260px at 0% 100%,var(--glow2),transparent 70%),var(--panel);box-shadow:var(--shadow);text-align:center}
.cta p{max-width:520px;margin:16px auto 30px;color:var(--muted);font-size:17.5px}
.cta .hero-ctas{justify-content:center}
#parents{scroll-margin-top:96px}

/* Footer: a giant wordmark, link columns around an emblem and a sign-off. A near-black card with cream text in
   dark mode; a white card with dark text in light mode. */
:host{--foot-bg:radial-gradient(760px 320px at 50% 0%,rgba(225,186,197,.08),transparent 70%),radial-gradient(520px 260px at 50% 110%,rgba(182,131,98,.08),transparent 70%),#0c0c0e;--foot-shadow:0 0 0 1px rgba(255,255,255,.07),0 30px 60px rgba(0,0,0,.3);--foot-ink:#efe9e1;--foot-text:rgba(239,233,225,.8);--foot-hover:#fff;--foot-muted:rgba(239,233,225,.62);--foot-line:rgba(239,233,225,.18);--foot-flag-line:rgba(255,255,255,.18)}
:host([data-theme="light"]){--foot-bg:radial-gradient(760px 320px at 50% 0%,rgba(109,93,252,.08),transparent 70%),radial-gradient(520px 260px at 50% 110%,rgba(23,184,151,.07),transparent 70%),#fff;--foot-shadow:var(--shadow);--foot-ink:#111827;--foot-text:#344054;--foot-hover:#111827;--foot-muted:#667085;--foot-line:#d3d7e2;--foot-flag-line:rgba(0,0,0,.12)}
.foot{padding:104px 16px 16px}
.foot-card{container-type:inline-size;position:relative;overflow:hidden;max-width:1400px;margin:0 auto;padding:72px 40px 30px;border-radius:32px;background:var(--foot-bg);box-shadow:var(--foot-shadow);color:var(--foot-ink);text-align:center}
.foot-mark{display:flex;justify-content:center;margin:0 0 clamp(36px,5cqi,64px);font-family:var(--font-display);font-size:clamp(36px,13.3cqi,190px);font-weight:800;line-height:.8;letter-spacing:-.05em;color:var(--foot-ink);user-select:none}
.fm-letter{display:inline-block;opacity:0;transform:translateY(35%);transition:opacity .7s var(--ease),transform .9s var(--ease);transition-delay:calc(var(--i) * 70ms)}
.foot-card.in .fm-letter{opacity:1;transform:none}
.fm-ly{background:var(--grad);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent}
.fm-ly:last-child{background-position:100% 0}
.foot-nav{display:grid;grid-template-columns:repeat(2,minmax(130px,auto)) 120px repeat(2,minmax(130px,auto));justify-content:center;align-items:center;gap:16px clamp(20px,4cqi,56px)}
.fcol{display:grid;margin:0;padding:0;list-style:none}
.fcol a,.fcol button{position:relative;display:inline-flex;align-items:center;min-height:40px;padding:0 4px;border:0;background:none;color:var(--foot-text);font:500 17px/1.3 var(--font-body);text-decoration:none;cursor:pointer;transition:color .2s var(--ease)}
.fcol a::after,.fcol button::after{content:"";position:absolute;left:50%;right:50%;bottom:7px;height:1px;background:currentColor;transition:left .25s var(--ease),right .25s var(--ease)}
.fcol a:hover,.fcol button:hover{color:var(--foot-hover)}
.fcol a:hover::after,.fcol button:hover::after{left:4px;right:4px}
.foot-emblem{display:grid;place-items:center;width:104px;height:104px;margin:0 auto;color:var(--foot-ink);animation:sway 5s ease-in-out infinite}
.foot-emblem svg{width:68px;height:68px;stroke-width:1.3}
@keyframes sway{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(-3deg) translateY(-3px)}}
.foot-made{display:flex;flex-direction:column;align-items:center;margin-top:clamp(40px,6cqi,72px)}
.foot-made small{color:var(--foot-muted);font-size:13px;letter-spacing:.03em}
.foot-script{display:inline-flex;align-items:center;gap:10px;margin-top:2px;font-family:"Caveat",cursive;font-size:36px;font-weight:600;line-height:1.1;color:var(--foot-ink);transform:rotate(-3deg)}
.ng-flag{width:27px;height:18px;border-radius:3px;box-shadow:0 0 0 1px var(--foot-flag-line)}
.foot-pills{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:26px 0 0;padding:0;list-style:none}
.foot-pills li{padding:5px 12px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--foot-line);color:var(--foot-muted);font-size:12px;font-weight:700;letter-spacing:.08em}
.foot-legal{margin:26px 0 0;color:var(--foot-muted);font-size:13px}
@media(max-width:900px){
  .foot-nav{grid-template-columns:repeat(2,minmax(0,170px))}
  .foot-emblem{grid-column:1/-1;order:-1;width:84px;height:84px}
  .foot-emblem svg{width:56px;height:56px}
}

/* Gentle entrance as sections scroll into view (skipped with reduced motion) */
[data-reveal]{opacity:0;transform:translateY(16px);transition:opacity .6s var(--ease),transform .6s var(--ease);transition-delay:var(--d,0ms)}
[data-reveal].in{opacity:1;transform:none}

@media(max-width:960px){
  .nav-links{display:none}
  .hero-grid,.split,.split.flip{grid-template-columns:1fr}
  .hero-grid{gap:40px}
  .hero h1{font-size:clamp(36px,7vw,60px)}
  .split{gap:40px}
  .split.flip .split-text{order:0}
  .hero-art{max-width:560px;width:100%;margin:0 auto}
  .features{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:700px){
  .wrap{padding:0 16px}
  .nav-in{height:64px;gap:10px}
  .nav .start-link{display:none}
  .brand{font-size:19px}
  .hero{padding:28px 0 48px}
  .eyebrow{font-size:13px}
  .hero-ctas .btn{flex:1 1 auto}
  .hero-art{height:auto;padding-top:44px}
  .hero-art .mock-main{position:relative;top:auto;width:100%;padding:18px}
  .mm-top b{font-size:15.5px}
  .hero-art .mock-chat{position:relative;right:auto;bottom:auto;width:88%;margin:-14px 0 0 auto}
  .mock-timer{right:0}
  .stats-grid{grid-template-columns:1fr 1fr}
  .stat{padding:22px 12px}
  .stat:nth-child(3){box-shadow:0 -1px 0 var(--line)}
  .stat:nth-child(4){box-shadow:-1px 0 0 var(--line),0 -1px 0 var(--line)}
  .section{padding-top:80px}
  .sec-head{margin-bottom:32px}
  .features,.duo,.steps{grid-template-columns:1fr}
  .steps{gap:32px}
  .steps::before{display:none}
  .cbt{padding:18px;border-radius:24px}
  .duo-card{padding:24px}
  .cta{padding:48px 20px;border-radius:28px}
  .foot{padding:80px 10px 10px}
  .foot-card{padding:48px 14px 26px;border-radius:24px}
  .fcol a,.fcol button{font-size:16px}
}
@media(prefers-reduced-motion:reduce){
  [data-reveal]{opacity:1;transform:none;transition:none}
  .mock-chat,.mock-timer{animation:none}
  .caret{display:none}
  .feature:hover{transform:none}
  .fm-letter{opacity:1;transform:none;transition:none}
  .foot-emblem{animation:none;transform:rotate(-8deg)}
}`;

  const sectionLinks = '<a href="#features" data-scroll="features">Features</a><a href="#exams" data-scroll="exams">Exam prep</a><a href="#skills" data-scroll="skills">Online skills</a><a href="#teachers" data-scroll="teachers">Teachers &amp; parents</a><a href="#faq" data-scroll="faq">FAQ</a>';
  const ctas = `<button class="btn lg" type="button" data-auth="signup">Create your account ${arrow}</button><button class="btn lg ghost" type="button" data-auth="login">Log in</button>`;
  // Footer wordmark: one span per letter so they can rise in turn; "LY" carries the accent gradient.
  const wordmark = [...'STUDYLY'].map((c, i) => `<span class="fm-letter${i > 4 ? ' fm-ly' : ''}" style="--i:${i}">${c}</span>`).join('');
  const footLink = (target, text) => `<li><a href="#${target}" data-scroll="${target}">${text}</a></li>`;

  const markup = `
<header class="nav" id="nav">
  <div class="wrap nav-in">
    <button class="brand" type="button" data-scroll="top" aria-label="Studyly, back to top">STUDY<span>LY</span></button>
    <nav class="nav-links" aria-label="Page sections">${sectionLinks}</nav>
    <div class="nav-actions">
      <button class="theme-toggle" type="button" id="themeToggle" aria-label="Switch between dark and light mode">
        <svg class="ic i-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        <svg class="ic i-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
      </button>
      <button class="btn ghost sm" type="button" data-auth="login">Log in</button>
      <button class="btn sm start-link" type="button" data-auth="signup">Get started</button>
    </div>
  </div>
</header>

<main>
  <section class="hero" id="top">
    <div class="wrap hero-grid">
      <div>
        <span class="eyebrow" data-reveal><b>JSS1–SS3</b>For Nigerian secondary schools</span>
        <h1 data-reveal style="--d:80ms">Study smarter for <span class="typed-line"><span class="typed" id="typed" aria-hidden="true">every class.</span><span class="caret" aria-hidden="true"></span><span class="sr-only">every class, from BECE and WAEC to JAMB</span></span></h1>
        <p class="lead" data-reveal style="--d:160ms">Learn every topic for your class, get step-by-step help from an AI tutor, revise with flashcards and sit timed CBT mocks, all in one place that works well on your phone.</p>
        <div class="hero-ctas" data-reveal style="--d:240ms">${ctas}</div>
        <ul class="hero-meta" data-reveal style="--d:320ms">
          <li>${check}BECE, WAEC, NECO and JAMB practice</li>
          <li>${check}Made for phones</li>
          <li>${check}For students, teachers and parents</li>
        </ul>
      </div>

      <div class="hero-art" aria-hidden="true">
        <div class="mock mock-main" data-reveal style="--d:200ms">
          <div class="mm-top"><div class="avatar">AM</div><div><b>Good morning, Amara 👋</b><small>SS2 · Science class</small></div></div>
          <div class="mm-box"><div class="mm-label"><span>This week</span><b class="num">4 of 5 days</b></div><div class="days"><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i></i></div></div>
          <div class="mm-stats"><div class="mm-box"><b class="num">78%</b><small>Practice accuracy</small></div><div class="mm-box"><b class="num">36</b><small>Cards revised</small></div></div>
          <div class="mm-box mm-next"><span class="ico">${icon('book')}</span><div><small>Up next · Mathematics</small><b>Trigonometry</b></div><span class="pill">Continue</span></div>
        </div>
        <div class="mock mock-timer" data-reveal style="--d:380ms">
          <span class="ico">${icon('timer')}</span>
          <div><small>JAMB mock</small><b class="num" id="heroTimer">01:59:48</b></div>
        </div>
        <div class="mock mock-chat" data-reveal style="--d:520ms">
          <div class="chat-head">${icon('chat')}<b>AI Tutor</b><small>Mathematics</small></div>
          <p class="bubble me">How do I solve 2x + 3 = 11?</p>
          <p class="bubble ai">Take 3 from both sides: <b>2x = 8</b>. Then divide both sides by 2, so <b>x = 4</b>.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="wrap" aria-label="Studyly in numbers">
    <div class="stats-grid" data-reveal>
      <div class="stat"><b class="num" data-count="6">6</b><span>classes, JSS1 to SS3</span></div>
      <div class="stat"><b class="num" data-count="33">33</b><span>school subjects</span></div>
      <div class="stat"><b class="num" data-count="1163">1,163</b><span>curriculum topics</span></div>
      <div class="stat"><b class="num" data-count="14">14</b><span>online skills courses</span></div>
    </div>
  </section>

  <section class="section" id="features">
    <div class="wrap">
      <div class="sec-head" data-reveal>
        <span class="kicker">Everything in one place</span>
        <h2>All you need to learn, practise and revise</h2>
        <p>From your first lesson to exam day, Studyly helps you understand topics, practise them and remember them.</p>
      </div>
      <div class="features">
        <article class="feature" data-reveal><span class="f-ico">${icon('chat')}</span><h3>AI Tutor</h3><p>Ask about any topic. It explains step by step, quizzes you one question at a time, and helps with a photo of a homework question.</p></article>
        <article class="feature" data-reveal style="--d:80ms"><span class="f-ico">${icon('book')}</span><h3>Your class curriculum</h3><p>33 subjects organised by class, from Mathematics and Biology to Economics, French, Yoruba, Igbo and Hausa.</p></article>
        <article class="feature" data-reveal style="--d:160ms"><span class="f-ico">${icon('layers')}</span><h3>Revision and flashcards</h3><p>A daily revision list, ready-made decks and AI decks for any topic. Each card comes back just before you are likely to forget it.</p></article>
        <article class="feature" data-reveal><span class="f-ico">${icon('timer')}</span><h3>CBT and mock exams</h3><p>Timed JAMB, WAEC, NECO and BECE-style papers with a question map, a calculator and explanations for every answer.</p></article>
        <article class="feature" data-reveal style="--d:80ms"><span class="f-ico">${icon('code')}</span><h3>Online skills</h3><p>14 beginner courses, from HTML and Python to design, video and public speaking, with a live code editor.</p></article>
        <article class="feature" data-reveal style="--d:160ms"><span class="f-ico">${icon('chart')}</span><h3>Progress you can see</h3><p>Track your accuracy and weak topics, and share a weekly report with your parents on WhatsApp.</p></article>
      </div>
    </div>
  </section>

  <section class="section" id="exams">
    <div class="wrap split">
      <div class="split-text" data-reveal>
        <span class="kicker">CBT and mock exams</span>
        <h2>Practise like it’s the real exam</h2>
        <p>Sit timed papers in the style of JAMB UTME, WAEC, NECO and BECE, then see exactly what to revise next.</p>
        <ul class="checks">
          ${ck('<b>JAMB UTME practice:</b> Use of English plus three subjects, scored out of 400')}
          ${ck('WAEC and NECO objective papers for SS subjects, and BECE papers for JSS subjects')}
          ${ck('A countdown timer, question map, flags and an on-screen calculator')}
          ${ck('Scores by subject, topics to revise and an explanation for every answer')}
        </ul>
        <p class="note">Questions are original practice questions written in each exam’s style, not real past questions.</p>
      </div>
      <div class="cbt" data-reveal style="--d:120ms">
        <div class="cbt-head">
          <div><small>Try a sample question</small><b id="cbtSubject">Biology</b></div>
          <div class="cbt-time" aria-label="Practice timer">${icon('timer')}<span class="num" id="cbtTimer">26:41</span></div>
        </div>
        <div class="cbt-progress"><span class="num" id="cbtCount">Question 1 of 3</span><div class="bar"><i id="cbtBar"></i></div></div>
        <p class="cbt-q" id="cbtQ"></p>
        <div class="cbt-opts" id="cbtOpts" role="group" aria-label="Answer options"></div>
        <p class="cbt-why" id="cbtWhy" hidden></p>
        <div class="cbt-foot"><span>Tap an answer to check it</span><button class="btn ghost sm" type="button" id="cbtNext">Next question</button></div>
      </div>
    </div>
  </section>

  <section class="section" id="skills">
    <div class="wrap split flip">
      <div class="split-text" data-reveal>
        <span class="kicker">Online skills</span>
        <h2>Learn skills for the future</h2>
        <p>Short lessons, worked examples, a final project and a quick exam after every chapter. Web lessons come with a live editor like this one, so you learn by doing.</p>
        <ul class="chips" aria-label="Courses">
          <li>HTML</li><li>CSS</li><li>JavaScript</li><li>Python</li><li>Spreadsheets</li><li>Graphic design</li><li>UI/UX design</li><li>Video editing</li><li>Digital marketing</li><li>Entrepreneurship</li><li>Public speaking</li><li>AI for learning</li><li>Typing</li><li>Cybersecurity</li>
        </ul>
      </div>
      <div data-reveal style="--d:120ms">
        <div class="code-demo">
          <div class="cd-bar"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span>index.html</span><button type="button" id="cdReset">Reset</button></div>
          <div class="cd-panes">
            <textarea class="cd-editor" id="cdEditor" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="HTML code you can edit"></textarea>
            <div class="cd-result"><span>Result</span><iframe class="cd-preview" id="cdPreview" title="Result of the code" sandbox="allow-scripts"></iframe></div>
          </div>
        </div>
        <p class="cd-hint">Change the words or the colour, and the result updates as you type.</p>
      </div>
    </div>
  </section>

  <section class="section" id="teachers">
    <div class="wrap">
      <div class="sec-head" data-reveal>
        <span class="kicker">Teachers and parents</span>
        <h2>Teachers and parents stay in the loop</h2>
        <p>Teachers can run a class from one place, and parents get a clear picture of each week.</p>
      </div>
      <div class="duo">
        <article class="duo-card" data-reveal>
          <span class="f-ico">${icon('users')}</span>
          <h3>For teachers</h3>
          <p>Set work, mark it automatically and see where your class needs help.</p>
          <ul class="checks">
            ${ck('Create a class and share its join code on WhatsApp')}
            ${ck('Set quizzes the AI drafts and you check before publishing')}
            ${ck('Set topic tasks and see who has finished')}
            ${ck('Spot the topics most of your class finds hard')}
          </ul>
          <button class="btn ghost" type="button" data-auth="signup" data-role="teacher">Create a teacher account ${arrow}</button>
        </article>
        <article class="duo-card" id="parents" data-reveal style="--d:100ms">
          <span class="f-ico">${icon('home')}</span>
          <h3>For parents</h3>
          <p>Know how your child is really doing, week by week.</p>
          <ul class="checks">
            ${ck('Days studied, practice questions and accuracy')}
            ${ck('Strong and weak topics, with clear next steps')}
            ${ck('Shared on WhatsApp, or printed and saved as a PDF')}
          </ul>
          <p class="foot-note">Your child creates the weekly report from their Progress page, so you don’t need an account.</p>
        </article>
      </div>
    </div>
  </section>

  <section class="section" id="how">
    <div class="wrap">
      <div class="sec-head" data-reveal><span class="kicker">How it works</span><h2>Start in three steps</h2></div>
      <ol class="steps">
        <li data-reveal><span class="step-n">1</span><h3>Create your account</h3><p>Join as a student or a teacher and choose your class, from JSS1 to SS3.</p></li>
        <li data-reveal style="--d:100ms"><span class="step-n">2</span><h3>Learn and practise</h3><p>Study topics, ask the AI tutor, revise with flashcards and sit timed mock exams.</p></li>
        <li data-reveal style="--d:200ms"><span class="step-n">3</span><h3>See your progress</h3><p>Track your accuracy, find your weak topics and know what to revise next.</p></li>
      </ol>
    </div>
  </section>

  <section class="section" id="faq">
    <div class="wrap">
      <div class="sec-head" data-reveal><span class="kicker">Questions</span><h2>Frequently asked questions</h2></div>
      <div class="faq" data-reveal>
        <details><summary>Who is Studyly for?<span class="plus" aria-hidden="true"></span></summary><p class="ans">Secondary-school students in Nigeria from JSS1 to SS3, their teachers and their parents. Students learn and practise, teachers set and track class work, and parents receive a weekly report.</p></details>
        <details><summary>Does it follow my school’s curriculum?<span class="plus" aria-hidden="true"></span></summary><p class="ans">Subjects and topics are organised by class for Nigerian secondary schools. Topic order differs between schools, so follow your teacher and your school’s scheme of work, and use Studyly to practise and revise.</p></details>
        <details><summary>Can I use it on my phone?<span class="plus" aria-hidden="true"></span></summary><p class="ans">Yes. Studyly is designed for phones first. Lessons and courses are mostly text, so they load quickly and use little data.</p></details>
        <details><summary>Can I trust the AI tutor’s answers?<span class="plus" aria-hidden="true"></span></summary><p class="ans">The tutor explains topics clearly and step by step, but like any AI it can make mistakes. Check important facts, dates and formulas against your textbook or ask your teacher.</p></details>
        <details><summary>Are the CBT questions real past questions?<span class="plus" aria-hidden="true"></span></summary><p class="ans">No. They are original practice questions written in the style of each exam, with an explanation for every answer.</p></details>
        <details><summary>Is my information safe?<span class="plus" aria-hidden="true"></span></summary><p class="ans">Your account is protected by your password, and photos you send to the tutor are not kept in your chat history. Never type private details, such as your address or phone number, into the tutor.</p></details>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="cta" data-reveal>
        <h2>Start learning today</h2>
        <p>Create your account, pick your class and open your first topic in a few minutes.</p>
        <div class="hero-ctas">${ctas}</div>
      </div>
    </div>
  </section>
</main>

<footer class="foot">
  <div class="foot-card">
    <div class="foot-mark" role="img" aria-label="Studyly">${wordmark}</div>
    <nav class="foot-nav" aria-label="Footer">
      <ul class="fcol">${footLink('features', 'Features')}${footLink('exams', 'Exam prep')}${footLink('skills', 'Online skills')}</ul>
      <ul class="fcol">${footLink('teachers', 'For teachers')}${footLink('parents', 'For parents')}${footLink('how', 'How it works')}</ul>
      <div class="foot-emblem" aria-hidden="true">${icon('cap')}</div>
      <ul class="fcol"><li><button type="button" data-auth="signup">Create account</button></li><li><button type="button" data-auth="login">Log in</button></li><li><button type="button" data-auth="signup" data-role="teacher">Teacher sign-up</button></li></ul>
      <ul class="fcol">${footLink('faq', 'FAQ')}<li><button type="button" data-theme-text>Light mode</button></li>${footLink('top', 'Back to top')}</ul>
    </nav>
    <div class="foot-made">
      <small>proudly made for</small>
      <span class="foot-script">Naija students <svg class="ng-flag" viewBox="0 0 3 2" aria-label="Nigerian flag" role="img"><rect width="1" height="2" fill="#008751"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#008751"/></svg></span>
    </div>
    <ul class="foot-pills" aria-label="Exams Studyly helps you practise for"><li>BECE</li><li>WAEC</li><li>NECO</li><li>JAMB</li></ul>
    <p class="foot-legal">© ${new Date().getFullYear()} Studyly · Abeg, go read your books. 📚</p>
  </div>
</footer>`;

  // Sample CBT questions on the page (original practice questions).
  const questions = [
    { subject: 'Biology', q: 'Which gas do green plants take in from the air for photosynthesis?', opts: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Hydrogen'], a: 1, why: 'Plants take in <b>carbon dioxide</b> and use light energy to make glucose, releasing oxygen.' },
    { subject: 'Mathematics', q: 'Solve for x: 3x − 5 = 16', opts: ['5', '7', '11', '3.67'], a: 1, why: 'Add 5 to both sides: 3x = 21. Then divide both sides by 3, so <b>x = 7</b>.' },
    { subject: 'Use of English', q: 'Choose the word nearest in meaning to the word in capitals: The teacher was LENIENT with the latecomers.', opts: ['strict', 'tolerant', 'angry', 'careless'], a: 1, why: '<b>Lenient</b> means not strict about rules, so <b>tolerant</b> is the closest in meaning.' }
  ];
  const starterCode = `<style>
  h1 { color: #b68362; }
  button { padding: 10px 16px; border-radius: 999px; }
</style>

<h1>Hello, Lagos!</h1>
<p>I just built my first web page.</p>
<button onclick="this.textContent = 'You did it! 🎉'">
  Tap me
</button>`;

  function build() {
    if (root) return;
    root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${css}</style>${markup}`;
    const $ = id => root.getElementById(id);

    // The handwritten "Naija students" line uses Caveat; only those letters are downloaded. Fonts have to be
    // declared on the main page to work inside the shadow root.
    if (!document.getElementById('landingScriptFont')) document.head.insertAdjacentHTML('beforeend', '<link id="landingScriptFont" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&text=Naija%20students&display=swap">');

    // Light and dark mode follow the app's setting and are saved the same way. The moon button and the
    // footer's "Light mode / Dark mode" link both switch it.
    const themeText = root.querySelector('[data-theme-text]');
    const syncTheme = () => {
      const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
      host.dataset.theme = theme;
      themeText.textContent = theme === 'light' ? 'Dark mode' : 'Light mode';
    };
    const toggleTheme = () => {
      const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('studyly_theme', next); } catch {}
    };
    syncTheme();
    new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    $('themeToggle').addEventListener('click', toggleTheme);
    themeText.addEventListener('click', toggleTheme);

    const nav = $('nav');
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    root.addEventListener('click', e => {
      const auth = e.target.closest('[data-auth]');
      // Log-in checks the chosen role too, so every button except the teacher one starts from the page's default, Student.
      if (auth) { openAuth(auth.dataset.auth, auth.dataset.role || 'student'); return; }
      const link = e.target.closest('[data-scroll]');
      if (!link) return;
      e.preventDefault();
      const target = link.dataset.scroll === 'top' ? null : $(link.dataset.scroll);
      if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      else window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });

    // Typing headline.
    const typed = $('typed');
    const words = ['every class.', 'BECE.', 'WAEC & NECO.', 'JAMB UTME.', 'the future.'];
    if (!reduceMotion) {
      let w = 0, i = words[0].length, deleting = true;
      const step = () => {
        if (deleting) {
          i--;
          typed.textContent = words[w].slice(0, i);
          if (i === 0) { deleting = false; w = (w + 1) % words.length; return setTimeout(step, 320); }
          return setTimeout(step, 38);
        }
        i++;
        typed.textContent = words[w].slice(0, i);
        if (i === words[w].length) { deleting = true; return setTimeout(step, 1900); }
        setTimeout(step, 75);
      };
      setTimeout(step, 2200);
    }

    // Countdown timers in the illustration and the sample question; they only tick while the page is shown.
    const fmt = (s, hours) => {
      const p = n => String(n).padStart(2, '0');
      return (hours ? p(Math.floor(s / 3600)) + ':' : '') + p(Math.floor(s % 3600 / 60)) + ':' + p(s % 60);
    };
    let heroLeft = 7188, cbtLeft = 1601;
    setInterval(() => {
      if (host.hidden) return;
      heroLeft = heroLeft > 0 ? heroLeft - 1 : 7200;
      cbtLeft = cbtLeft > 0 ? cbtLeft - 1 : 1620;
      $('heroTimer').textContent = fmt(heroLeft, true);
      $('cbtTimer').textContent = fmt(cbtLeft, false);
    }, 1000);

    // Sample CBT question.
    let current = 0;
    function showQuestion() {
      const item = questions[current];
      $('cbtSubject').textContent = item.subject;
      $('cbtCount').textContent = `Question ${current + 1} of ${questions.length}`;
      $('cbtBar').style.width = `${(current + 1) / questions.length * 100}%`;
      $('cbtQ').textContent = item.q;
      $('cbtWhy').hidden = true;
      const box = $('cbtOpts');
      box.innerHTML = '';
      item.opts.forEach((text, n) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'opt';
        b.innerHTML = `<span class="key">${'ABCD'[n]}</span><span></span>`;
        b.lastChild.textContent = text;
        b.addEventListener('click', () => answer(n));
        box.appendChild(b);
      });
    }
    function answer(n) {
      const item = questions[current];
      [...$('cbtOpts').children].forEach((b, k) => {
        b.disabled = true;
        if (k === item.a) b.classList.add('correct');
        else if (k === n) b.classList.add('wrong');
      });
      const why = $('cbtWhy');
      why.innerHTML = (n === item.a ? '<b>Correct!</b> ' : '<b>Not quite.</b> ') + item.why;
      why.hidden = false;
    }
    $('cbtNext').addEventListener('click', () => { current = (current + 1) % questions.length; showQuestion(); });
    showQuestion();

    // Live code demo, sandboxed like the lesson playground.
    const editor = $('cdEditor'), preview = $('cdPreview');
    const base = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:16px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#1f2430}</style></head><body>';
    let codeTimer;
    const runCode = () => { preview.srcdoc = base + editor.value; };
    editor.value = starterCode;
    runCode();
    editor.addEventListener('input', () => { clearTimeout(codeTimer); codeTimer = setTimeout(runCode, 350); });
    editor.addEventListener('keydown', e => {
      if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); editor.setRangeText('  ', editor.selectionStart, editor.selectionEnd, 'end'); }
    });
    $('cdReset').addEventListener('click', () => { editor.value = starterCode; runCode(); });

    // The footer wordmark's letters rise one after another the first time the footer comes into view.
    const footCard = root.querySelector('.foot-card');
    if (reduceMotion || !('IntersectionObserver' in window)) footCard.classList.add('in');
    else {
      const footIo = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { footCard.classList.add('in'); footIo.disconnect(); } }, { threshold: 0.2 });
      footIo.observe(footCard);
    }

    // Reveal sections as they scroll into view; numbers count up the first time they appear.
    const revealEls = root.querySelectorAll('[data-reveal]');
    if (reduceMotion || !('IntersectionObserver' in window)) { revealEls.forEach(el => el.removeAttribute('data-reveal')); return; }
    const countUp = el => {
      const target = Number(el.dataset.count), start = performance.now();
      const tick = now => {
        const t = Math.min(1, (now - start) / 1100);
        el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))).toLocaleString('en-NG');
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        el.classList.add('in');
        el.querySelectorAll('[data-count]').forEach(countUp);
        const delay = parseInt(el.style.getPropertyValue('--d')) || 0;
        setTimeout(() => { el.removeAttribute('data-reveal'); el.classList.remove('in'); }, 650 + delay);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  }

  const backButton = document.querySelector('[data-landing-back]');

  function showLanding(fromHistory) {
    build();
    authScreen.classList.add('is-hidden');
    host.hidden = false;
    if (!fromHistory && AUTH_HASH.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
    window.scrollTo(0, 0);
  }

  // Opens the log-in or sign-up form. role is "student", "teacher" or "" to leave the choice as it is.
  function openAuth(mode, role, fromHistory) {
    if (role) {
      const input = document.querySelector(`input[name=accountRole][value="${role}"]`);
      if (input && !input.checked) { input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    if (typeof setAuthMode === 'function') setAuthMode(mode);
    host.hidden = true;
    authScreen.classList.remove('is-hidden');
    if (!fromHistory) history.pushState({ studylyAuth: mode }, '', '#' + mode);
    window.scrollTo(0, 0);
    if (window.matchMedia('(pointer: fine)').matches) document.getElementById(mode === 'signup' ? 'signupName' : 'loginEmail')?.focus({ preventScroll: true });
  }

  window.addEventListener('popstate', () => {
    if (!loggedOut) return;
    const m = location.hash.match(AUTH_HASH);
    if (m) openAuth(m[1], '', true); else showLanding(true);
  });
  backButton?.addEventListener('click', () => { if (history.state?.studylyAuth) history.back(); else showLanding(); });

  // Called by the page once it knows the visitor is not logged in.
  function start() {
    loggedOut = true;
    if (backButton) backButton.hidden = false;
    const m = location.hash.match(AUTH_HASH);
    if (m) openAuth(m[1], '', true); else showLanding(true);
  }

  // After logging in from #login or #signup the page reloads into the app, so tidy the address bar.
  document.addEventListener('DOMContentLoaded', () => {
    window.studylyAuthReady?.then(loggedIn => { if (loggedIn && AUTH_HASH.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); });
  });

  window.studylyLanding = { start, show: showLanding, openAuth };
})();
