# Studyly

Studyly is a class-aware learning prototype for Nigerian secondary students and teachers. It serves `saved_resource.html` and provides the AI tutor through a local Node.js server. Learning content lives in the `content` folder:

- `content/curriculum.json`: classes JSS1–SS3, subjects and topics. The server and the website both read it, so restart the server after editing it.
- `content/skills/`: online skills courses, one JSON file per course, listed in order in `index.json`. `content/skills.js` holds older versions, used only if a course file is missing or broken.
- `content/flashcards.js`: built-in flashcard decks.

The look is set by `app/theme.css`: a dark theme with a rose-gold accent and the Syne (headings) and DM Sans (body) fonts from Google Fonts. Dark is the default; the sun/moon button in the top bar switches to the original light design, and each browser remembers the choice. Without internet the fonts fall back to the system fonts.

Larger features have their own scripts in the `app` folder: `app/landing.js` (the landing page), `app/classes.js` (classes and assignments), `app/cbt.js` (CBT and mock papers), `app/report.js` (weekly parent report) and `app/playground.js` (the Try it yourself code editor).

## Run on Windows

1. Install Node.js 20 or newer.
2. Open this folder in VS Code or File Explorer.
3. Double-click `Start Studyly.cmd`. It starts the server from this folder and opens the site in your browser. Keep the server window open while using Studyly.
4. If you use the VS Code terminal instead, run `npm.cmd start` in this folder and open `http://127.0.0.1:3000`.

After changing `server.mjs`, `.env` or anything in `content`, stop the server (Ctrl+C in its window) and start it again.

Do not open `saved_resource.html` directly with a `file://` address. Login, signup, saved progress, the AI tutor and the content files need the server. If opened directly, the local HTML page shows an **Open Studyly** link to the server page.

## Landing page

Visitors who are not logged in see a landing page first. It explains what Studyly offers, has a sample CBT question and a small live code editor to try, and answers common questions. **Create your account**, **Log in** and **Create a teacher account** open the existing forms (the address changes to `#signup` or `#login`, so the browser's Back button and the **Back to home** link return to the landing page). Logged-in learners go straight to their dashboard, and signing out returns to the landing page. A link to `/#login` opens the log-in form directly.

The page is `app/landing.js`. Its figures (6 classes, 33 subjects, 1,163 topics, 14 skills courses) and feature descriptions match the app today, so update them there if the curriculum or courses change. It follows the same dark/light setting as the rest of Studyly.

## Student and teacher accounts

Students and teachers choose their role when signing up and when logging in. Students choose their class; teachers choose the class they teach. Teacher accounts open a teacher-focused workspace with lesson design, teaching-strategy coaching, difficult-topic guides, trusted references, exam revision schedules, and exam-question drafts with answer keys or marking guidance. Teacher navigation hides student practice, flashcards and progress areas. AI-generated plans, coaching, guides, and question sets require the tutor service to be configured; practical lesson, guide, coaching, and question templates remain available if it cannot be reached. Reference links and the curriculum-based revision schedule work without an AI key.

Accounts can be created with a name, email, class, and a password of at least 8 characters, then used from the same Studyly server. Passwords are stored as salted scrypt hashes. Accounts, sessions, and progress are managed by the Node server; progress (including flashcards, AI-made practice questions and skills courses) is stored in the ignored `data/users.json` file, and the login cookie is HTTP-only. Creating an account does not require the AI tutor key.

This is a local prototype account system. Sessions last up to seven days and survive server restarts. Email verification and password reset are not configured. Before hosting Studyly for real students, use HTTPS and move accounts to a managed database and authentication service with recovery and backup support. Do not expose a local development server directly to the public internet.

## AI tutor

The server binds to this computer only. The tutor sends class, subject, topic, and the recent conversation to Google Gemini (or to OpenAI or a local Ollama model, set by `AI_PROVIDER` in `.env`). Do not include names, passwords, or other private information in questions.

The tutor explains topics, solves problems step by step, quizzes learners one question at a time, writes original BECE/WAEC/NECO/JAMB-style practice questions, checks answers, and makes revision summaries. Answers show formatting (bold, lists, tables) and maths as readable symbols such as x² and √. Any tutor answer can be saved as flashcards. The tutor also covers the online skills courses (choose **Online skills courses** as the subject).

**Gemini free-tier limits.** On the free tier, `gemini-3.6-flash` allows only **20 requests per day** per Google Cloud project, plus a few requests per minute. Daily limits reset at midnight Pacific time (about 8–9 am in Nigeria). When a model reaches its limit or is busy, Studyly automatically switches to the backup models in `GEMINI_FALLBACK_MODELS` (by default `gemini-3.1-flash-lite`, `gemini-3.5-flash-lite` and `gemini-flash-latest`), each with its own free allowance. Students do not see which model answered; the Studyly window logs a line whenever it switches to a backup model. For a whole class or school, enable billing in Google AI Studio; check current limits at https://aistudio.google.com/rate-limit. Studyly also limits each account to 30 AI requests a minute.

## Curriculum

The curriculum covers JSS1–JSS3 (20 subjects each) and SS1–SS3 (25 subjects each): 1,163 topics in total. It includes the core subjects, the sciences, technology, arts and humanities, commercial subjects, French, Yoruba, Igbo and Hausa, and creative and vocational subjects. The Subjects page can filter by group. Topic order varies by school; confirm against the school's scheme of work and the current NERDC curriculum.

## Practice, revision and flashcards

- **Practice:** a small built-in multiple-choice bank, plus **Create AI questions**, which writes five new class-level questions for the chosen subject or topic. AI-made questions are labelled, saved to the account and reused in practice and timed mocks.
- **Exam Prep:** study plans, timed mocks (the AI tutor can write a 10-question mock when the saved bank is small) and an AI exam coach.
- **Revise & flashcards:** a daily revision panel (cards due, missed questions, weak topics), 28 built-in decks across JSS1–SS3, AI-made decks for any topic, your own cards, and one-page revision summaries. Cards use spaced repetition: Again (10 minutes), Hard, Good and Easy schedule the next review further away each time you remember a card. Keyboard: Space shows the answer; 1–4 rate it.

Use Profile → Download backup or Restore backup to keep an extra copy of progress.

## Classes and assignments

- **Teachers** open **My classes**, create a class (name, level and optional subject) and share its 6-character join code, for example by WhatsApp. In a class they can:
  - set a **quiz**: the AI tutor writes the questions, and the teacher checks and removes any before publishing. The server marks it automatically.
  - set a **topic task**: students study the lesson note, practise and use flashcards, then mark it done.
  - see each student's last activity, practice this week, accuracy and weak topics, the results for every assignment (including the hardest quiz questions), and class insights such as the topics most students find hard.
  - schedule a **live lesson** (title, call link, date, start time and length). Studyly does not host video: the teacher creates the call in Google Meet, Zoom, Microsoft Teams or WhatsApp and pastes its `https://` link. Each lesson can be copied or shared on WhatsApp. Lessons that ended more than 30 days ago are removed.
  - post **announcements** (up to 1,000 characters) that every student in the class sees. The 100 newest are kept.
- **Students** enter the code under **My classes** to join. The page shows upcoming live lessons (with which app the link opens) and the class announcements, then their to-do list with due and overdue work. The home page shows the next live lesson in the coming 24 hours with a **Join live lesson** button (marked "Live now" from 10 minutes before the start), new announcements from the last 3 days, and work to do. Quiz answers are only sent to the student's browser after they submit, and each quiz can be submitted once.
- Classes are stored with the accounts in `data/users.json`.

## CBT and mock papers

**CBT & mock papers** offers three kinds of paper:

- **JAMB UTME practice:** Use of English plus 3 subjects. Quick (40 questions, 27 minutes), Half (90 questions, 60 minutes) or Full (180 questions, 2 hours), scored out of 400.
- **WAEC / NECO objective paper:** one SS subject.
- **BECE objective paper:** one JSS subject.

The exam screen has subject tabs, a countdown timer, a question map, flags, an on-screen calculator and the keyboard keys A–D, N, P, F and S. An unfinished paper survives a page reload. Results show scores by subject, the topics to revise, and every answer with explanations. Questions come from the saved bank first; the AI tutor writes any missing ones and saves them, so later papers start instantly. They are original practice questions in each exam's style, not real past questions. A full paper needs up to about 18 AI requests the first time.

## Photo homework help

In the AI Tutor, the 📷 button attaches a photo of a question from a textbook, the board or a worksheet. The photo is resized in the browser before sending. The tutor says what it can read, then explains the solution step by step. Photos are not stored in the chat history.

## Weekly report for parents

On the **Progress** page, **Create this week's report** summarises the last 7 days: days studied, practice questions and accuracy, flashcards, tutor questions, mock papers, class assignments, strong and weak topics, and next steps. It can be shared on WhatsApp, copied or printed / saved as a PDF. The figures come from daily activity counters that start once this version is in use.

## Student online skills

Student accounts have fourteen beginner courses. The web development track has three courses in a row: HTML, CSS and JavaScript. The others are Python, spreadsheets and data, graphic design, UI/UX design, video editing, digital marketing, entrepreneurship and freelancing, presentation and public speaking, using AI tools to learn, typing and word processing, and cybersecurity.

Courses have six to eight chapters. A chapter is a set of short numbered lessons with worked examples, then key points, common mistakes, a practical task and a five-question chapter exam with explanations. Learners need two-thirds of the answers right to pass a chapter and unlock the next one. Each course also lists what learners will be able to do, the tools they need (including free phone options), a final project with steps and a checklist, and links to free courses for further study.

Web, CSS and JavaScript examples have a **Try it yourself** button that opens a live code editor; the result updates as the learner types and runs in a sandbox with no access to Studyly. All lesson text is original Studyly writing for Nigerian learners; the web track follows a bite-sized, Sololearn-style order and links to Sololearn and other free courses.

Course progress syncs with the account, and the courses do not require an AI key. Each course is a JSON file in `content/skills/` (the format is in `content/skills/README.md`); saved edits show after refreshing the page.
