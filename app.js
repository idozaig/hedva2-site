// חדו״א 2 — לוגיקת האתר: לשוניות, חיפוש, הורדות.
(() => {
  const $ = (s) => document.querySelector(s);
  const data = window.HUB_DATA || { lessons: [], extras: [] };
  const state = { tab: "lectures", q: "" };
  const TABS = ["lectures", "tutorials", "extras", "homework"];
    const fmtDate = (d) => d.getDate() + "." + (d.getMonth() + 1);
  const pad = (n) => String(n).padStart(2, "0");
  const word = (k) => (k === "lecture" ? "הרצאה" : "תרגול");
  const safeUrl = (u) => (typeof u === "string" && /^https:\/\//.test(u)) ? u : null;
  const localPage = (l) => (typeof l.page === "string" && /^lessons\/[\w-]+\.html$/.test(l.page)) ? l.page : null;
  const pageHref = (l) => localPage(l) || safeUrl(l.pageUrl);
  const driveDl = (id) => id ? "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(id) : null;

  // Nights (the date shown is the evening before midnight). Catch-up: lec 2-4 + tut 2, then weekly:
  // Sat night = odd lecture, Sun night = tutorial, Mon night = even lecture.
  const CATCHUP = { "lecture-2": [2026, 10, 2], "lecture-3": [2026, 10, 3], "lecture-4": [2026, 10, 4], "tutorial-2": [2026, 10, 5] };
  function scheduledDate(kind, num) {
    const c = CATCHUP[kind + "-" + num]; if (c) return new Date(c[0], c[1], c[2]);
    let d;
    if (kind === "lecture") { if (num < 7) return null; const w = Math.floor((num - 7) / 2); d = new Date(2026, 10, num % 2 ? 7 : 9); d.setDate(d.getDate() + 7 * w); }
    else { if (num < 4) return null; d = new Date(2026, 10, 8); d.setDate(d.getDate() + 7 * (num - 4)); }
    return d;
  }
  const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const nightLabel = (d) => "ליל " + DAYS[d.getDay()] + " " + fmtDate(d);
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") n.className = v; else if (k.startsWith("on")) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c)));
    return n;
  }
  const open = (href, text, cls) => el("a", { href, class: "btn " + (cls || ""), target: "_blank", rel: "noopener" }, text);
  const dl = (href, text, name) => el("a", { href, class: "btn dl", download: name || "" }, text);

  // ---------- search ----------
  const FINALS = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
  const norm = (s) => String(s || "").toLowerCase().replace(/[֑-ׇ]/g, "").replace(/[״׳"'`’]/g, "")
    .replace(/[ךםןףץ]/g, (c) => FINALS[c]).replace(/[−–—-]/g, " ").replace(/\s+/g, " ").trim();
  const tokens = (q) => norm(q).split(" ").filter(Boolean);
  function highlight(text, toks) {
    const frag = document.createDocumentFragment();
    const src = String(text || "").replace(/\s+/g, " ").trim();
    const n = norm(src);
    if (!toks || !toks.length || n.length !== src.length) { frag.append(src); return frag; }
    const ranges = [];
    for (const t of toks) { let i = n.indexOf(t); while (i >= 0) { ranges.push([i, i + t.length]); i = n.indexOf(t, i + 1); } }
    ranges.sort((a, b) => a[0] - b[0]);
    let pos = 0;
    for (const [a, b] of ranges) { if (a < pos) continue; frag.append(src.slice(pos, a), el("mark", {}, src.slice(a, b))); pos = b; }
    frag.append(src.slice(pos)); return frag;
  }
  function searchAll(q) {
    const toks = tokens(q); if (!toks.length) return [];
    const res = [];
    for (const l of data.lessons) {
      const kws = Array.isArray(l.keywords) ? l.keywords : [];
      const fields = [{ t: norm(word(l.kind) + " " + l.num), w: 3 }, { t: norm(l.topic), w: 4 }, { t: norm(kws.join(" | ")), w: 2 }];
      let score = 0, ok = true;
      for (const tk of toks) {
        let best = 0; for (const f of fields) if (f.t.includes(tk)) best = Math.max(best, f.w);
        if (!best) { ok = false; break; } score += best;
      }
      if (ok) res.push({ type: "lesson", item: l, score: score + (pageHref(l) ? 1 : 0), hits: kws.filter((k) => toks.some((t) => norm(k).includes(t))) });
    }
    for (const x of data.extras) {
      const hay = norm([x.title, x.note, x.section === "homework" ? "עבודה " + x.hw + " עבודות בית " + (x.hwType === "solution" ? "פתרון" : "") : "קבצים נלווים"].join(" "));
      if (toks.every((t) => hay.includes(t))) res.push({ type: "extra", item: x, score: 1 });
    }
    return res.sort((a, b) => b.score - a.score);
  }
  const SUGGEST = ["לופיטל", "שברים חלקיים", "הצבה טריגונומטרית", "arctan", "אינטגרציה בחלקים", "חילוק פולינומים"];
  function renderSearch() {
    const box = $("#p-search"), q = state.q.trim();
    box.hidden = !q;
    for (const t of TABS) $("#p-" + t).hidden = !!q || t !== state.tab;
    if (!q) return;
    const toks = tokens(q), res = searchAll(q);
    box.replaceChildren(el("div", { class: "rhead" }, el("h2", {}, "תוצאות"), el("span", { class: "count" }, res.length ? res.length + " נמצאו" : "")));
    if (!res.length) {
      box.append(el("div", { class: "empty" }, el("strong", {}, "לא מצאתי את \"" + q + "\""),
        "החיפוש עובר על נושאים ומילות מפתח של מה שכבר סוכם. נסה מילה אחרת:"),
        el("div", { class: "chips", style: "justify-content:center;margin-top:10px" }, SUGGEST.map((s) => el("button", { type: "button", onclick: () => setQuery(s) }, s))));
      return;
    }
    box.append(el("ul", { class: "grid" }, res.map((r) => r.type === "lesson" ? lessonCard(r.item, toks, r.hits) : extraCard(r.item, toks))));
  }
  function setQuery(v) { $("#q").value = v; state.q = v; $("#clr").hidden = !v; renderSearch(); }
  $("#q").addEventListener("input", (e) => { state.q = e.target.value; $("#clr").hidden = !state.q; renderSearch(); });
  $("#q").addEventListener("keydown", (e) => { if (e.key === "Escape") setQuery(""); });
  $("#clr").addEventListener("click", () => { setQuery(""); $("#q").focus(); });

  // ---------- tabs ----------
  function showTab(name) {
    if (!TABS.includes(name)) name = "lectures";
    state.tab = name;
    for (const t of TABS) $("#tab-" + t).setAttribute("aria-selected", String(t === name));
    if (state.q) setQuery(""); else renderSearch();
  }
  document.querySelectorAll("nav.tabs button").forEach((b) => b.addEventListener("click", () => {
    showTab(b.dataset.tab); try { history.replaceState(null, "", "#" + b.dataset.tab); } catch (e) {}
  }));
  window.addEventListener("hashchange", () => showTab(location.hash.slice(1)));

  // ---------- cards ----------
  function lessonCard(l, toks, hits) {
    const page = pageHref(l), local = localPage(l), pdf = safeUrl(l.pdfUrl), pdfDl = driveDl(l.driveId);
    const sched = !page ? scheduledDate(l.kind, l.num) : null;
    const name = word(l.kind) + " " + l.num;
    const topicTxt = l.topic || (page ? "דף שיעור" : "הנושא יופיע אחרי הסיכום");
    const kwEl = hits && hits.length ? el("div", { class: "kw" }, hits.slice(0, 6).map((k) => el("span", { class: "hit" }, k))) : null;
    return el("li", { class: "card" + (page ? " done" : "") },
      el("div", { class: "num c" + (l.num % 5), "aria-hidden": "true" }, pad(l.num)),
      el("div", { class: "title" + (l.topic ? "" : " dim") }, el("span", { class: "kind" }, name), highlight(topicTxt, toks)),
      kwEl,
      el("div", { class: "meta" },
        page ? open(page, "דף שיעור", "primary") : null,
        local ? dl(local, "⬇ הורד דף", "חדו״א 2 - " + name + ".html") : null,
        pdf ? open(pdf, "PDF") : null,
        pdfDl ? el("a", { href: pdfDl, class: "btn dl", target: "_blank", rel: "noopener" }, "⬇ הורד PDF") : null,
        el("button", { class: "btn ghost", type: "button", onclick: () => openAsk(name) }, "🙋 שאלה / טעות"),
        page ? el("span", { class: "pill ok" }, "סוכם") :
          sched ? el("span", { class: "pill wait" }, "יוכן ב" + nightLabel(sched)) : el("span", { class: "pill plain" }, "PDF בלבד")));
  }
  function extraLinks(x) {
    const href = safeUrl(x.link) || (typeof x.file === "string" && /^files\//.test(x.file) ? x.file : null);
    const down = x.driveId ? driveDl(x.driveId) : (href && !/^https?:/.test(href) ? href : null);
    return [href ? open(href, "פתח", "primary") : el("span", { class: "pill plain" }, "חסר קובץ"),
      down ? el("a", { href: down, class: "btn dl", download: "", target: "_blank", rel: "noopener" }, "⬇ הורדה") : null];
  }
  function extraCard(x, toks) {
    const label = x.section === "homework" ? "עבודה " + x.hw + " · " + (x.hwType === "solution" ? "פתרון" : "דף העבודה") : "קובץ נלווה";
    return el("li", { class: "card" }, el("div", { class: "num c" + (x.section === "homework" ? 2 : 1), "aria-hidden": "true" }, x.section === "homework" ? pad(x.hw || 0) : "📎"),
      el("div", { class: "title" }, el("span", { class: "kind" }, label), highlight(x.title || "ללא שם", toks)),
      el("div", { class: "meta" }, extraLinks(x)));
  }
  const itemRow = (x, label) => el("li", {}, el("div", { class: "t" }, x.title || label || "ללא שם", x.note ? el("small", {}, x.note) : null), extraLinks(x));

  // ---------- render ----------
  function renderLessons(kind) {
    $(kind === "lecture" ? "#list-lectures" : "#list-tutorials").replaceChildren(
      ...data.lessons.filter((l) => l.kind === kind).sort((a, b) => a.num - b.num).map((l) => lessonCard(l)));
  }
  function renderNext() {
    const t = $("#nextText");
    const pending = data.lessons.filter((l) => !pageHref(l) && scheduledDate(l.kind, l.num));
    if (!pending.length) { t.textContent = "כל הדפים המתוכננים מוכנים."; return; }
    const first = pending.map((l) => scheduledDate(l.kind, l.num)).sort((a, b) => a - b)[0];
    const l = pending.find((x) => +scheduledDate(x.kind, x.num) === +first);
    t.replaceChildren(el("b", {}, word(l.kind) + " " + l.num), " · " + nightLabel(first) + " בחצות");
  }
  function renderExtras() {
    const rows = data.extras.filter((x) => x.section === "files");
    $("#c-extras").textContent = rows.length || "";
    $("#list-extras").replaceChildren(rows.length ? el("ul", { class: "items" }, rows.map((x) => itemRow(x))) :
      el("div", { class: "empty" }, el("strong", {}, "עוד אין קבצים נלווים"), "קבצים יופיעו כאן כשיתווספו."));
  }
  function renderHomework() {
    const box = $("#list-homework"), rows = data.extras.filter((x) => x.section === "homework");
    const nums = [...new Set(rows.map((x) => x.hw))].filter(Number.isFinite).sort((a, b) => a - b);
    $("#c-homework").textContent = nums.length || "";
    box.replaceChildren();
    if (!nums.length) { box.append(el("div", { class: "empty" }, el("strong", {}, "עוד אין עבודות בית"), "עבודות ופתרונות יופיעו כאן כשיעלו.")); return; }
    for (const n of nums) {
      const items = rows.filter((x) => x.hw === n).sort((a, b) => (a.hwType === b.hwType ? 0 : a.hwType === "assignment" ? -1 : 1));
      const hasSol = items.some((x) => x.hwType === "solution");
      box.append(el("div", { class: "hwgroup" },
        el("h3", {}, "עבודה " + n, el("span", { class: "pill " + (hasSol ? "ok" : "wait") }, hasSol ? "יש פתרון" : "בלי פתרון עדיין")),
        el("ul", { class: "items" }, items.map((x) => itemRow(x, x.hwType === "solution" ? "פתרון" : "דף העבודה")))));
    }
  }

  // ---------- download all lesson pages as one ZIP ----------
  $("#zipAll").addEventListener("click", async () => {
    const st = $("#zipStatus"), btn = $("#zipAll");
    const pages = data.lessons.filter(localPage);
    if (!window.JSZip) { st.textContent = "ההורדה צריכה חיבור לאינטרנט. נסה שוב."; return; }
    if (location.protocol === "file:") { st.textContent = "הורדת ZIP עובדת רק באתר עצמו (אחרי העלאה ל-Netlify)."; return; }
    btn.disabled = true; st.textContent = "מכין קובץ…";
    try {
      const zip = new JSZip();
      for (const l of pages) {
        const r = await fetch(localPage(l)); if (!r.ok) continue;
        zip.file("חדו״א 2 - " + word(l.kind) + " " + pad(l.num) + ".html", await r.text());
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = el("a", { href: URL.createObjectURL(blob), download: "חדו״א 2 - דפי שיעור.zip" });
      document.body.append(a); a.click(); a.remove();
      st.textContent = "ההורדה התחילה (" + pages.length + " דפים).";
    } catch (e) { st.textContent = "ההורדה נכשלה. נסה שוב."; }
    finally { btn.disabled = false; }
  });


  // ---------- feedback (Netlify Forms) ----------
  const dlg = $("#askDlg"), form = $("#askForm"), sel = $("#askLesson"), st = $("#askStatus");
  const lessonNames = data.lessons.slice().sort((a, b) => (a.kind === b.kind ? a.num - b.num : a.kind === "lecture" ? -1 : 1)).map((l) => word(l.kind) + " " + l.num);
  sel.replaceChildren(el("option", { value: "כללי" }, "כללי / האתר"), ...lessonNames.map((n) => el("option", { value: n }, n)));
  function openAsk(lesson) {
    form.hidden = false; st.textContent = ""; st.className = "status";
    form.querySelectorAll(".ok").forEach((n) => n.remove());
    sel.value = lesson && lessonNames.includes(lesson) ? lesson : "כללי";
    try { dlg.showModal(); } catch (e) { dlg.setAttribute("open", ""); }
    setTimeout(() => $("#askMsg").focus(), 50);
  }
  $("#askFab").addEventListener("click", () => openAsk(""));
  $("#askClose").addEventListener("click", () => dlg.close());
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!$("#askMsg").value.trim()) { st.textContent = "צריך לכתוב מה לא ברור או מה הטעות."; st.className = "status err"; return; }
    if (location.protocol === "file:") { st.textContent = "שליחה עובדת רק באתר עצמו, אחרי ההעלאה ל-Netlify."; st.className = "status err"; return; }
    const btn = $("#askSend"); btn.disabled = true; st.textContent = "שולח…"; st.className = "status";
    try {
      const body = new URLSearchParams(new FormData(form)).toString();
      const r = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      if (!r.ok) throw new Error(r.status);
      const lesson = sel.value;
      form.reset(); sel.value = lesson; st.textContent = "";
      form.querySelector(".actions").before(el("div", { class: "ok" }, "תודה! הפנייה נשלחה ✓ נעבור עליה ונעדכן את הדף."));
    } catch (err) { st.textContent = "השליחה נכשלה. בדוק את החיבור לאינטרנט ונסה שוב."; st.className = "status err"; }
    finally { btn.disabled = false; }
  });


  // ---------- night mode ----------
  const themeBtn = $("#themeBtn"), root = document.documentElement;
  const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  const isDark = () => root.getAttribute("data-theme") ? root.getAttribute("data-theme") === "dark" : !!(mq && mq.matches);
  function paintTheme() {
    const d = isDark();
    themeBtn.querySelector(".ico").textContent = d ? "☀️" : "🌙";
    themeBtn.querySelector(".lbl").textContent = d ? "מצב יום" : "מצב לילה";
    themeBtn.setAttribute("aria-pressed", String(d));
  }
  themeBtn.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("hedva2-theme", next); } catch (e) {}
    paintTheme();
  });
  if (mq && mq.addEventListener) mq.addEventListener("change", paintTheme);
  paintTheme();

  showTab(location.hash.slice(1));
  renderLessons("lecture"); renderLessons("tutorial"); renderNext(); renderExtras(); renderHomework();
  const c = (k) => data.lessons.filter((l) => l.kind === k);
  $("#c-lectures").textContent = c("lecture").filter(pageHref).length + "/" + c("lecture").length;
  $("#c-tutorials").textContent = c("tutorial").filter(pageHref).length + "/" + c("tutorial").length;
})();
