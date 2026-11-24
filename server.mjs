import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const root = path.dirname(fileURLToPath(import.meta.url));
try {
  const envFile = await readFile(path.join(root, '.env'), 'utf8');
  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) {
      const value = match[2].replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, (_, doubleQuoted, singleQuoted) => doubleQuoted ?? singleQuoted);
      process.env[match[1]] = value;
    }
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || 'localhost';
const provider = (process.env.AI_PROVIDER || 'ollama').toLowerCase();
const openAIModel = process.env.OPENAI_MODEL || 'gpt-5-mini';
const openAIApiKey = process.env.OPENAI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const geminiApiKey = process.env.GEMINI_API_KEY;
// Each Gemini model has its own free daily allowance, so backups keep the tutor answering when one runs out.
const geminiModels = [...new Set([geminiModel, ...(process.env.GEMINI_FALLBACK_MODELS ?? 'gemini-3.5-flash,gemini-3.5-flash-lite,gemini-flash-lite-latest,gemini-3.1-flash-lite,gemini-3.8-flash,gemini-3.7-flash,gemini-flash-latest').split(',').map(model => model.trim()).filter(Boolean)])];
const geminiRestingUntil = new Map();
const ollamaModel = process.env.OLLAMA_MODEL || 'qwen3.5:4b';
const ollamaUrl = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
const tutorRequestTimes = new Map();
const scrypt = promisify(scryptCallback);
const authFile = path.join(root, 'data', 'users.json');
const authSessions = new Map();
const authAttempts = new Map();
let authDbQueue = Promise.resolve();
const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;
// One curriculum file feeds both the server's checks and the website (served as /content/curriculum.js).
const curriculumData = JSON.parse(await readFile(path.join(root, 'content', 'curriculum.json'), 'utf8'));
const curriculum = curriculumData.classes;
const skillsSubject = 'Online skills';
// Browser scripts the server may send, mapped to files in this folder. Nothing else on disk is served.
const contentScripts = { '/content/flashcards.js':'content/flashcards.js', '/app/classes.js':'app/classes.js', '/app/cbt.js':'app/cbt.js', '/app/report.js':'app/report.js', '/app/playground.js':'app/playground.js', '/app/landing.js':'app/landing.js','/app/theme.css':'app/theme.css' };

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
  res.end(JSON.stringify(body));
}

async function readBody(req, maxBytes = 8_192) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > maxBytes) throw Object.assign(new Error('Request too large'), { status:413 });
  }
  try { return JSON.parse(raw); }
  catch { throw Object.assign(new Error('Send a valid JSON request.'), { status:400 }); }
}

async function readAuthDb() {
  try {
    const parsed = JSON.parse(await readFile(authFile, 'utf8'));
    return { users:Array.isArray(parsed.users) ? parsed.users : [], classes:Array.isArray(parsed.classes) ? parsed.classes : [] };
  } catch (error) {
    if (error.code === 'ENOENT') return { users:[], classes:[] };
    throw new Error('Studyly could not read its account store. Stop the server and check data/users.json.');
  }
}

async function updateAuthDb(change) {
  const operation = authDbQueue.then(async () => {
    const db = await readAuthDb();
    const result = await change(db);
    await mkdir(path.dirname(authFile), { recursive:true });
    const tempFile = `${authFile}.${randomBytes(6).toString('hex')}.tmp`;
    await writeFile(tempFile, JSON.stringify(db, null, 2), { mode:0o600 });
    await rename(tempFile, authFile);
    return result;
  });
  authDbQueue = operation.catch(() => {});
  return operation;
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(piece => piece.trim().split(/=(.*)/s).slice(0, 2)).filter(([key, value]) => key && value !== undefined).map(([key, value]) => [key, decodeURIComponent(value)]));
}

function publicUser(user) {
  return { id:user.id, name:user.name, email:user.email, class:user.class, role:user.role === "teacher" ? "teacher" : "student", createdAt:user.createdAt };
}

function currentUser(req) {
  const token = parseCookies(req.headers.cookie).studyly_session;
  if (!token) return null;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const session = authSessions.get(tokenHash);
  if (!session || session.expiresAt < Date.now()) {
    authSessions.delete(tokenHash);
    return null;
  }
  return { tokenHash, ...session };
}

async function createAuthSession(userId) {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = Date.now() + sessionLifetimeMs;
  const stored = await updateAuthDb(db => {
    const user = db.users.find(item => item.id === userId);
    if (!user) return false;
    user.sessions = (user.sessions || []).filter(session => session.expiresAt > Date.now()).slice(-4);
    user.sessions.push({ tokenHash, expiresAt });
    return true;
  });
  if (!stored) return null;
  authSessions.set(tokenHash, { userId, expiresAt });
  return token;
}

async function restoreAuthSessions() {
  await authDbQueue;
  const db = await readAuthDb(), now = Date.now();
  for (const user of db.users) for (const session of user.sessions || []) {
    if (session.expiresAt > now && /^[a-f0-9]{64}$/.test(session.tokenHash)) authSessions.set(session.tokenHash, { userId:user.id, expiresAt:session.expiresAt });
  }
}

function setSessionCookie(res, token, clear = false) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `studyly_session=${clear ? '' : encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${clear ? 0 : Math.floor(sessionLifetimeMs / 1000)}${secure}`);
}

function authRateLimited(req) {
  const now = Date.now(), address = req.socket.remoteAddress || 'local';
  const recent = (authAttempts.get(address) || []).filter(time => now - time < 15 * 60_000);
  if (recent.length >= 12) return true;
  recent.push(now);
  authAttempts.set(address, recent);
  return false;
}

function defaultStudentState(user) {
  return { profile:{ name:user.name, email:user.email, school:'', class:user.class }, xp:0, streak:0, attempts:0, correct:0, done:0, topicStats:{}, missedQuestions:[], seenQuestions:[], activityDates:[], lessonNotes:{} };
}

function setStateProfile(state, user) {
  const safe = state && typeof state === 'object' && !Array.isArray(state) ? state : defaultStudentState(user);
  safe.profile = { ...defaultStudentState(user).profile, ...(safe.profile && typeof safe.profile === 'object' ? safe.profile : {}) };
  safe.profile.email = user.email;
  if (typeof safe.profile.name !== 'string' || safe.profile.name.trim().length < 2 || safe.profile.name.length > 60) safe.profile.name = user.name;
  if (!curriculum[safe.profile.class]) safe.profile.class = user.class;
  return safe;
}

function requestIsSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; }
  catch { return false; }
}

async function handleAuthRequest(req, res, url) {
  const route = url.pathname;
  if (!route.startsWith('/api/auth/')) return false;
  if (['POST','PUT'].includes(req.method) && !requestIsSameOrigin(req)) {
    json(res, 403, { error:'This request did not come from Studyly.' });
    return true;
  }
  try {
    if (route === '/api/auth/session' && req.method === 'GET') {
      const session = currentUser(req);
      if (!session) { json(res, 200, { user:null }); return true; }
      await authDbQueue;
      const db = await readAuthDb(), user = db.users.find(item => item.id === session.userId);
      if (!user) { authSessions.delete(session.tokenHash); setSessionCookie(res, '', true); json(res, 200, { user:null }); return true; }
      json(res, 200, { user:publicUser(user), state:user.studyState || null, exam:user.examState || null });
      return true;
    }

    if (route === '/api/auth/signup' && req.method === 'POST') {
      if (authRateLimited(req)) { json(res, 429, { error:'Too many account attempts. Wait 15 minutes and try again.' }); return true; }
      const body = await readBody(req);
      const name = typeof body.name === 'string' ? body.name.trim().slice(0, 60) : '';
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const studentClass = body.class, role = body.role;
      const password = typeof body.password === 'string' ? body.password : '';
      if (name.length < 2) { json(res, 400, { error:'Enter your name (at least 2 characters).' }); return true; }
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { json(res, 400, { error:'Enter a valid email address.' }); return true; }
      if (role !== 'student' && role !== 'teacher') { json(res, 400, { error:'Choose whether you are joining as a student or teacher.' }); return true; }
      if (!curriculum[studentClass]) { json(res, 400, { error:role === 'teacher' ? 'Choose the class you teach.' : 'Choose your class.' }); return true; }
      if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 128) { json(res, 400, { error:'Use a password between 8 and 128 bytes.' }); return true; }
      const salt = randomBytes(16).toString('hex'), passwordHash = (await scrypt(password, salt, 64)).toString('hex');
      const user = { id:randomBytes(16).toString('hex'), name, email, class:studentClass, role, salt, passwordHash, createdAt:new Date().toISOString(), studyState:null, examState:null };
      if (body.migrateProgress === true && body.localState && typeof body.localState === 'object') {
        const localBytes = Buffer.byteLength(JSON.stringify(body.localState), 'utf8');
        if (localBytes <= 750_000) {
          user.studyState = setStateProfile(body.localState, user);
          user.studyState.profile.name = user.name;
          user.studyState.profile.class = user.class;
        }
        if (body.localExam && typeof body.localExam === 'object' && Buffer.byteLength(JSON.stringify(body.localExam), 'utf8') <= 250_000) user.examState = body.localExam;
      }
      const created = await updateAuthDb(db => {
        if (db.users.some(item => item.email === email)) return false;
        db.users.push(user);
        return true;
      });
      if (!created) { json(res, 409, { error:'An account with this email already exists. Log in instead.' }); return true; }
      const token = await createAuthSession(user.id);
      if (!token) { json(res, 500, { error:'Your account was created, but Studyly could not start a session. Please log in.' }); return true; }
      setSessionCookie(res, token);
      json(res, 201, { user:publicUser(user), state:user.studyState, exam:user.examState });
      return true;
    }

    if (route === '/api/auth/login' && req.method === 'POST') {
      if (authRateLimited(req)) { json(res, 429, { error:'Too many account attempts. Wait 15 minutes and try again.' }); return true; }
      const body = await readBody(req), email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '', password = typeof body.password === 'string' ? body.password : '', role = body.role === 'teacher' ? 'teacher' : body.role === 'student' || body.role === undefined ? 'student' : null;
      await authDbQueue;
      const db = await readAuthDb(), user = db.users.find(item => item.email === email);
      let matches = false;
      if (user && password && password.length <= 128) {
        const candidate = await scrypt(password, user.salt, 64);
        const expected = Buffer.from(user.passwordHash, 'hex');
        matches = expected.length === candidate.length && timingSafeEqual(expected, candidate);
      }
      if (!matches) { json(res, 401, { error:'Email or password is incorrect.' }); return true; }
      if (!role) { json(res, 400, { error:'Choose whether you are signing in as a student or teacher.' }); return true; }
      const accountRole = user.role === 'teacher' ? 'teacher' : 'student';
      if (accountRole !== role) { json(res, 403, { error:`This account is registered as a ${accountRole}. Switch the role above and try again.` }); return true; }
      const token = await createAuthSession(user.id);
      if (!token) { json(res, 500, { error:'Studyly could not start your session. Please try again.' }); return true; }
      setSessionCookie(res, token);
      json(res, 200, { user:publicUser(user), state:user.studyState || null, exam:user.examState || null });
      return true;
    }

    if (route === '/api/auth/logout' && req.method === 'POST') {
      const session = currentUser(req);
      if (session) {
        authSessions.delete(session.tokenHash);
        await updateAuthDb(db => {
          const user = db.users.find(item => item.id === session.userId);
          if (user) user.sessions = (user.sessions || []).filter(item => item.tokenHash !== session.tokenHash);
          return true;
        });
      }
      setSessionCookie(res, '', true);
      json(res, 200, { ok:true });
      return true;
    }

    if (route === '/api/auth/state' && req.method === 'PUT') {
      const session = currentUser(req);
      if (!session) { json(res, 401, { error:'Log in to save your progress.' }); return true; }
      const body = await readBody(req, 1_250_000);
      if (!body.state || typeof body.state !== 'object' || Array.isArray(body.state)) { json(res, 400, { error:'Study progress was not in the expected format.' }); return true; }
      if (Buffer.byteLength(JSON.stringify(body.state), 'utf8') > 1_000_000 || (body.exam && Buffer.byteLength(JSON.stringify(body.exam), 'utf8') > 200_000)) { json(res, 413, { error:'This progress backup is too large to sync.' }); return true; }
      const saved = await updateAuthDb(db => {
        const user = db.users.find(item => item.id === session.userId);
        if (!user) return false;
        user.studyState = setStateProfile(body.state, user);
        user.examState = body.exam && typeof body.exam === 'object' && !Array.isArray(body.exam) ? body.exam : null;
        return true;
      });
      if (!saved) { json(res, 401, { error:'Your account could not be found. Please log in again.' }); return true; }
      json(res, 200, { ok:true });
      return true;
    }

    json(res, 405, { error:'This account action is not supported.' });
    return true;
  } catch (error) {
    if (error.status) json(res, error.status, { error:error.message });
    else { console.error('Studyly account request failed:', error.message); json(res, 500, { error:'Studyly could not complete that account action. Try again.' }); }
    return true;
  }
}

// ---- Classes and assignments ----
// A teacher creates a class with a join code and students join with it. Classes are stored in data/users.json.
const classCodeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const joinAttempts = new Map();
const oneLine = (value, max) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
const textBlock = (value, max) => typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim().slice(0, max) : '';
const localDay = time => { const d = new Date(time); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function newClassCode(db) {
  let code;
  do code = Array.from(randomBytes(6), byte => classCodeAlphabet[byte % classCodeAlphabet.length]).join('');
  while (db.classes.some(item => item.code === code));
  return code;
}

// What a teacher sees about a student in their class: activity and practice results, no account details.
function studentSummary(user) {
  const state = user.studyState && typeof user.studyState === 'object' ? user.studyState : {};
  const weekStart = localDay(Date.now() - 6 * 86_400_000);
  const daily = state.daily && typeof state.daily === 'object' ? state.daily : {};
  const activityDates = Array.isArray(state.activityDates) ? state.activityDates : [];
  const weak = Object.entries(state.topicStats && typeof state.topicStats === 'object' ? state.topicStats : {})
    .filter(([, stat]) => stat?.attempts >= 2 && stat.correct / stat.attempts < 0.7)
    .map(([key, stat]) => { const [, subject, topic] = key.split('::'); return { subject, topic, accuracy:Math.round(stat.correct / stat.attempts * 100) }; })
    .sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);
  return {
    id:user.id, name:user.name, studentClass:user.class,
    lastActive:[...activityDates].sort().pop() || null,
    activeDays:activityDates.filter(day => day >= weekStart).length,
    weekQuestions:Object.entries(daily).filter(([day]) => day >= weekStart).reduce((n, [, counts]) => n + (Number(counts?.questions) || 0), 0),
    attempts:Number(state.attempts) || 0,
    accuracy:state.attempts ? Math.round(state.correct / state.attempts * 100) : null,
    streak:Number(state.streak) || 0,
    weak
  };
}

function assignmentMeta(assignment) {
  return { id:assignment.id, type:assignment.type, title:assignment.title, subject:assignment.subject, topic:assignment.topic, instructions:assignment.instructions, dueDate:assignment.dueDate, createdAt:assignment.createdAt, questionCount:assignment.questions?.length || 0 };
}

// Live lessons are links to a call (Google Meet, Zoom, Teams, WhatsApp…) with a start time; Studyly does not host video.
const byStart = lessons => [...(lessons || [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
const lessonEnd = lesson => Date.parse(lesson.startsAt) + lesson.duration * 60_000;

function teacherClassView(item, db) {
  const members = item.members.map(id => db.users.find(user => user.id === id)).filter(Boolean);
  return {
    id:item.id, code:item.code, name:item.name, level:item.level, subject:item.subject, createdAt:item.createdAt,
    lessons:byStart(item.lessons), announcements:item.announcements || [],
    students:members.map(studentSummary),
    assignments:item.assignments.map(assignment => ({
      ...assignmentMeta(assignment), questions:assignment.questions,
      results:members.map(user => ({ studentId:user.id, name:user.name, ...(assignment.submissions?.[user.id] || {}) }))
    }))
  };
}

function studentClassView(item, db, userId) {
  return {
    id:item.id, name:item.name, level:item.level, subject:item.subject,
    teacherName:db.users.find(user => user.id === item.teacherId)?.name || 'Your teacher',
    // Students see lessons until a day after they end, and the 50 newest announcements.
    lessons:byStart(item.lessons).filter(lesson => lessonEnd(lesson) > Date.now() - 86_400_000),
    announcements:(item.announcements || []).slice(0, 50),
    assignments:item.assignments.map(assignment => {
      const mine = assignment.submissions?.[userId] || null;
      return {
        ...assignmentMeta(assignment),
        // Answers and explanations are only sent once the student has submitted.
        questions:assignment.type === 'quiz' ? assignment.questions.map(q => ({ question:q.question, options:q.options, ...(mine ? { answer:q.answer, explanation:q.explanation } : {}) })) : [],
        submission:mine
      };
    })
  };
}

function cleanAssignment(body, level) {
  const type = body.type === 'quiz' || body.type === 'task' ? body.type : null;
  if (!type) return { error:'Choose a quiz or a topic task.' };
  const subject = oneLine(body.subject, 60), topic = oneLine(body.topic, 120);
  if (!curriculum[level]?.[subject]) return { error:'Choose a subject from this class level.' };
  if (!topic) return { error:'Choose a topic.' };
  const questions = [];
  if (type === 'quiz') {
    for (const q of Array.isArray(body.questions) ? body.questions.slice(0, 30) : []) {
      const question = oneLine(q?.question, 500), options = Array.isArray(q?.options) ? q.options.map(option => oneLine(option, 200)) : [];
      if (!question || options.length !== 4 || options.some(option => !option) || !Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) continue;
      questions.push({ question, options, answer:q.answer, explanation:oneLine(q.explanation, 800) });
    }
    if (!questions.length) return { error:'Add at least one complete question to the quiz.' };
  }
  return { assignment:{
    id:randomBytes(8).toString('hex'), type, subject, topic,
    title:oneLine(body.title, 100) || `${topic} ${type === 'quiz' ? 'quiz' : 'task'}`,
    instructions:textBlock(body.instructions, 1_000),
    dueDate:/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate || '') ? body.dueDate : '',
    createdAt:new Date().toISOString(), questions, submissions:{}
  } };
}

function cleanLesson(body) {
  const title = oneLine(body.title, 80);
  if (title.length < 2) return { error:'Give the lesson a title, for example "Revision: quadratic equations".' };
  let link;
  try { link = new URL(String(body.url || '').trim()); } catch { return { error:'Paste the full call link, starting with https://' }; }
  if (link.protocol !== 'https:' || link.href.length > 300) return { error:'Use a secure call link that starts with https://' };
  const startsAt = Date.parse(body.startsAt);
  if (!Number.isFinite(startsAt)) return { error:'Choose the date and start time.' };
  if (startsAt < Date.now() - 86_400_000 || startsAt > Date.now() + 366 * 86_400_000) return { error:'Choose a date from today up to a year ahead.' };
  const duration = [30, 45, 60, 90, 120].includes(Number(body.duration)) ? Number(body.duration) : 60;
  return { lesson:{ id:randomBytes(8).toString('hex'), title, url:link.href, startsAt:new Date(startsAt).toISOString(), duration, createdAt:new Date().toISOString() } };
}

async function handleClassRequest(req, res, url) {
  if (!url.pathname.startsWith('/api/classes')) return false;
  const session = currentUser(req);
  if (!session) { json(res, 401, { error:'Log in to use classes.' }); return true; }
  if (req.method !== 'GET' && !requestIsSameOrigin(req)) { json(res, 403, { error:'This request did not come from Studyly.' }); return true; }
  // /api/classes/:classId/:section/:itemId/:action
  const [, , , classId, section, itemId, action] = url.pathname.split('/');
  const fail = (status, error) => Object.assign(new Error(error), { status });
  try {
    await authDbQueue;
    const snapshot = await readAuthDb(), me = snapshot.users.find(user => user.id === session.userId);
    if (!me) throw fail(401, 'Log in again to use classes.');
    const teacher = me.role === 'teacher';
    const ownClass = (db, id) => { const item = db.classes.find(c => c.id === id); if (!item || item.teacherId !== me.id) throw fail(404, 'That class was not found.'); return item; };
    const memberClass = (db, id) => { const item = db.classes.find(c => c.id === id); if (!item || !item.members.includes(me.id)) throw fail(404, 'That class was not found.'); return item; };
    const view = (db, item) => teacher ? teacherClassView(item, db) : studentClassView(item, db, me.id);
    const send = (status, body) => { json(res, status, body); return true; };

    if (!classId && req.method === 'GET') {
      const mine = snapshot.classes.filter(item => teacher ? item.teacherId === me.id : item.members.includes(me.id));
      return send(200, { role:teacher ? 'teacher' : 'student', classes:mine.map(item => view(snapshot, item)) });
    }
    if (!classId && req.method === 'POST') {
      if (!teacher) throw fail(403, 'Only teachers can create classes.');
      const body = await readBody(req);
      const name = oneLine(body.name, 60), level = body.level, subject = oneLine(body.subject, 60);
      if (name.length < 2) throw fail(400, 'Give the class a name, for example "SS2 Gold".');
      if (!curriculum[level]) throw fail(400, 'Choose the class level.');
      if (subject && !curriculum[level][subject]) throw fail(400, 'Choose a subject from this class level, or leave it blank.');
      const created = await updateAuthDb(db => {
        // A repeated click sends the same request twice; return the class just created instead of a copy.
        const recent = db.classes.find(item => item.teacherId === me.id && item.name === name && item.level === level && Date.now() - Date.parse(item.createdAt) < 10_000);
        if (recent) return view(db, recent);
        if (db.classes.filter(item => item.teacherId === me.id).length >= 30) throw fail(400, 'You can have up to 30 classes.');
        const item = { id:randomBytes(8).toString('hex'), code:newClassCode(db), name, level, subject, teacherId:me.id, createdAt:new Date().toISOString(), members:[], assignments:[] };
        db.classes.push(item);
        return view(db, item);
      });
      return send(201, { class:created });
    }
    if (classId === 'join' && req.method === 'POST') {
      if (teacher) throw fail(403, 'Teachers create classes; students join them with a code.');
      const recent = (joinAttempts.get(me.id) || []).filter(time => Date.now() - time < 15 * 60_000);
      if (recent.length >= 10) throw fail(429, 'Too many join attempts. Wait 15 minutes and try again.');
      joinAttempts.set(me.id, [...recent, Date.now()]);
      const code = oneLine((await readBody(req)).code, 20).toUpperCase().replace(/[^A-Z0-9]/g, '');
      const joined = await updateAuthDb(db => {
        const item = db.classes.find(c => c.code === code);
        if (!item) throw fail(404, 'No class has that code. Check it with your teacher.');
        if (!item.members.includes(me.id)) {
          if (item.members.length >= 300) throw fail(400, 'This class is full.');
          item.members.push(me.id);
        }
        return view(db, item);
      });
      return send(200, { class:joined });
    }
    if (classId && !section && req.method === 'DELETE') {
      await updateAuthDb(db => { ownClass(db, classId); db.classes = db.classes.filter(c => c.id !== classId); });
      return send(200, { ok:true });
    }
    if (section === 'leave' && req.method === 'POST') {
      await updateAuthDb(db => { const item = memberClass(db, classId); item.members = item.members.filter(id => id !== me.id); });
      return send(200, { ok:true });
    }
    if (section === 'members' && itemId && req.method === 'DELETE') {
      return send(200, { class:await updateAuthDb(db => { const item = ownClass(db, classId); item.members = item.members.filter(id => id !== itemId); return view(db, item); }) });
    }
    if (section === 'assignments' && !itemId && req.method === 'POST') {
      const body = await readBody(req, 200_000);
      return send(201, { class:await updateAuthDb(db => {
        const item = ownClass(db, classId);
        if (item.assignments.length >= 100) throw fail(400, 'Delete some old assignments first (limit 100 per class).');
        const { assignment, error } = cleanAssignment(body, item.level);
        if (error) throw fail(400, error);
        item.assignments.unshift(assignment);
        return view(db, item);
      }) });
    }
    if (section === 'assignments' && itemId && !action && req.method === 'DELETE') {
      return send(200, { class:await updateAuthDb(db => { const item = ownClass(db, classId); item.assignments = item.assignments.filter(a => a.id !== itemId); return view(db, item); }) });
    }
    if (section === 'lessons' && !itemId && req.method === 'POST') {
      const body = await readBody(req);
      return send(201, { class:await updateAuthDb(db => {
        const item = ownClass(db, classId);
        const { lesson, error } = cleanLesson(body);
        if (error) throw fail(400, error);
        // Lessons that ended more than 30 days ago are tidied away.
        item.lessons = (item.lessons || []).filter(l => lessonEnd(l) > Date.now() - 30 * 86_400_000);
        if (item.lessons.length >= 50) throw fail(400, 'Delete some lessons first (limit 50 per class).');
        item.lessons.push(lesson);
        return view(db, item);
      }) });
    }
    if (section === 'lessons' && itemId && !action && req.method === 'DELETE') {
      return send(200, { class:await updateAuthDb(db => { const item = ownClass(db, classId); item.lessons = (item.lessons || []).filter(l => l.id !== itemId); return view(db, item); }) });
    }
    if (section === 'announcements' && !itemId && req.method === 'POST') {
      const text = textBlock((await readBody(req)).text, 1_000);
      if (text.length < 2) throw fail(400, 'Write a message for your class.');
      return send(201, { class:await updateAuthDb(db => {
        const item = ownClass(db, classId);
        // Newest first; only the 100 most recent are kept.
        item.announcements = [{ id:randomBytes(8).toString('hex'), text, createdAt:new Date().toISOString() }, ...(item.announcements || [])].slice(0, 100);
        return view(db, item);
      }) });
    }
    if (section === 'announcements' && itemId && !action && req.method === 'DELETE') {
      return send(200, { class:await updateAuthDb(db => { const item = ownClass(db, classId); item.announcements = (item.announcements || []).filter(n => n.id !== itemId); return view(db, item); }) });
    }
    if (section === 'assignments' && itemId && action === 'submit' && req.method === 'POST') {
      const body = await readBody(req, 20_000);
      return send(200, { class:await updateAuthDb(db => {
        const item = memberClass(db, classId), assignment = item.assignments.find(a => a.id === itemId);
        if (!assignment) throw fail(404, 'That assignment was not found.');
        assignment.submissions ||= {};
        if (assignment.submissions[me.id]) throw fail(409, 'You have already submitted this assignment.');
        if (assignment.type === 'quiz') {
          // The server marks quizzes, so answers never have to be sent to the browser before submission.
          const answers = assignment.questions.map((_, i) => Number.isInteger(body.answers?.[i]) && body.answers[i] >= 0 && body.answers[i] <= 3 ? body.answers[i] : null);
          assignment.submissions[me.id] = { score:assignment.questions.filter((q, i) => answers[i] === q.answer).length, total:assignment.questions.length, answers, submittedAt:new Date().toISOString() };
        } else assignment.submissions[me.id] = { done:true, submittedAt:new Date().toISOString() };
        return view(db, item);
      }) });
    }
    return send(404, { error:'That class action is not supported.' });
  } catch (error) {
    if (error.status) json(res, error.status, { error:error.message });
    else { console.error('Studyly class request failed:', error.message); json(res, 500, { error:'Studyly could not complete that class action. Try again.' }); }
    return true;
  }
}

await restoreAuthSessions();

const tutorInstructions = `You are Studyly, a patient, encouraging tutor for Nigerian secondary-school learners (JSS1–SS3).

Curriculum and level
- Teach at the stated class level and stay aligned with the stated subject and topic, following the Nigerian NERDC curriculum.
- Prepare learners for the exams that match their class: BECE for JSS3, WAEC and NECO SSCE for SS classes, and JAMB UTME for SS3. Never claim a question is an official past question; label practice questions as original.
- Use Nigerian context where it helps (naira, local places, foods, names and everyday situations) and British spelling as used in Nigerian schools.
- If the subject is "Online skills", the learner is taking the beginner online-skills course named in the topic. Teach it practically, safely and step by step for a secondary-school beginner.

What you can do
- Explain concepts simply, then build up. Solve problems step by step. Check a learner's answer and correct mistakes kindly.
- Quizzes: ask one question at a time, wait for the answer, mark it, explain, then continue, unless a full set is requested.
- Flashcards: give numbered Front / Back pairs. Summaries and revision notes: key terms, key facts or formulae, a worked example and common exam mistakes.
- Revision timetables, definitions, translations, and constructive feedback on writing.
- Photo questions: when a photo is attached, first state briefly which question you can read in it (ask for a clearer, closer photo if you cannot read it), then teach the solution step by step. If it looks like a test or exam the learner is sitting right now, explain the method without just handing over final answers.
- For signed-in teachers: practical class-aligned lesson plans (objectives, steps, activities, assessment, differentiation, homework), classroom strategies, and draft exam questions with answer keys or marking guides.
- Messages labelled "Teacher request" come from a signed-in teacher. Write for the teacher as a professional colleague: no greetings, encouragement or questions aimed at learners, and no chat-style sign-off. Give the requested material ready to use, and check every answer key before including it.

Formatting (the app renders simple Markdown)
- Short paragraphs. **Bold** key terms. Use "-" bullet lists and "1." numbered steps. Use "###" headings only for longer answers.
- Write mathematics in plain text with Unicode symbols: x², x³, √, ×, ÷, ±, ≤, ≥, ≠, π, θ, °, and fractions such as (a + b)/c. Never use LaTeX or dollar signs.
- Show calculations line by line with units. Keep most answers under about 400 words unless the learner asks for more detail or a long document such as a lesson note.

Accuracy and integrity
- Use earlier turns to understand follow-up questions. Never invent curriculum or exam facts; say plainly when you are unsure and suggest checking the textbook or teacher.
- If a question is outside the selected subject or class, answer briefly if helpful and guide the learner back.
- Do not help anyone cheat in a live exam or test. Do not ask for personal information.`;
const generatorInstructions = 'You create accurate, original study materials for Nigerian secondary-school learners, aligned with the NERDC curriculum and the matching BECE, WAEC, NECO or JAMB expectations. Double-check every fact and calculation. Respond with JSON only.';

// Keep the most recent conversation turns that fit a character budget, shortening very long ones.
function cleanTurns(raw) {
  const turns = Array.isArray(raw) ? raw.slice(-12) : [];
  const kept = [];
  let budget = 16_000;
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    if (!turn || !['user','assistant'].includes(turn.role) || typeof turn.content !== 'string') continue;
    let content = turn.content.trim();
    if (!content) continue;
    if (content.length > 4_000) content = `${content.slice(0, 1_500)}\n…\n${content.slice(-2_500)}`;
    if (content.length > budget) break;
    budget -= content.length;
    kept.unshift({ role:turn.role, content });
  }
  return kept;
}

// Providers expect the conversation to start with the learner and alternate speakers.
function alternateTurns(turns) {
  const merged = [];
  for (const turn of turns) {
    const last = merged[merged.length - 1];
    if (last && last.role === turn.role) { last.content += `\n\n${turn.content}`; if (turn.image) last.image = turn.image; }
    else merged.push({ ...turn });
  }
  while (merged.length && merged[0].role !== 'user') merged.shift();
  return merged;
}

function providerFailure(status, data, model) {
  console.error(`${provider} request failed:`, model || '', status, data?.error?.status || data?.error?.code || data?.error || 'upstream_error');
  if (provider === 'ollama') return Object.assign(new Error(`Ollama returned an error. Check that the ${ollamaModel} model is installed and Ollama is running.`), { status:502 });
  const gemini = provider === 'gemini';
  // Gemini's 429 details say which quota ran out (per minute or per day) and how long to wait.
  const details = Array.isArray(data?.error?.details) ? data.error.details : [];
  const retryDelaySeconds = Number.parseFloat(details.find(detail => String(detail?.['@type']).endsWith('RetryInfo'))?.retryDelay) || 0;
  const dailyQuota = details.some(detail => (detail?.violations || []).some(violation => /PerDay/i.test(violation?.quotaId || '')));
  const message = status === 429
    ? (gemini
      ? (dailyQuota ? "Today's free Gemini limit for this API key has been used up. It resets once a day (around 8–9 am Nigerian time). Try again then, or enable billing in Google AI Studio." : `Gemini's free plan allows only a few requests per minute, and that limit was just reached. Wait about ${Math.max(10, Math.ceil(retryDelaySeconds) || 30)} seconds, then try again.`)
      : 'The tutor is busy or the API quota is unavailable. Please try again shortly.')
    : status === 401 ? (gemini ? 'Gemini rejected the API key. Create or copy a current key in Google AI Studio, update GEMINI_API_KEY in .env, then restart Studyly.' : 'OpenAI rejected the API key. Update OPENAI_API_KEY in .env, then restart Studyly.')
    : status === 403 ? (gemini ? 'Gemini denied this key or project. Check that the key belongs to a project with Gemini API access.' : 'OpenAI denied this request. Check the key and its project permissions.')
    : status === 404 ? `The model ${gemini ? model : openAIModel} was not found. Check ${gemini ? 'GEMINI_MODEL and GEMINI_FALLBACK_MODELS' : 'OPENAI_MODEL'} in .env.`
    : status === 400 ? 'The AI provider rejected this request. Check the model setting and try a shorter question.'
    : status >= 500 ? `${gemini ? 'Gemini' : 'The AI provider'} is busy or briefly unavailable. Wait a minute, then try again.`
    : 'The AI provider returned an error. Check the server terminal for its status code, then try again.';
  // A short per-minute wait (or a busy provider without backups) is worth one automatic retry on the same model.
  const retryAfterMs = status === 429 && !dailyQuota && retryDelaySeconds > 0 && retryDelaySeconds <= 20 ? retryDelaySeconds * 1_000 + 500 : status >= 500 && !gemini ? 2_000 : 0;
  // For Gemini, quota, availability and missing-model errors move on to the next backup model for a while.
  const restMs = !gemini ? 0 : status === 429 ? Math.max(30_000, retryDelaySeconds * 1_000) : status >= 500 ? 60_000 : status === 404 ? 6 * 3_600_000 : 0;
  return Object.assign(new Error(message), { status:status === 429 ? 429 : status === 401 || status === 403 ? 503 : 502, retryAfterMs, restMs, busy:status >= 500 });
}

async function callWithRetry(options) {
  try { return await callModelOnce(options); }
  catch (error) {
    if (!error.retryAfterMs) throw error;
    await new Promise(resolve => setTimeout(resolve, error.retryAfterMs));
    return callModelOnce(options);
  }
}

async function callModel(options) {
  if (provider !== 'gemini') return callWithRetry(options);
  let lastError = null;
  const deadline = Date.now() + 100_000;
  // Free-tier demand spikes can make every model busy at once and usually pass within seconds, so a second
  // pass after a short pause also tries models that were only resting because they were busy.
  for (let pass = 0; pass < 2 && Date.now() < deadline; pass++) {
    let busySkipped = false;
    if (pass) await new Promise(resolve => setTimeout(resolve, 3_000));
    for (const model of geminiModels) {
      if (Date.now() > deadline) break;
      const resting = geminiRestingUntil.get(model);
      if (resting && resting.until > Date.now() && !(pass && resting.busy)) { busySkipped ||= resting.busy; continue; }
      try { return await callWithRetry({ ...options, model }); }
      catch (error) {
        lastError = error;
        if (!error.restMs) throw error;
        geminiRestingUntil.set(model, { until:Date.now() + error.restMs, busy:Boolean(error.busy) });
        console.log(`Gemini model ${model} ${error.busy ? 'is busy' : 'hit a free-tier limit'}; resting it for ${Math.max(1, Math.round(error.restMs / 60_000))} min and trying the next model.`);
      }
    }
    if (!lastError?.busy && !busySkipped) break;
  }
  throw lastError || Object.assign(new Error("All of Studyly's Gemini models have reached their free limits for now. Daily limits reset around 8–9 am Nigerian time; enabling billing in Google AI Studio removes this limit."), { status:429 });
}

async function callModelOnce({ system, turns, json:wantJson = false, maxTokens = 8_192, model = geminiModel }) {
  let upstream;
  try {
    if (provider === 'ollama') {
      upstream = await fetch(`${ollamaUrl}/api/chat`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        signal:AbortSignal.timeout(180_000),
        body:JSON.stringify({ model:ollamaModel, stream:false, ...(wantJson ? { format:'json' } : {}), messages:[{ role:'system', content:system }, ...turns.map(turn => ({ role:turn.role, content:turn.content, ...(turn.image ? { images:[turn.image.data] } : {}) }))] })
      });
    } else if (provider === 'gemini') {
      // Thinking tokens count against maxOutputTokens, so keep thinking light to leave room for the answer.
      const thinkingConfig = /^gemini-[3-9]/.test(model) ? { thinkingLevel:'low' } : /^gemini-2\.5/.test(model) ? { thinkingBudget:1_024 } : null;
      upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method:'POST',
        headers:{ 'x-goog-api-key':geminiApiKey, 'Content-Type':'application/json' },
        // A healthy reply takes 5–20 seconds; an overloaded free-tier model can hang, so move on after 45.
        signal:AbortSignal.timeout(45_000),
        body:JSON.stringify({
          systemInstruction:{ parts:[{ text:system }] },
          contents:turns.map(turn => ({ role:turn.role === 'assistant' ? 'model' : 'user', parts:[{ text:turn.content }, ...(turn.image ? [{ inlineData:{ mimeType:turn.image.mimeType, data:turn.image.data } }] : [])] })),
          generationConfig:{ maxOutputTokens:maxTokens, ...(wantJson ? { responseMimeType:'application/json' } : {}), ...(thinkingConfig ? { thinkingConfig } : {}) }
        })
      });
    } else {
      upstream = await fetch('https://api.openai.com/v1/responses', {
        method:'POST',
        headers:{ Authorization:`Bearer ${openAIApiKey}`, 'Content-Type':'application/json' },
        signal:AbortSignal.timeout(90_000),
        body:JSON.stringify({ model:openAIModel, store:false, instructions:system, input:turns.map(turn => turn.image ? { role:turn.role, content:[{ type:'input_text', text:turn.content }, { type:'input_image', image_url:`data:${turn.image.mimeType};base64,${turn.image.data}` }] } : { role:turn.role, content:turn.content }), max_output_tokens:maxTokens, ...(/^(gpt-5|o\d)/.test(openAIModel) ? { reasoning:{ effort:'low' } } : {}), ...(wantJson ? { text:{ format:{ type:'json_object' } } } : {}) })
      });
    }
  } catch (error) {
    console.error('AI transport error:', provider, error.name || 'Error', error.cause?.code || '');
    if (provider === 'ollama') throw Object.assign(new Error(`Local AI is offline. Start Ollama and download ${ollamaModel}, then try again.`), { status:503 });
    // For Gemini a timeout counts as "busy": rest that model and let callModel try the next one.
    if (error.name === 'TimeoutError' || error.name === 'AbortError') throw Object.assign(new Error('The AI provider took too long to respond. Try again in a moment.'), { status:504, ...(provider === 'gemini' ? { restMs:120_000, busy:true } : {}) });
    throw Object.assign(new Error(`Could not connect to ${provider === 'gemini' ? 'Google Gemini' : 'the AI provider'}. Check this computer's internet connection and try again.`), { status:503 });
  }
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) throw providerFailure(upstream.status, data, provider === 'gemini' ? model : '');
  let text = '', truncated = false;
  if (provider === 'ollama') {
    text = data?.message?.content || '';
    truncated = data?.done_reason === 'length';
  } else if (provider === 'gemini') {
    const candidate = data?.candidates?.[0];
    text = (candidate?.content?.parts || []).filter(part => !part.thought).map(part => part.text || '').join('');
    truncated = candidate?.finishReason === 'MAX_TOKENS';
    if (!text.trim() && (data?.promptFeedback?.blockReason || ['SAFETY','PROHIBITED_CONTENT','BLOCKLIST'].includes(candidate?.finishReason))) throw Object.assign(new Error('Gemini blocked this request. Rephrase the question and try again.'), { status:400 });
  } else {
    // The raw Responses API returns text inside output[].content[]; output_text only exists in the SDKs.
    text = typeof data?.output_text === 'string' ? data.output_text : (data?.output || []).flatMap(item => item?.type === 'message' ? item.content || [] : []).filter(part => part?.type === 'output_text').map(part => part.text || '').join('');
    truncated = data?.status === 'incomplete';
  }
  text = text.trim();
  if (!text) throw Object.assign(new Error(truncated ? 'The answer ran out of space before it finished. Ask for a shorter answer.' : 'The tutor returned an empty answer. Please try again.'), { status:502 });
  return { text, truncated, model:provider === 'gemini' ? model : provider === 'openai' ? openAIModel : ollamaModel };
}

function parseModelJson(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf('{'), end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) { try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {} }
  return null;
}

const plainText = (value, max) => typeof value === 'string' || typeof value === 'number' ? String(value).replace(/\s+/g, ' ').trim().slice(0, max) : '';

function examStyleFor(cls, requested) {
  if (requested === 'WAEC' || requested === 'NECO' || requested === 'BECE') return requested;
  if (requested === 'JAMB / UTME') return 'JAMB UTME';
  if (requested === 'School Examination') return 'Nigerian school examinations';
  return cls === 'JSS3' ? 'BECE' : cls.startsWith('JSS') ? 'Nigerian junior secondary school examinations' : cls === 'SS3' ? 'WAEC, NECO and JAMB UTME' : 'WAEC and NECO SSCE';
}

function generationPrompt({ kind, cls, subject, topics, count, notes, exam }) {
  const scope = subject === skillsSubject ? `the beginner online-skills course "${topics[0]}"` : topics.length > 1 ? `${subject}, covering these topics: ${topics.join('; ')}` : `${subject}, topic "${topics[0]}"`;
  const source = notes ? `\nBase the content only on these study notes:\n"""\n${notes}\n"""\n` : '';
  const plain = 'Plain text only: no Markdown and no LaTeX; write maths with Unicode symbols such as x², √, × and ÷.';
  if (kind === 'flashcards') return `Create ${count} accurate revision flashcards for a Nigerian ${cls} learner studying ${scope}.${source}
Each card tests one idea: a definition, key fact, formula, process step, cause and effect, example or common exam point. Front: a short question or prompt (at most 20 words). Back: a clear, correct answer (at most 45 words). No duplicate cards. ${plain}
Return JSON only, shaped exactly like {"cards":[{"front":"...","back":"..."}]}.`;
  return `Write ${count} original multiple-choice practice questions for a Nigerian ${cls} learner studying ${scope}, in the style of ${exam} questions.${source}
Rules: match the class level; exactly four options per question; exactly one unambiguous correct option and three plausible distractors; never use "all of the above" or "none of the above"; a short hint that does not reveal the answer; a one- or two-sentence explanation of why the answer is correct. Check every calculation carefully. Do not copy real past questions. ${plain}
Return JSON only, shaped exactly like {"questions":[{"topic":"...","question":"...","options":["...","...","...","..."],"answer":0,"hint":"...","explanation":"..."}]} where "answer" is the 0-based index of the correct option${topics.length > 1 ? ' and "topic" is copied exactly from the topic list' : ''}.`;
}

// Text where the model corrects itself mid-answer ("Wait, let's recalculate…") marks an item it got wrong.
const selfCorrection = /\b(wait|recalculat\w*|let'?s (check|use|adjust|rewrite|re-?do|try)|let me|correction|oops|hmm|not an integer|is incorrect\. let)\b/i;

function cleanGenerated(kind, parsed, topics, seen = new Set()) {
  if (kind === 'flashcards') {
    return (Array.isArray(parsed?.cards) ? parsed.cards : []).map(card => ({ front:plainText(card?.front, 300), back:plainText(card?.back, 600) })).filter(card => {
      const key = card.front.toLowerCase();
      if (!card.front || !card.back || seen.has(key) || selfCorrection.test(card.back)) return false;
      seen.add(key);
      return true;
    });
  }
  return (Array.isArray(parsed?.questions) ? parsed.questions : []).map(item => {
    const question = plainText(item?.question, 500);
    const options = Array.isArray(item?.options) ? item.options.map(option => plainText(option, 200)).filter(Boolean) : [];
    const answer = typeof item?.answer === 'string' && /^\s*[A-D]\s*$/i.test(item.answer) ? item.answer.trim().toUpperCase().charCodeAt(0) - 65 : Number(item?.answer);
    if (!question || options.length !== 4 || new Set(options.map(option => option.toLowerCase())).size !== 4 || !Number.isInteger(answer) || answer < 0 || answer > 3 || seen.has(question.toLowerCase())) return null;
    if (selfCorrection.test(`${plainText(item?.explanation, 800)} ${plainText(item?.hint, 300)}`)) return null;
    seen.add(question.toLowerCase());
    // Shuffle so the correct option does not always sit in the same position.
    const correctText = options[answer];
    for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }
    const topic = topics.find(t => t.toLowerCase() === plainText(item?.topic, 120).toLowerCase()) || topics[0];
    return { topic, question, options, answer:options.indexOf(correctText), hint:plainText(item?.hint, 300), explanation:plainText(item?.explanation, 800) };
  }).filter(Boolean);
}

async function handleAiRequest(req, res, route) {
  const session = currentUser(req);
  if (!session) return json(res, 401, { error:'Log in to use the Studyly tutor.' });
  if (req.method !== 'POST') return json(res, 405, { error:'Use POST for tutor requests.' });
  if (!['openai','ollama','gemini'].includes(provider)) return json(res, 500, { error:'Set AI_PROVIDER to openai, ollama, or gemini in the server .env file.' });
  if (provider === 'openai' && !openAIApiKey) return json(res, 503, { error:'AI tutor is not configured. Set OPENAI_API_KEY on the server.' });
  if (provider === 'gemini' && !geminiApiKey) return json(res, 503, { error:'AI tutor is not configured. Set GEMINI_API_KEY on the server.' });
  try {
    // Limit per account: on one shared computer or school network every learner has the same address.
    const now = Date.now();
    const recentRequests = (tutorRequestTimes.get(session.userId) || []).filter(time => now - time < 60_000);
    if (recentRequests.length >= 30) return json(res, 429, { error:'You are sending tutor requests very quickly. Wait a minute and try again.' });
    recentRequests.push(now);
    tutorRequestTimes.set(session.userId, recentRequests);
    // Photo questions carry a resized image (well under 3 MB once base64-encoded).
    const body = await readBody(req, 3_200_000);
    const cls = body.class, subject = body.subject;
    const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
    if (topic.length > 120) return json(res, 400, { error:'Topic must be 120 characters or fewer.' });
    if (!curriculum[cls] || (subject !== skillsSubject && !curriculum[cls][subject])) return json(res, 400, { error:'Choose a subject available in your selected class.' });
    if (subject === skillsSubject && !topic) return json(res, 400, { error:'Choose an online skills course first.' });

    if (route === '/api/ai/tutor') {
      const question = typeof body.question === 'string' ? body.question.trim() : '';
      if (question.length < 2 || question.length > 4_000) return json(res, 400, { error:'Question must be between 2 and 4000 characters.' });
      // Teachers get answers written for them rather than for a learner.
      const teacher = (await readAuthDb()).users.find(user => user.id === session.userId)?.role === 'teacher';
      let image = null;
      if (body.image) {
        const { mimeType, data } = body.image;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType) || typeof data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return json(res, 400, { error:'Send the photo as a JPEG, PNG or WebP image.' });
        if (data.length > 3_000_000) return json(res, 413, { error:'That photo is too large. Take a closer photo of just the question.' });
        image = { mimeType, data };
      }
      const header = subject === skillsSubject ? `Learner class: ${cls}\nTrack: Online skills course\nCourse: ${topic}` : `${teacher ? 'Class taught' : 'Student class'}: ${cls}\nSubject: ${subject}\nSelected topic: ${topic || 'Not specified'}`;
      const photoNote = image ? '\n(A photo is attached.)' : '';
      const { text, truncated, model } = await callModel({ system:tutorInstructions, turns:alternateTurns([...cleanTurns(body.history), { role:'user', content:`${header}${photoNote}\n\n${teacher ? 'Teacher request' : 'Student question'}: ${question}`, ...(image ? { image } : {}) }]) });
      return json(res, 200, { answer:text, truncated, model });
    }

    const kind = body.kind === 'questions' || body.kind === 'flashcards' ? body.kind : null;
    if (!kind) return json(res, 400, { error:'Choose flashcards or practice questions.' });
    const subjectTopics = subject === skillsSubject ? [topic] : curriculum[cls][subject];
    const topics = Array.isArray(body.topics) ? [...new Set(body.topics.filter(t => typeof t === 'string' && subjectTopics.includes(t)))].slice(0, 12) : [];
    if (!topics.length) topics.push(topic || subjectTopics[0]);
    const count = Math.max(1, Math.min(kind === 'flashcards' ? 12 : 10, Math.round(Number(body.count) || 5)));
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 8_000) : '';
    const exam = examStyleFor(cls, body.exam), seen = new Set();
    const generate = async n => cleanGenerated(kind, parseModelJson((await callModel({ system:generatorInstructions, turns:[{ role:'user', content:generationPrompt({ kind, cls, subject, topics, count:n, notes, exam }) }], json:true })).text), topics, seen);
    const items = await generate(count);
    // Items dropped as invalid or self-correcting are replaced with one more request for the shortfall.
    if (items.length && items.length < count) items.push(...await generate(count - items.length).catch(() => []));
    items.splice(count);
    if (!items.length) return json(res, 502, { error:'The tutor could not produce usable items this time. Please try again.' });
    return json(res, 200, kind === 'flashcards' ? { cards:items } : { questions:items });
  } catch (error) {
    if (error.status) return json(res, error.status, { error:error.message });
    console.error('Studyly AI request failed:', error.message);
    return json(res, 500, { error:'Studyly could not complete that tutor request. Try again.' });
  }
}

// Online skills courses live in content/skills/<id>.json, ordered by content/skills/index.json, and are read on
// every request so course edits show up without a restart. A course with no JSON file (or a broken one) falls back
// to its entry in the older content/skills.js, so the page always has the full list.
async function buildSkillsScript() {
  const dir = path.join(root, 'content', 'skills');
  let order = [], legacy = [];
  try { order = JSON.parse(await readFile(path.join(dir, 'index.json'), 'utf8')); } catch {}
  try { legacy = new Function(`const window = {};\n${await readFile(path.join(root, 'content', 'skills.js'), 'utf8')}\nreturn window.STUDYLY_SKILLS || [];`)(); } catch {}
  const courses = [];
  for (const id of Array.isArray(order) ? order : []) {
    try { courses.push(JSON.parse(await readFile(path.join(dir, `${id}.json`), 'utf8'))); }
    catch (error) {
      if (error.code !== 'ENOENT') console.error(`Course content/skills/${id}.json could not be read:`, error.message);
      const old = legacy.find(course => course.id === id);
      if (old) courses.push(old);
    }
  }
  for (const old of legacy) if (!courses.some(course => course.id === old.id)) courses.push(old);
  return `window.STUDYLY_SKILLS=${JSON.stringify(courses)};\n`;
}

function sendScript(req, res, body, type = 'text/javascript; charset=utf-8') {
  res.writeHead(200, { 'Content-Type':type, 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff' });
  res.end(req.method === 'HEAD' ? undefined : body);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (await handleAuthRequest(req, res, url)) return;
  if (await handleClassRequest(req, res, url)) return;
  if (url.pathname === '/api/status' && req.method === 'GET') {
    if (provider === 'ollama') {
      try {
        const statusRes = await fetch(`${ollamaUrl}/api/tags`, { signal:AbortSignal.timeout(2_500) });
        const statusData = await statusRes.json().catch(() => ({}));
        const installed = (statusData.models || []).some(m => m.name === ollamaModel || m.name === `${ollamaModel}:latest`);
        return json(res, 200, { provider, available:true, model:ollamaModel, modelInstalled:installed });
      } catch {
        return json(res, 200, { provider, available:false, model:ollamaModel, modelInstalled:false });
      }
    }
    if (provider === 'gemini') return json(res, 200, { provider, available:Boolean(geminiApiKey), model:geminiModel, backups:geminiModels.slice(1), resting:geminiModels.filter(model => (geminiRestingUntil.get(model)?.until || 0) > Date.now()), modelInstalled:Boolean(geminiApiKey) });
    return json(res, 200, { provider, available:Boolean(openAIApiKey), model:openAIModel, modelInstalled:Boolean(openAIApiKey) });
  }
  if (url.pathname === '/api/ai/tutor' || url.pathname === '/api/ai/generate') return handleAiRequest(req, res, url.pathname);

  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error:'Method not allowed.' });
  if (url.pathname === '/content/curriculum.js') return sendScript(req, res, `window.STUDYLY_CURRICULUM=${JSON.stringify(curriculumData)};\n`);
  if (url.pathname === '/content/skills.js') return sendScript(req, res, await buildSkillsScript());
  if (contentScripts[url.pathname]) {
    try { return sendScript(req, res, await readFile(path.join(root, contentScripts[url.pathname])), url.pathname.endsWith('.css') ? 'text/css; charset=utf-8' : undefined); }
    catch {
      res.writeHead(500, { 'Content-Type':'text/plain; charset=utf-8' });
      return res.end('Could not load Studyly content.');
    }
  }
  if (url.pathname !== '/' && url.pathname !== '/saved_resource.html') {
    res.writeHead(404, { 'Content-Type':'text/plain; charset=utf-8' });
    return res.end('Not found');
  }
  try {
    const html = await readFile(path.join(root, 'saved_resource.html'));
    res.writeHead(200, { 'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : html);
  } catch {
    res.writeHead(500, { 'Content-Type':'text/plain; charset=utf-8' });
    res.end('Could not load Studyly.');
  }
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') console.error(`Port ${port} is already in use. Stop the other Studyly terminal with Ctrl+C, or set PORT to another port in .env.`);
  else console.error('Studyly could not start:', error.message);
  process.exitCode = 1;
});
server.listen(port, host, () => console.log(`Studyly running at http://${host}:${port}`));
