# hedva2-site — brief for Claude Code

This file is public once the site is deployed. Never put passwords, tokens or private details in it.

## Who you are working with
- The owner is a BGU student. Write to him in **simple Hebrew** and call him **"ביג בוס"**. He is not a native English speaker.
- He watches his usage closely. Work lean: no long explorations, no rewriting files that work, short answers.
- Ask before anything that leaves this folder: creating a GitHub repo, pushing, changing Netlify settings, deleting files.

## What this folder is
A static website (no build step) for the course **חדו״א 2** (Calculus 2), shared with classmates. It is hosted on **Netlify**. Today he updates it by dragging this folder to Netlify → Deploys.

```
index.html      page shell + all CSS (tabs, search box, feedback dialog, night-mode button)
app.js          all logic: tabs, Hebrew search, lesson cards, ZIP download, feedback form, night mode
data.js         window.HUB_DATA = { lessons: [...], extras: [...] }  ← the only file that changes often
lessons/        one self-contained HTML page per lesson: lec-01.html … , tut-01.html …
files/          extra pages (e.g. polynomial-division.html)
איך להעלות ל-Netlify.txt   his own upload guide
```

### data.js
- `lessons[]`: `{ id: "lec-05" | "tut-03", kind: "lecture" | "tutorial", num, topic, page: "lessons/lec-05.html" or "", pageUrl, pdfUrl, driveId, keywords: [] }`.
  A lesson counts as "done" when `page` is set. There are 26 lectures and 8 tutorials; undone ones show a PDF link only.
- `extras[]`: `{ id, section: "files" | "homework", title, note, link or file, driveId, hw, hwType: "assignment" | "solution" }`.
- Keep it valid: the file must stay `window.HUB_DATA = <JSON>;`.

### Rules that must not break
- Each lesson page has this credit line at the very top, exactly: `קרדיט לסיכומים של עדי מהדרייב 😊 ולעידו דוד צייג!` — only in lesson pages, never on the main site.
- Each lesson page has this snippet right after `<head>` so night mode carries over (localStorage key `hedva2-theme`):
  `<script>(function(){try{var m=localStorage.getItem("hedva2-theme");if(m==="dark"||m==="light")document.documentElement.setAttribute("data-theme",m);}catch(e){}})();</script>`
- Do not edit the math or text inside `lessons/*.html`. Those pages are generated elsewhere (see below).
- Must work on phone and desktop, right-to-left Hebrew, light and dark.
- The feedback form uses Netlify Forms (`name="feedback"`, honeypot `bot-field`). It only works on the deployed site, not from `file://`.

## Where new lessons come from
A separate Claude session (in the cloud) builds a new lesson page a few nights a week and publishes it in his Claude account. That session then copies new pages into `lessons/` here and updates `data.js` when he asks ("תעדכן את התיקייה"). So expect `data.js` and `lessons/` to change from outside. Always pull / re-read before editing them.

## Your first job: GitHub + automatic Netlify deploys
Goal: he stops dragging the folder. Every change pushed to GitHub goes live by itself.

1. Check what exists: `git status`, `gh auth status`. If git or `gh` is missing or he is not logged in, explain the one step he must do himself (login happens in his browser; never ask for his password or a token in chat).
2. `git init` here if needed. Add a `.gitignore` with `.DS_Store`. First commit of the site as it is.
3. Ask him: repo name (suggest `hedva2-site`) and **public or private** (Netlify works with both). Then create it and push — only after he says yes.
4. Connect Netlify to the repo. **Link the existing Netlify site** (so the address his friends already have stays the same), do not create a second site. This is done in the Netlify website: Site configuration → Build & deploy → Link repository. Build command: empty. Publish directory: `/` (the repo root). Walk him through it one click at a time.
5. Verify: make a tiny harmless change, push, confirm the live site updates. Then tell him the new routine in two lines.
6. Update `איך להעלות ל-Netlify.txt` with the new routine (short, Hebrew).

## How to test
`python3 -m http.server 8766` in this folder, open `http://localhost:8766/`. Check: lecture and tutorial lists render, the search finds a topic, night button toggles, one lesson page opens, no console errors.

## Later, only if he asks
- **Feedback system, cheap version** (already agreed with him): the form also saves each request to a Google Sheet in his Drive named "חדו״א 2 — פניות מהאתר"; the site shows "אולי זה עונה לך?" from already-answered questions with no AI call; Claude reviews at most 3 requests once a week; mistake fixes go live only after he approves.
- Homework sheets + solutions in the "עבודות בית ופתרונות" tab (he sends Drive links).
- Ideas on his board: exam-practice quiz page, one formulas page, "add to home screen", WhatsApp share button.
