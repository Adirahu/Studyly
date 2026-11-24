# Studyly online skills courses

Each course is one JSON file in this folder, named after its `id` (for example `web.json`). `index.json` lists the course ids in the order they appear on the Online skills page. The server combines them each time the page loads, so a saved edit shows up after refreshing the page. If a course file is missing or has a JSON error, the server logs it and uses that course's older version from `content/skills.js` instead.

Learner progress is stored by course `id` and chapter number, so keep ids stable and add new chapters at the end of a course rather than reordering existing ones.

## Who the courses are for

Nigerian secondary-school learners (JSS1–SS3), complete beginners, many studying on a phone with limited data. Write in clear, friendly British English (as used in Nigerian schools). Use Nigerian examples where natural: naira prices, school clubs, local businesses (provision shop, tailor, POS agent), cities like Lagos, Abuja, Kano, Enugu, Ibadan, Port Harcourt.

## Rules for content

- **Original writing only.** Never copy or closely paraphrase text from Sololearn, W3Schools, MDN, freeCodeCamp, Google, Canva or any other site. You may follow a common topic order (for example HTML → CSS → JavaScript) and link to those sites in `resources`.
- **Accurate and current.** Code must run as written. Facts, keyboard shortcuts and tool names must be correct. No made-up statistics.
- **Safe.** No real personal data in examples. Remind learners under 18 to involve a parent or guardian for anything involving money, accounts or meeting people. Never encourage hacking, plagiarism or cheating.
- **Plain text inside strings**, except section `body`, which supports simple Markdown: paragraphs separated by a blank line (`\n\n`), `**bold**`, `-` bullet lists, `1.` numbered steps and `` `inline code` ``. No headings inside `body` (use a new section instead), no tables, no LaTeX.
- Quiz options are shuffled when shown, so never use "all of the above" or "none of the above", and do not refer to options by letter.

## Course file shape

```json
{
  "id": "web",
  "title": "HTML: build your first web pages",
  "icon": "🌐",
  "area": "Web development",
  "level": "Beginner",
  "duration": "About 4 hours",
  "summary": "One or two sentences shown on the course card.",
  "outcomes": ["By the end you can …", "…", "…"],
  "tools": "What the learner needs, including free phone options.",
  "resources": [
    { "title": "Sololearn — Introduction to HTML", "url": "https://www.sololearn.com/…", "note": "Why it is useful" }
  ],
  "chapters": [
    {
      "title": "Chapter title",
      "goal": "What the learner will be able to do after this chapter.",
      "sections": [
        {
          "heading": "Section heading",
          "body": "Two to four short paragraphs or a list (Markdown as above).",
          "code": { "lang": "html", "source": "<h1>Hello, Lagos!</h1>", "runnable": true }
        }
      ],
      "points": ["Key point to remember", "…", "…"],
      "mistakes": ["A common mistake — and how to avoid it", "…"],
      "task": "A practical activity the learner does now (2–4 sentences).",
      "quiz": [
        { "q": "Question?", "opts": ["Correct answer", "Wrong", "Wrong", "Wrong"], "a": 0, "why": "Why the answer is correct." }
      ]
    }
  ],
  "project": {
    "title": "Final project title",
    "brief": "What to build or produce, and for whom.",
    "steps": ["Step 1", "Step 2", "Step 3"],
    "checklist": ["Quality check 1", "Quality check 2", "Quality check 3"]
  }
}
```

### Field notes

- `area` must be one of: Web development, Coding, Design, Data, Communication, Media, Technology, Productivity, Business.
- `sections`: 2–5 per chapter. Aim for 300–550 words of `body` text per chapter in total.
- `code` is optional. `lang` is one of `html`, `css`, `javascript`, `python`, `text`, `formula`.
  - `"runnable": true` adds a **Try it yourself** button that opens a live editor. Only `html` code can be runnable; for CSS or JavaScript examples, write a small complete HTML snippet with a `<style>` or `<script>` block so it runs.
  - Python and formula examples can add `"output"` with exactly what the code prints or the formula returns.
- `points`: 3–5. `mistakes`: 2–4. `quiz`: 4–5 questions with exactly four distinct options and `a` as the 0-based index of the correct option. Learners need two-thirds correct to pass.
- `project` is shown at the end of the course.

Check a file with the validator before saving it as final.
