/* ============================================================================
   MEDIMIND — front-end only demo. No backend, no real AI/API calls.
   All "AI" logic below is rule-based and runs locally; all data lives in
   this browser's localStorage. Nothing here is real medical advice.
   ============================================================================ */
(function () {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const daysAgoISO = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
  const daysFromNowISO = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const prettyDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
  const escapeHtml = (s) => { const d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function toast(msg, type) {
    const box = $("#toast-container"); if (!box) return;
    const el = document.createElement("div");
    el.className = "toast" + (type ? " " + type : "");
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  /* ==========================================================================
     DATABASE  (localStorage)
     ========================================================================== */
  const DB_KEY = "medimind.db.v1";
  const DOCTOR_COLORS = ["#22d3ee,#3b82f6", "#8b5cf6,#f472b6", "#f472b6,#fb7185", "#34d399,#22d3ee", "#fbbf24,#fb923c", "#8b5cf6,#22d3ee"];
  const TIMES = ["09:00 AM", "10:30 AM", "12:00 PM", "02:00 PM", "03:30 PM", "05:00 PM"];

  function seedDoctors() {
    return [
      { id: "d1", name: "Dr. Meera Nair", specialty: "General Physician", exp: 12, rating: 4.8, bio: "Primary care, routine checkups and everyday illnesses.", color: DOCTOR_COLORS[0] },
      { id: "d2", name: "Dr. Arjun Kapoor", specialty: "Orthopedic", exp: 9, rating: 4.7, bio: "Joints, bones, sports injuries and post-injury recovery.", color: DOCTOR_COLORS[1] },
      { id: "d3", name: "Dr. Fatima Sheikh", specialty: "Neurologist", exp: 14, rating: 4.9, bio: "Headaches, migraines and nervous system concerns.", color: DOCTOR_COLORS[2] },
      { id: "d4", name: "Dr. Rohan Desai", specialty: "Dermatologist", exp: 7, rating: 4.6, bio: "Skin, hair and allergic reactions.", color: DOCTOR_COLORS[3] },
      { id: "d5", name: "Dr. Priya Iyer", specialty: "Cardiologist", exp: 16, rating: 4.9, bio: "Heart health, blood pressure and chest concerns.", color: DOCTOR_COLORS[4] },
      { id: "d6", name: "Dr. Kabir Singh", specialty: "Psychiatrist", exp: 10, rating: 4.7, bio: "Stress, anxiety, sleep and mood support.", color: DOCTOR_COLORS[5] }
    ];
  }

  function seedDB() {
    const demoEmail = "demo@patient.com";
    const db = {
      users: {
        [demoEmail]: {
          name: "Aarav Mehta", email: demoEmail, password: "demo123",
          dob: "1996-04-12", gender: "Male", blood: "O+",
          allergies: ["Penicillin", "Peanuts"],
          conditions: [{ id: uid(), name: "Mild Asthma", date: daysAgoISO(730) }],
          injuries: [{ id: uid(), name: "Neck strain", date: daysAgoISO(18), notes: "From a gym session — avoid heavy neck-loading exercises." }],
          reports: [
            { id: uid(), date: daysAgoISO(32), source: "Annual checkup.pdf", vitals: { hr: 82, sugar: 150, sys: 128, dia: 84, chol: 210 }, summary: "Heart rate slightly elevated. Blood sugar and cholesterol borderline-high. Blood pressure mildly elevated — worth monitoring." },
            { id: uid(), date: daysAgoISO(2), source: "Follow-up labs.pdf", vitals: { hr: 76, sugar: 138, sys: 122, dia: 80, chol: 198 }, summary: "Heart rate within normal range. Blood sugar improved and now borderline-normal. Blood pressure normal. Cholesterol back under 200." }
          ],
          activity: [
            { text: "Account created", date: daysAgoISO(32) },
            { text: "Uploaded report: Annual checkup.pdf", date: daysAgoISO(32) },
            { text: "Logged injury: Neck strain", date: daysAgoISO(18) },
            { text: "Uploaded report: Follow-up labs.pdf", date: daysAgoISO(2) }
          ],
          createdAt: daysAgoISO(32)
        }
      },
      doctors: seedDoctors(),
      appointments: [
        { id: uid(), patientEmail: demoEmail, doctorId: "d2", date: daysFromNowISO(4), time: "10:30 AM", reason: "Follow-up on neck strain before resuming exercise.", status: "upcoming", createdAt: daysAgoISO(2) }
      ],
      session: null
    };
    return db;
  }

  let DB = loadDB();
  function loadDB() { try { const raw = localStorage.getItem(DB_KEY); return raw ? JSON.parse(raw) : seedDB(); } catch (e) { return seedDB(); } }
  function saveDB() { try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); } catch (e) { toast("Could not save — storage may be full.", "error"); } }
  if (!DB.doctors || !DB.doctors.length) { DB.doctors = seedDoctors(); saveDB(); }

  function currentUser() { return DB.session && DB.session.type === "patient" ? DB.users[DB.session.email] : null; }
  function currentDoctor() { return DB.session && DB.session.type === "doctor" ? DB.doctors.find(d => d.id === DB.session.doctorId) : null; }

  /* ==========================================================================
     THEME
     ========================================================================== */
  function setTheme(t) {
    document.body.setAttribute("data-theme", t);
    $$(".theme-switch").forEach(sw => { sw.setAttribute("data-active", t); $$(".theme-opt", sw).forEach(b => b.classList.toggle("active", b.dataset.themeSet === t)); });
    try { localStorage.setItem("medimind.theme", t); } catch (e) {}
  }
  function toggleTheme() { setTheme(document.body.getAttribute("data-theme") === "dark" ? "light" : "dark"); }
  $$(".theme-switch").forEach(sw => sw.addEventListener("click", (e) => { const b = e.target.closest("[data-theme-set]"); if (b) setTheme(b.dataset.themeSet); }));
  setTheme((function () { try { return localStorage.getItem("medimind.theme") || "dark"; } catch (e) { return "dark"; } })());

  /* ==========================================================================
     PRELOADER
     ========================================================================== */
  const t0 = performance.now();
  document.body.classList.add("loading");
  const plMsgs = ["Booting health engine…", "Warming up the assistant…", "Syncing demo records…", "Almost ready…"];
  let plI = 0;
  const plTimer = setInterval(() => { const m = $("#pl-msg"); if (m) m.textContent = plMsgs[++plI % plMsgs.length]; }, 420);
  function hidePreloader() {
    clearInterval(plTimer);
    const p = $("#preloader"); if (!p) return;
    p.classList.add("done");
    document.body.classList.remove("loading");
    setTimeout(() => p.remove(), 700);
  }
  const finishLoad = () => setTimeout(hidePreloader, Math.max(0, 1500 - (performance.now() - t0)));
  if (document.readyState === "complete") finishLoad(); else window.addEventListener("load", finishLoad);

  /* ==========================================================================
     AMBIENT FX: particles, cursor glow, scroll progress, ripple
     ========================================================================== */
  if (!reduceMotion) {
    const cv = $("#bg-particles"), cx = cv.getContext("2d");
    let W, H, dots = [];
    function sizeParticles() {
      W = cv.width = window.innerWidth; H = cv.height = window.innerHeight;
      dots = Array.from({ length: Math.min(70, Math.floor(W / 20)) }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3 }));
    }
    sizeParticles(); window.addEventListener("resize", sizeParticles);
    (function drawParticles() {
      if (!document.hidden) {
        cx.clearRect(0, 0, W, H);
        dots.forEach((a, i) => {
          a.x = (a.x + a.vx + W) % W; a.y = (a.y + a.vy + H) % H;
          cx.fillStyle = "rgba(34,211,238,.65)"; cx.beginPath(); cx.arc(a.x, a.y, 1.6, 0, 7); cx.fill();
          for (let j = i + 1; j < dots.length; j++) {
            const b = dots[j], d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < 120) { cx.strokeStyle = "rgba(139,92,246," + (0.18 * (1 - d / 120)) + ")"; cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke(); }
          }
        });
      }
      requestAnimationFrame(drawParticles);
    })();

    const glow = $("#cursor-glow");
    document.addEventListener("mousemove", (e) => {
      glow.style.left = e.clientX + "px"; glow.style.top = e.clientY + "px"; glow.classList.add("show");
      const p = e.target.closest && e.target.closest(".panel, .feat-card, .doc-card, .tip-card");
      if (p) { const r = p.getBoundingClientRect(); p.style.setProperty("--mx", (e.clientX - r.left) + "px"); p.style.setProperty("--my", (e.clientY - r.top) + "px"); }
    });
    document.addEventListener("mouseleave", () => glow.classList.remove("show"));
  }

  const scrollBar = $("#scroll-progress");
  function onScroll() {
    const scroller = document.scrollingElement;
    const h = scroller.scrollHeight - window.innerHeight;
    scrollBar.style.width = (h > 0 ? (scroller.scrollTop / h) * 100 : 0) + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  document.addEventListener("click", (e) => {
    const b = e.target.closest(".btn-pill, .btn-ghost, .side-link, .tab, .chip-btn, .icon-btn, .qa-btn, .doc-card, .feat-card, .how-card");
    if (!b || b.disabled) return;
    const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2;
    const s = document.createElement("span");
    s.className = "ripple";
    s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    const prevPos = getComputedStyle(b).position;
    if (prevPos === "static") b.style.position = "relative";
    b.appendChild(s); setTimeout(() => s.remove(), 650);
  });

  /* ==========================================================================
     CONFETTI (small celebratory touch on booking)
     ========================================================================== */
  const cvC = $("#fx-confetti"), cxC = cvC.getContext("2d");
  let confettiParts = [], confettiRaf = 0;
  function confetti() {
    if (reduceMotion) return;
    cvC.width = window.innerWidth; cvC.height = window.innerHeight;
    const cols = ["#22d3ee", "#8b5cf6", "#f472b6", "#34d399", "#fbbf24"];
    for (let i = 0; i < 130; i++) confettiParts.push({ x: cvC.width / 2, y: cvC.height * 0.35, vx: (Math.random() - 0.5) * 16, vy: Math.random() * -13 - 3, s: Math.random() * 6 + 4, c: cols[i % 5], r: Math.random() * 6, l: 80 + Math.random() * 60 });
    if (!confettiRaf) confettiRaf = requestAnimationFrame(confettiLoop);
  }
  function confettiLoop() {
    cxC.clearRect(0, 0, cvC.width, cvC.height);
    confettiParts = confettiParts.filter(p => p.l > 0);
    confettiParts.forEach(p => {
      p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.r += 0.2; p.l--;
      cxC.save(); cxC.translate(p.x, p.y); cxC.rotate(p.r);
      cxC.fillStyle = p.c; cxC.globalAlpha = Math.min(1, p.l / 28);
      cxC.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); cxC.restore();
    });
    if (confettiParts.length) confettiRaf = requestAnimationFrame(confettiLoop); else { cxC.clearRect(0, 0, cvC.width, cvC.height); confettiRaf = 0; }
  }

  /* ==========================================================================
     SCROLL REVEAL (landing)
     ========================================================================== */
  const revealIO = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); revealIO.unobserve(e.target); } }), { threshold: 0.1 });
  function observeReveals(root) { $$(".pp-reveal", root).forEach(el => revealIO.observe(el)); }

  /* ==========================================================================
     LANDING: doctor preview grid + nav
     ========================================================================== */
  function doctorColorStyle(doc) { return `background:linear-gradient(135deg, ${doc.color.split(",")[0]}, ${doc.color.split(",")[1]})`; }
  function initials(name) { return name.replace(/^Dr\.\s*/, "").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(); }

  function renderLandingDoctors() {
    const grid = $("#landing-doctor-grid"); if (!grid) return;
    grid.innerHTML = DB.doctors.slice(0, 6).map(d => `
      <div class="doc-card pp-reveal">
        <span class="doc-ava" style="${doctorColorStyle(d)}">${initials(d.name)}</span>
        <b>${escapeHtml(d.name)}</b>
        <span class="doc-spec">${escapeHtml(d.specialty)}</span>
        <span class="doc-meta">${d.exp} yrs experience · ⭐ ${d.rating}</span>
        <p>${escapeHtml(d.bio)}</p>
      </div>`).join("");
    observeReveals(grid);
  }
  renderLandingDoctors();
  observeReveals(document);

  /* ==========================================================================
     AUTH
     ========================================================================== */
  function openModal(id) { $(id).classList.add("open"); }
  function closeModal(id) { $(id).classList.remove("open"); }
  $$(".modal-overlay").forEach(ov => ov.addEventListener("click", (e) => { if (e.target === ov) ov.classList.remove("open"); }));

  function openAuth(tab) {
    openModal("#auth-modal");
    setAuthTab(tab || "login");
  }
  function setAuthTab(tab) {
    $$(".auth-tab").forEach(t => t.classList.toggle("active", t.dataset.authtab === tab));
    $("#form-login").hidden = tab !== "login";
    $("#form-signup").hidden = tab !== "signup";
    $("#panel-doctor").hidden = tab !== "doctor";
    if (tab === "doctor") renderDoctorLoginList();
  }
  $$(".auth-tab").forEach(t => t.addEventListener("click", () => setAuthTab(t.dataset.authtab)));
  $("#btn-open-login").addEventListener("click", () => openAuth("login"));
  $("#btn-open-signup").addEventListener("click", () => openAuth("signup"));
  $("#btn-hero-start").addEventListener("click", () => openAuth("signup"));
  $("#auth-close").addEventListener("click", () => closeModal("#auth-modal"));

  function renderDoctorLoginList() {
    $("#doctor-login-list").innerHTML = DB.doctors.map(d => `
      <div class="doctor-login-row" data-doctor-login="${d.id}">
        <span class="d-ava" style="${doctorColorStyle(d)}">${initials(d.name)}</span>
        <span><b>${escapeHtml(d.name)}</b><small>${escapeHtml(d.specialty)} · ${d.exp} yrs</small></span>
      </div>`).join("");
  }
  document.addEventListener("click", (e) => {
    const row = e.target.closest("[data-doctor-login]");
    if (!row) return;
    DB.session = { type: "doctor", doctorId: row.dataset.doctorLogin };
    saveDB(); closeModal("#auth-modal"); enterApp();
  });

  $("#form-login").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = $("#login-email").value.trim().toLowerCase();
    const pass = $("#login-password").value;
    const user = DB.users[email];
    if (!user || user.password !== pass) { toast("No account matches that email and password.", "error"); return; }
    DB.session = { type: "patient", email }; saveDB();
    closeModal("#auth-modal"); enterApp();
  });

  $("#btn-demo-login").addEventListener("click", () => {
    DB.session = { type: "patient", email: "demo@patient.com" }; saveDB();
    closeModal("#auth-modal"); enterApp();
  });
  $("#btn-hero-demo").addEventListener("click", () => {
    DB.session = { type: "patient", email: "demo@patient.com" }; saveDB(); enterApp();
  });

  $("#form-signup").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = $("#signup-email").value.trim().toLowerCase();
    if (DB.users[email]) { toast("An account with that email already exists.", "error"); return; }
    DB.users[email] = {
      name: $("#signup-name").value.trim() || "New Patient", email,
      password: $("#signup-password").value || "password",
      dob: $("#signup-dob").value || "", gender: $("#signup-gender").value, blood: $("#signup-blood").value,
      allergies: [], conditions: [], injuries: [], reports: [],
      activity: [{ text: "Account created", date: todayISO() }], createdAt: todayISO()
    };
    DB.session = { type: "patient", email }; saveDB();
    closeModal("#auth-modal"); enterApp(true);
  });

  function logActivity(text) {
    const u = currentUser(); if (!u) return;
    u.activity = u.activity || []; u.activity.unshift({ text, date: todayISO() }); u.activity = u.activity.slice(0, 20);
  }

  /* ==========================================================================
     VIEW SWITCHING: landing <-> patient app <-> doctor app
     ========================================================================== */
  function enterApp(isNewSignup) {
    $("#screen-landing").style.display = "none";
    if (DB.session.type === "doctor") {
      $("#app-doctor").classList.add("active"); $("#app-patient").classList.remove("active");
      renderDoctorApp();
    } else {
      $("#app-patient").classList.add("active"); $("#app-doctor").classList.remove("active");
      switchView("overview");
      renderPatientApp();
      if (isNewSignup || !hasSeenTour()) maybeOfferTour();
    }
    window.scrollTo({ top: 0 });
  }

  function exitApp() {
    DB.session = null; saveDB();
    $("#app-patient").classList.remove("active"); $("#app-doctor").classList.remove("active");
    $("#screen-landing").style.display = "";
    chatState.step = "idle";
    window.scrollTo({ top: 0 });
  }
  $("#btn-logout").addEventListener("click", exitApp);
  $("#btn-doctor-logout").addEventListener("click", exitApp);

  $("#btn-sidebar-toggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));

  function switchView(name) {
    $$(".side-link").forEach(l => l.classList.toggle("active", l.dataset.view === name));
    $$("#app-patient .view").forEach(v => v.classList.remove("active"));
    const v = $("#view-" + name); if (v) v.classList.add("active");
    $("#sidebar").classList.remove("open");
    if (name === "overview") renderOverview();
    if (name === "reports") renderReports();
    if (name === "doctors") { renderDoctors(); renderAppointments(); }
    if (name === "profile") renderProfile();
    if (name === "tips") renderTips();
    document.querySelector(".main-content").scrollTo({ top: 0 });
  }
  $$(".side-link").forEach(l => l.addEventListener("click", () => switchView(l.dataset.view)));
  $$("[data-view-jump]").forEach(b => b.addEventListener("click", () => switchView(b.dataset.viewJump)));

  /* ==========================================================================
     PATIENT APP RENDER
     ========================================================================== */
  function renderPatientApp() {
    const u = currentUser(); if (!u) return;
    $("#user-name").textContent = u.name;
    $("#user-avatar").textContent = u.name.trim().charAt(0).toUpperCase();
    $("#greet-text").textContent = `Welcome back, ${u.name.split(" ")[0]} — here's your health snapshot.`;
    renderOverview(); renderDoctors(); renderAppointments(); renderProfile(); renderTips(); resetChat();
  }

  function renderOverview() {
    const u = currentUser(); if (!u) return;
    $("#ov-allergies").innerHTML = u.allergies.length ? u.allergies.map(a => `<span class="ov-chip allergy">⚠ ${escapeHtml(a)}</span>`).join("") : `<span class="empty-note">None recorded</span>`;
    $("#ov-conditions").innerHTML = u.conditions.length ? u.conditions.map(c => `<span class="ov-chip condition">${escapeHtml(c.name)}</span>`).join("") : `<span class="empty-note">None recorded</span>`;
    $("#ov-injuries").innerHTML = u.injuries.length ? u.injuries.map(i => `<span class="ov-chip injury">${escapeHtml(i.name)} · ${daysBetween(i.date, todayISO())}d ago</span>`).join("") : `<span class="empty-note">None recorded</span>`;

    const upcoming = DB.appointments.filter(a => a.patientEmail === u.email && a.status === "upcoming").sort((a, b) => a.date.localeCompare(b.date))[0];
    if (upcoming) {
      const doc = DB.doctors.find(d => d.id === upcoming.doctorId);
      $("#ov-next-appt").innerHTML = `<b>${prettyDate(upcoming.date)} · ${upcoming.time}</b><br><span style="color:var(--text-dim);font-size:.84rem">${escapeHtml(doc ? doc.name : "Doctor")} — ${escapeHtml(doc ? doc.specialty : "")}</span>`;
    } else {
      $("#ov-next-appt").innerHTML = `No appointments booked yet. <button class="link-btn" data-view-jump="doctors">Book one →</button>`;
      $("#ov-next-appt button").addEventListener("click", () => switchView("doctors"));
    }

    renderVitalsCompare($("#ov-vitals-compare"), u.reports);
    renderActivity(u);
  }

  function renderActivity(u) {
    const list = (u.activity || []).slice(0, 8);
    $("#activity-list").innerHTML = list.length ? list.map(a => `<li><time>${prettyDate(a.date)}</time><span>${escapeHtml(a.text)}</span></li>`).join("") : `<li class="empty-note">No activity yet.</li>`;
  }

  const VITAL_META = {
    hr: { label: "Heart Rate", unit: "bpm", good: v => v >= 60 && v <= 100 },
    sugar: { label: "Blood Sugar", unit: "mg/dL", lowerBetter: true, good: v => v < 140 },
    sys: { label: "Systolic BP", unit: "mmHg", lowerBetter: true, good: v => v < 120 },
    dia: { label: "Diastolic BP", unit: "mmHg", lowerBetter: true, good: v => v < 80 },
    chol: { label: "Cholesterol", unit: "mg/dL", lowerBetter: true, good: v => v < 200 }
  };

  function renderVitalsCompare(container, reports) {
    if (!container) return;
    const sorted = (reports || []).slice().sort((a, b) => b.date.localeCompare(a.date));
    if (sorted.length < 2) {
      container.innerHTML = `<p class="empty-note">Upload or log at least two reports to see a trend comparison.</p>`;
      return;
    }
    const latest = sorted[0].vitals, prev = sorted[1].vitals;
    container.innerHTML = Object.keys(VITAL_META).map(key => {
      const meta = VITAL_META[key], lv = latest[key], pv = prev[key];
      if (lv == null || pv == null) return "";
      const diff = lv - pv;
      const dirClass = diff === 0 ? "flat" : diff > 0 ? "up" : "down";
      let goodness = "good";
      if (diff !== 0) {
        if (meta.lowerBetter) goodness = diff > 0 ? "bad" : "good";
        else goodness = meta.good(lv) ? "good" : "bad";
      }
      const arrow = diff === 0 ? "→" : diff > 0 ? "↑" : "↓";
      return `<div class="vc-card">
        <div class="vc-label">${meta.label}</div>
        <div class="vc-values"><span class="vc-prev">${pv}</span><span class="vc-latest">${lv}</span><span style="font-size:.7rem;color:var(--text-faint)">${meta.unit}</span></div>
        <div class="vc-delta ${dirClass} ${goodness}">${arrow} ${Math.abs(diff)} vs. previous</div>
      </div>`;
    }).join("");
  }

  /* ==========================================================================
     AI HEALTH ASSISTANT  (rule-based, local — not real medical advice)
     ========================================================================== */
  const SPECIALTY_RULES = [
    { keys: ["neck", "shoulder", "back", "spine", "joint", "knee", "muscle", "sprain"], specialty: "Orthopedic" },
    { keys: ["head", "migraine", "dizzy", "dizziness", "numb", "seizure"], specialty: "Neurologist" },
    { keys: ["skin", "rash", "acne", "itch", "itchy", "hives"], specialty: "Dermatologist" },
    { keys: ["chest", "heart", "palpitation", "breath", "bp", "blood pressure"], specialty: "Cardiologist" },
    { keys: ["stress", "anxious", "anxiety", "sleep", "insomnia", "mood", "sad", "panic"], specialty: "Psychiatrist" }
  ];
  const EXERCISE_WORDS = ["yoga", "exercise", "workout", "gym", "training", "run", "lift", "stretch"];

  let chatState = { step: "idle", concern: "" };
  function resetChat() {
    chatState = { step: "idle", concern: "" };
    $("#chat-window").innerHTML = "";
    const u = currentUser();
    botSay(`Hi ${u ? u.name.split(" ")[0] : ""}! I'm the MediMind assistant. I've already loaded your health profile, so I'll keep your allergies and recent history in mind. What's going on today?`);
    renderQuickChips(["I have a headache", "Neck pain after the gym", "Trouble sleeping", "Stomach ache", "Skin rash"]);
  }
  function chatScroll() { const w = $("#chat-window"); w.scrollTop = w.scrollHeight; }
  function botSay(html, cls) {
    const el = document.createElement("div"); el.className = "msg bot" + (cls ? " " + cls : ""); el.innerHTML = html;
    $("#chat-window").appendChild(el); chatScroll();
  }
  function userSay(text) {
    const el = document.createElement("div"); el.className = "msg user"; el.textContent = text;
    $("#chat-window").appendChild(el); chatScroll();
  }
  function showTyping() {
    const el = document.createElement("div"); el.className = "typing-dots"; el.id = "typing-now";
    el.innerHTML = "<i></i><i></i><i></i>"; $("#chat-window").appendChild(el); chatScroll();
  }
  function hideTyping() { const t = $("#typing-now"); if (t) t.remove(); }
  function typeBot(fn) { showTyping(); setTimeout(() => { hideTyping(); fn(); }, 650 + Math.random() * 400); }
  function renderQuickChips(options) {
    $("#chat-quick").innerHTML = options.map(o => `<button type="button" class="chip-btn" data-chat-quick="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join("");
  }
  function clearQuickChips() { $("#chat-quick").innerHTML = ""; }

  $("#chat-quick").addEventListener("click", (e) => {
    const b = e.target.closest("[data-chat-quick]"); if (!b) return;
    handleChatMessage(b.dataset.chatQuick);
  });
  $("#chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#chat-input"); const text = input.value.trim();
    if (!text) return; input.value = "";
    handleChatMessage(text);
  });

  function resolveSpecialty(text) {
    const low = text.toLowerCase();
    for (const rule of SPECIALTY_RULES) if (rule.keys.some(k => low.includes(k))) return rule.specialty;
    return "General Physician";
  }
  function findAllergyConflict(text, user) {
    const low = text.toLowerCase();
    return (user.allergies || []).find(a => low.includes(a.toLowerCase()));
  }
  function findInjuryConflict(text, user) {
    const low = text.toLowerCase();
    if (!EXERCISE_WORDS.some(w => low.includes(w))) return null;
    return (user.injuries || []).find(inj => {
      const recent = daysBetween(inj.date, todayISO()) <= 60;
      const bodyWord = inj.name.toLowerCase().split(/\s+/)[0];
      return recent && (low.includes(bodyWord) || SPECIALTY_RULES.some(r => r.specialty === "Orthopedic" && r.keys.some(k => low.includes(k)) && inj.name.toLowerCase().includes(k)));
    });
  }

  function handleChatMessage(text) {
    userSay(text);
    const user = currentUser();
    if (chatState.step === "idle") {
      chatState.concern = text; chatState.step = "duration"; clearQuickChips();
      typeBot(() => { botSay("Got it. How long has this been going on?"); renderQuickChips(["A few hours", "1–2 days", "About a week", "More than 2 weeks"]); });
    } else if (chatState.step === "duration") {
      chatState.duration = text; chatState.step = "severity"; clearQuickChips();
      typeBot(() => { botSay("And how would you rate it?"); renderQuickChips(["Mild", "Moderate", "Severe"]); });
    } else if (chatState.step === "severity") {
      chatState.severity = text; chatState.step = "idle"; clearQuickChips();
      typeBot(() => finalizeChatResponse(user));
    }
  }

  function finalizeChatResponse(user) {
    const concern = chatState.concern;
    const allergyHit = findAllergyConflict(concern, user);
    const injuryHit = findInjuryConflict(concern, user);
    const specialty = resolveSpecialty(concern);

    if (allergyHit) {
      botSay(`⚠️ Heads up — you have a recorded allergy to <b>${escapeHtml(allergyHit)}</b>. I won't suggest anything involving that. Please double-check with a pharmacist or doctor before taking any new medication.`, "warn");
    }
    if (injuryHit) {
      botSay(`⚠️ I see a recent <b>${escapeHtml(injuryHit.name)}</b> logged ${daysBetween(injuryHit.date, todayISO())} days ago. I'd avoid anything intense or heavy-loading in that area for now — gentle movement only, and check with your doctor before going back to full training.`, "warn");
    }

    const severityNote = chatState.severity === "Severe"
      ? "Given the severity you described, it's best not to wait — please get this checked soon."
      : "This sounds manageable for now, but keep an eye on it and seek care if it worsens.";
    botSay(`Thanks for the details — <i>${escapeHtml(concern)}</i>, ${chatState.duration ? chatState.duration.toLowerCase() : "recently"}, rated ${chatState.severity || "unspecified"}. ${severityNote} This isn't a diagnosis, just a general pointer — a <b>${specialty}</b> would be the right specialist to speak with.`);

    const candidates = DB.doctors.filter(d => d.specialty === specialty);
    const doc = candidates[0] || DB.doctors[0];
    if (doc) {
      const card = document.createElement("div");
      card.className = "msg bot";
      card.innerHTML = `<div class="msg-doc">
          <span class="doc-ava" style="${doctorColorStyle(doc)};width:38px;height:38px;border-radius:12px;font-size:.85rem">${initials(doc.name)}</span>
          <span><b style="display:block;font-size:.86rem">${escapeHtml(doc.name)}</b><small style="color:var(--text-faint)">${escapeHtml(doc.specialty)} · ⭐ ${doc.rating}</small></span>
          <button class="btn-pill small" data-book-doctor="${doc.id}" data-book-reason="${escapeHtml(concern)}">Book</button>
        </div>`;
      $("#chat-window").appendChild(card); chatScroll();
    }
    logActivity(`Asked the assistant about: ${concern}`); saveDB();
    renderQuickChips(["I have a headache", "Neck pain after the gym", "Trouble sleeping", "Stomach ache", "Skin rash"]);
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-book-doctor]"); if (!b) return;
    openBooking(b.dataset.bookDoctor, b.dataset.bookReason || "");
  });

  /* ==========================================================================
     REPORTS
     ========================================================================== */
  function jitter(base, amt) { return Math.round(base + (Math.random() * 2 - 1) * amt); }
  function simulateExtraction(user) {
    const sorted = (user.reports || []).slice().sort((a, b) => b.date.localeCompare(a.date));
    const base = sorted[0] ? sorted[0].vitals : { hr: 78, sugar: 110, sys: 118, dia: 78, chol: 185 };
    return { hr: jitter(base.hr, 6), sugar: jitter(base.sugar, 10), sys: jitter(base.sys, 6), dia: jitter(base.dia, 4), chol: jitter(base.chol, 8) };
  }
  function vitalPhrase(key, val) {
    const meta = VITAL_META[key];
    const ok = meta.good(val);
    return `${meta.label} ${val}${key === "sys" ? "" : ""} ${meta.unit} — ${ok ? "within normal range" : "slightly outside the normal range, worth watching"}.`;
  }
  function generateSummary(vitals) {
    return ["hr", "sugar", "sys", "dia", "chol"].map(k => vitalPhrase(k, vitals[k])).join(" ");
  }

  let pendingUpload = { fileName: "", prefill: null };
  const dropZone = $("#upload-drop");
  dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("drag"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault(); dropZone.classList.remove("drag");
    if (e.dataTransfer.files[0]) handleReportFile(e.dataTransfer.files[0]);
  });
  $("#report-file").addEventListener("change", (e) => { if (e.target.files[0]) handleReportFile(e.target.files[0]); e.target.value = ""; });

  function handleReportFile(file) {
    const user = currentUser();
    $("#upload-progress").hidden = false;
    $("#upload-progress-text").textContent = `Analysing ${file.name}…`;
    setTimeout(() => {
      $("#upload-progress").hidden = true;
      pendingUpload = { fileName: file.name, prefill: simulateExtraction(user) };
      openReportModal(`Detected from ${file.name} — a simulated extraction for this demo. Review and adjust before saving.`);
    }, 1100);
  }
  $("#btn-manual-report").addEventListener("click", () => { pendingUpload = { fileName: "Manual entry", prefill: null }; openReportModal("Enter your latest vitals manually."); });

  function openReportModal(sub) {
    $("#report-modal-sub").textContent = sub;
    const p = pendingUpload.prefill || { hr: "", sugar: "", sys: "", dia: "", chol: "" };
    $("#r-hr").value = p.hr; $("#r-sugar").value = p.sugar; $("#r-sys").value = p.sys; $("#r-dia").value = p.dia; $("#r-chol").value = p.chol;
    openModal("#report-modal");
  }
  $("#report-close").addEventListener("click", () => closeModal("#report-modal"));
  $("#report-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const user = currentUser();
    const vitals = { hr: +$("#r-hr").value, sugar: +$("#r-sugar").value, sys: +$("#r-sys").value, dia: +$("#r-dia").value, chol: +$("#r-chol").value };
    const report = { id: uid(), date: todayISO(), source: pendingUpload.fileName, vitals, summary: generateSummary(vitals) };
    user.reports = user.reports || []; user.reports.push(report);
    logActivity(`Uploaded report: ${pendingUpload.fileName}`);
    saveDB(); closeModal("#report-modal"); toast("Report saved to your profile.", "success");
    renderReports(); renderOverview();
  });

  function renderReports() {
    const user = currentUser(); if (!user) return;
    const sorted = (user.reports || []).slice().sort((a, b) => b.date.localeCompare(a.date));
    $("#reports-count").textContent = `${sorted.length} report${sorted.length === 1 ? "" : "s"}`;
    renderVitalsCompare($("#reports-compare"), user.reports);
    $("#reports-list").innerHTML = sorted.length ? sorted.map(r => `
      <div class="report-card">
        <div class="report-card-head"><b>${escapeHtml(r.source)}</b><time>${prettyDate(r.date)}</time></div>
        <div class="report-vitals">
          <span class="rv-pill">HR ${r.vitals.hr}</span><span class="rv-pill">Sugar ${r.vitals.sugar}</span>
          <span class="rv-pill">BP ${r.vitals.sys}/${r.vitals.dia}</span><span class="rv-pill">Chol ${r.vitals.chol}</span>
        </div>
        <p class="report-summary">${escapeHtml(r.summary)}</p>
      </div>`).join("") : `<p class="empty-note">No reports uploaded yet.</p>`;
  }

  /* ==========================================================================
     DOCTORS & APPOINTMENTS
     ========================================================================== */
  let bookingDoctorId = null;
  function renderDoctors() {
    $("#doc-grid").innerHTML = DB.doctors.map(d => `
      <div class="doc-card">
        <span class="doc-ava" style="${doctorColorStyle(d)}">${initials(d.name)}</span>
        <b>${escapeHtml(d.name)}</b>
        <span class="doc-spec">${escapeHtml(d.specialty)}</span>
        <span class="doc-meta">${d.exp} yrs experience · ⭐ ${d.rating}</span>
        <p>${escapeHtml(d.bio)}</p>
        <button class="btn-pill" data-book-doctor="${d.id}">Book appointment</button>
      </div>`).join("");
  }

  function openBooking(doctorId, reason) {
    bookingDoctorId = doctorId;
    const doc = DB.doctors.find(d => d.id === doctorId); if (!doc) return;
    $("#booking-doctor-info").innerHTML = `<span class="doc-ava" style="${doctorColorStyle(doc)};width:40px;height:40px;border-radius:12px">${initials(doc.name)}</span><span><b style="display:block">${escapeHtml(doc.name)}</b><small style="color:var(--text-faint)">${escapeHtml(doc.specialty)}</small></span>`;
    $("#booking-date").value = daysFromNowISO(2); $("#booking-date").min = todayISO();
    $("#booking-time").innerHTML = TIMES.map(t => `<option>${t}</option>`).join("");
    $("#booking-reason").value = reason || "";
    openModal("#booking-modal");
  }
  $("#booking-close").addEventListener("click", () => closeModal("#booking-modal"));
  $("#booking-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const user = currentUser();
    const appt = { id: uid(), patientEmail: user.email, doctorId: bookingDoctorId, date: $("#booking-date").value, time: $("#booking-time").value, reason: $("#booking-reason").value.trim(), status: "upcoming", createdAt: todayISO() };
    DB.appointments.push(appt);
    logActivity(`Booked an appointment with ${(DB.doctors.find(d => d.id === bookingDoctorId) || {}).name || "a doctor"}`);
    saveDB(); closeModal("#booking-modal"); toast("Appointment booked!", "success"); confetti();
    renderAppointments(); renderOverview();
  });

  function renderAppointments() {
    const user = currentUser(); if (!user) return;
    const mine = DB.appointments.filter(a => a.patientEmail === user.email).sort((a, b) => a.date.localeCompare(b.date));
    $("#appt-list").innerHTML = mine.length ? mine.map(a => {
      const doc = DB.doctors.find(d => d.id === a.doctorId) || {};
      return `<div class="appt-row">
        <span class="ar-date">${prettyDate(a.date)}<br>${a.time}</span>
        <span><b>${escapeHtml(doc.name || "Doctor")}</b><small>${escapeHtml(doc.specialty || "")} ${a.reason ? "· " + escapeHtml(a.reason) : ""}</small></span>
        <span class="status-badge ${a.status}">${a.status}</span>
        ${a.status === "upcoming" ? `<button class="btn-ghost sm" data-cancel-appt="${a.id}">Cancel</button>` : ""}
      </div>`;
    }).join("") : `<p class="empty-note">No appointments yet.</p>`;
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-cancel-appt]"); if (!b) return;
    const appt = DB.appointments.find(a => a.id === b.dataset.cancelAppt); if (!appt) return;
    appt.status = "cancelled"; saveDB(); toast("Appointment cancelled.", "warn");
    renderAppointments(); renderOverview(); if (currentDoctor()) renderDoctorApp();
  });

  /* ==========================================================================
     MEDICAL PROFILE
     ========================================================================== */
  function renderProfile() {
    const u = currentUser(); if (!u) return;
    $("#p-name").value = u.name; $("#p-dob").value = u.dob || ""; $("#p-blood").value = u.blood || "Unknown";
    $("#allergy-list").innerHTML = u.allergies.length ? u.allergies.map((a, i) => `<span class="ov-chip allergy">${escapeHtml(a)} <span class="chip-x" data-del-allergy="${i}">✕</span></span>`).join("") : `<span class="empty-note">No allergies recorded</span>`;
    $("#condition-list").innerHTML = u.conditions.length ? u.conditions.map(c => `<div class="record-row"><span>${escapeHtml(c.name)}</span><time>${prettyDate(c.date)}</time><span class="chip-x" data-del-condition="${c.id}">✕</span></div>`).join("") : `<p class="empty-note">No conditions recorded</p>`;
    $("#injury-list").innerHTML = u.injuries.length ? u.injuries.map(i => `<div class="record-row"><span>${escapeHtml(i.name)}</span><time>${prettyDate(i.date)}</time><span class="chip-x" data-del-injury="${i.id}">✕</span></div>`).join("") : `<p class="empty-note">No injuries recorded</p>`;
  }
  $("#form-profile").addEventListener("submit", (e) => {
    e.preventDefault();
    const u = currentUser();
    u.name = $("#p-name").value.trim() || u.name; u.dob = $("#p-dob").value; u.blood = $("#p-blood").value;
    saveDB(); toast("Profile saved.", "success"); $("#user-name").textContent = u.name; $("#user-avatar").textContent = u.name.charAt(0).toUpperCase();
  });
  $("#add-allergy").addEventListener("click", () => {
    const u = currentUser(); const v = $("#allergy-input").value.trim(); if (!v) return;
    u.allergies.push(v); $("#allergy-input").value = ""; saveDB(); renderProfile(); renderOverview();
  });
  $("#form-condition").addEventListener("submit", (e) => {
    e.preventDefault(); const u = currentUser();
    u.conditions.push({ id: uid(), name: $("#condition-name").value.trim(), date: $("#condition-date").value || todayISO() });
    e.target.reset(); saveDB(); renderProfile(); renderOverview();
  });
  $("#form-injury").addEventListener("submit", (e) => {
    e.preventDefault(); const u = currentUser();
    u.injuries.push({ id: uid(), name: $("#injury-name").value.trim(), date: $("#injury-date").value || todayISO() });
    e.target.reset(); saveDB(); renderProfile(); renderOverview();
  });
  document.addEventListener("click", (e) => {
    const u = currentUser(); if (!u) return;
    const da = e.target.closest("[data-del-allergy]");
    if (da) { u.allergies.splice(+da.dataset.delAllergy, 1); saveDB(); renderProfile(); renderOverview(); return; }
    const dc = e.target.closest("[data-del-condition]");
    if (dc) { u.conditions = u.conditions.filter(c => c.id !== dc.dataset.delCondition); saveDB(); renderProfile(); renderOverview(); return; }
    const di = e.target.closest("[data-del-injury]");
    if (di) { u.injuries = u.injuries.filter(i => i.id !== di.dataset.delInjury); saveDB(); renderProfile(); renderOverview(); return; }
  });

  /* ==========================================================================
     TIPS
     ========================================================================== */
  const TIPS = [
    { icon: "💧", text: "Aim for steady water intake through the day rather than large amounts at once." },
    { icon: "🚶", text: "A 10-minute walk after meals can help with digestion and energy levels." },
    { icon: "😴", text: "Consistent sleep and wake times matter more than total hours alone." },
    { icon: "🧘", text: "A few minutes of slow breathing can measurably lower stress in the moment." },
    { icon: "🥗", text: "Adding one extra vegetable to a meal is an easier habit than overhauling a whole diet." },
    { icon: "🩹", text: "After any strain or injury, ease back into activity gradually rather than all at once." },
    { icon: "📵", text: "A short screen break every hour can reduce eye strain and tension headaches." },
    { icon: "🫁", text: "Deep, slow breaths activate the body's natural calming response." }
  ];
  function renderTips() {
    const idx = Math.floor(Date.now() / 86400000) % TIPS.length;
    const tip = TIPS[idx];
    $("#tip-hero").innerHTML = `${tip.icon} ${tip.text}`;
    $("#tips-grid").innerHTML = TIPS.map(t => `<div class="tip-card"><span>${t.icon}</span>${t.text}</div>`).join("");
  }
  $("#tip-next").addEventListener("click", () => {
    const cur = $("#tip-hero").textContent; let t;
    do { t = TIPS[Math.floor(Math.random() * TIPS.length)]; } while (TIPS.length > 1 && cur.includes(t.text));
    $("#tip-hero").innerHTML = `${t.icon} ${t.text}`;
  });

  /* ==========================================================================
     DOCTOR DASHBOARD
     ========================================================================== */
  function renderDoctorApp() {
    const doc = currentDoctor(); if (!doc) return;
    $("#doc-name").textContent = doc.name; $("#doc-avatar").textContent = initials(doc.name);
    $("#doc-greet").textContent = `Welcome back, ${doc.name} — here's your schedule.`;
    $("#doc-stat-specialty").textContent = doc.specialty;
    $("#doc-stat-rating").textContent = "⭐ " + doc.rating;
    const mine = DB.appointments.filter(a => a.doctorId === doc.id);
    $("#doc-stat-patients").textContent = new Set(mine.map(a => a.patientEmail)).size;
    $("#doc-stat-upcoming").textContent = mine.filter(a => a.status === "upcoming").length;
    renderDoctorAppts();
  }
  function renderDoctorAppts(filter) {
    const doc = currentDoctor(); if (!doc) return;
    const q = (filter || "").toLowerCase();
    const mine = DB.appointments.filter(a => a.doctorId === doc.id).sort((a, b) => a.date.localeCompare(b.date));
    const rows = mine.filter(a => { const u = DB.users[a.patientEmail]; return !q || (u && u.name.toLowerCase().includes(q)); });
    $("#doc-appt-list").innerHTML = rows.length ? rows.map(a => {
      const u = DB.users[a.patientEmail] || { name: a.patientEmail };
      return `<div class="appt-row" data-open-patient="${a.patientEmail}" style="cursor:pointer">
        <span class="ar-date">${prettyDate(a.date)}<br>${a.time}</span>
        <span><b>${escapeHtml(u.name)}</b><small>${escapeHtml(a.reason || "No reason given")}</small></span>
        <span class="status-badge ${a.status}">${a.status}</span>
        ${a.status === "upcoming" ? `<button class="btn-ghost sm" data-complete-appt="${a.id}">Mark complete</button>` : ""}
      </div>`;
    }).join("") : `<p class="empty-note">No appointments yet.</p>`;
  }
  $("#doc-patient-search").addEventListener("input", (e) => renderDoctorAppts(e.target.value));
  document.addEventListener("click", (e) => {
    const c = e.target.closest("[data-complete-appt]");
    if (c) { const a = DB.appointments.find(x => x.id === c.dataset.completeAppt); if (a) { a.status = "completed"; saveDB(); renderDoctorApp(); } return; }
    const op = e.target.closest("[data-open-patient]");
    if (op && !e.target.closest("[data-complete-appt]")) openPatientRecord(op.dataset.openPatient);
  });
  function openPatientRecord(email) {
    const u = DB.users[email]; if (!u) return;
    const latest = (u.reports || []).slice().sort((a, b) => b.date.localeCompare(a.date))[0];
    $("#patient-record-body").innerHTML = `
      <h2>${escapeHtml(u.name)}</h2>
      <p class="panel-copy">${u.dob ? "DOB " + prettyDate(u.dob) : "DOB not set"} · Blood group ${escapeHtml(u.blood || "Unknown")}</p>
      <div class="panel-grid">
        <div><span class="panel-tag">Allergies</span><div class="ov-chip-list">${u.allergies.length ? u.allergies.map(a => `<span class="ov-chip allergy">⚠ ${escapeHtml(a)}</span>`).join("") : "<span class='empty-note'>None</span>"}</div></div>
        <div><span class="panel-tag">Conditions</span><div class="ov-chip-list">${u.conditions.length ? u.conditions.map(c => `<span class="ov-chip condition">${escapeHtml(c.name)}</span>`).join("") : "<span class='empty-note'>None</span>"}</div></div>
      </div>
      <span class="panel-tag">Injuries</span>
      <div class="ov-chip-list" style="margin-bottom:14px">${u.injuries.length ? u.injuries.map(i => `<span class="ov-chip injury">${escapeHtml(i.name)} · ${daysBetween(i.date, todayISO())}d ago</span>`).join("") : "<span class='empty-note'>None</span>"}</div>
      <span class="panel-tag">Latest report</span>
      ${latest ? `<div class="report-card" style="margin-top:8px"><div class="report-card-head"><b>${escapeHtml(latest.source)}</b><time>${prettyDate(latest.date)}</time></div><div class="report-vitals"><span class="rv-pill">HR ${latest.vitals.hr}</span><span class="rv-pill">Sugar ${latest.vitals.sugar}</span><span class="rv-pill">BP ${latest.vitals.sys}/${latest.vitals.dia}</span><span class="rv-pill">Chol ${latest.vitals.chol}</span></div><p class="report-summary">${escapeHtml(latest.summary)}</p></div>` : `<p class="empty-note">No reports on file.</p>`}
    `;
    openModal("#patient-record-modal");
  }
  $("#patient-record-close").addEventListener("click", () => closeModal("#patient-record-modal"));

  /* ==========================================================================
     SEARCH (header command search — patient app)
     ========================================================================== */
  function fuzzyScore(q, t) {
    q = q.toLowerCase(); t = t.toLowerCase();
    if (!q) return 1; if (t.includes(q)) return 2;
    let k = 0; for (const ch of t) if (ch === q[k]) k++;
    return k === q.length ? 1 : 0;
  }
  function searchItems() {
    const items = [
      { icon: "📊", label: "Go to Overview", run: () => switchView("overview") },
      { icon: "🤖", label: "Go to AI Assistant", run: () => switchView("assistant") },
      { icon: "📄", label: "Go to Reports", run: () => switchView("reports") },
      { icon: "🩺", label: "Go to Doctors & Appointments", run: () => switchView("doctors") },
      { icon: "🗂️", label: "Go to Medical Profile", run: () => switchView("profile") },
      { icon: "💡", label: "Go to Health Tips", run: () => switchView("tips") },
      { icon: "⚙️", label: "Go to Settings", run: () => switchView("settings") },
      { icon: "⬆", label: "Upload a report", run: () => { switchView("reports"); setTimeout(() => $("#report-file").click(), 300); } },
      { icon: "📘", label: "Download concept PDF", run: downloadConceptPDF },
      { icon: "🧾", label: "Download my health report PDF", run: downloadHealthPDF },
      { icon: "📸", label: "Take a screenshot", run: takeScreenshot },
      { icon: "🧭", label: "Start guided tour", run: startTour },
      { icon: "🌗", label: "Toggle light / dark theme", run: toggleTheme },
      { icon: "💾", label: "Backup my data", run: backupData },
      { icon: "🚪", label: "Logout", run: exitApp }
    ];
    DB.doctors.forEach(d => items.push({ icon: "🩺", label: `${d.name} — ${d.specialty}`, run: () => switchView("doctors") }));
    return items;
  }
  let searchSel = 0, searchShown = [];
  const searchInput = $("#global-search"), searchResults = $("#search-results");
  function renderSearch() {
    const q = searchInput.value.trim();
    const items = searchItems();
    searchShown = items.map(it => ({ it, s: fuzzyScore(q, it.label) })).filter(x => x.s).sort((a, b) => b.s - a.s).slice(0, 8).map(x => x.it);
    searchSel = Math.min(searchSel, Math.max(0, searchShown.length - 1));
    searchResults.innerHTML = searchShown.length ? searchShown.map((it, i) => `<div class="sr-item${i === searchSel ? " active" : ""}" data-sr="${i}"><span>${it.icon}</span>${escapeHtml(it.label)}</div>`).join("") : `<div class="sr-item">No matches</div>`;
    searchResults.classList.add("open");
  }
  searchInput.addEventListener("focus", renderSearch);
  searchInput.addEventListener("input", () => { searchSel = 0; renderSearch(); });
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); searchSel = (searchSel + 1) % Math.max(1, searchShown.length); renderSearch(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); searchSel = (searchSel - 1 + searchShown.length) % Math.max(1, searchShown.length); renderSearch(); }
    else if (e.key === "Enter") { e.preventDefault(); const it = searchShown[searchSel]; if (it) { it.run(); searchResults.classList.remove("open"); searchInput.blur(); } }
    else if (e.key === "Escape") { searchResults.classList.remove("open"); searchInput.blur(); }
  });
  searchResults.addEventListener("click", (e) => { const r = e.target.closest("[data-sr]"); if (!r) return; const it = searchShown[+r.dataset.sr]; if (it) { it.run(); searchResults.classList.remove("open"); searchInput.value = ""; } });
  document.addEventListener("click", (e) => { if (!e.target.closest("#header-search")) searchResults.classList.remove("open"); });

  /* ==========================================================================
     SCREENSHOT
     ========================================================================== */
  function takeScreenshot() {
    const isDoc = !!currentDoctor();
    const target = isDoc ? $("#doctor-main") : $(".view.active", $("#main-content"));
    if (!target || typeof html2canvas === "undefined") { toast("Screenshot tool unavailable.", "error"); return; }
    toast("Capturing screenshot…");
    html2canvas(target, { backgroundColor: getComputedStyle(document.body).getPropertyValue("--bg").trim() || "#07080c", scale: 2 }).then(canvas => {
      const who = isDoc ? (currentDoctor() || {}).name : (currentUser() || {}).name;
      const out = document.createElement("canvas"); out.width = canvas.width; out.height = canvas.height + 60 * 2;
      const ctx = out.getContext("2d");
      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--bg").trim() || "#07080c";
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(canvas, 0, 60);
      ctx.fillStyle = "#22d3ee"; ctx.font = "bold 28px sans-serif"; ctx.fillText("MediMind", 20, 40);
      ctx.fillStyle = "#9aa0b4"; ctx.font = "20px sans-serif"; ctx.textAlign = "right";
      ctx.fillText(`${who || "Guest"} · ${new Date().toLocaleString()}`, out.width - 20, out.height - 22);
      const a = document.createElement("a"); a.href = out.toDataURL("image/png"); a.download = `medimind-screenshot-${todayISO()}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      toast("Screenshot downloaded.", "success");
    }).catch(() => toast("Could not capture this view.", "error"));
  }
  $("#btn-screenshot").addEventListener("click", takeScreenshot);
  $("#settings-screenshot").addEventListener("click", takeScreenshot);
  $("#doc-btn-screenshot").addEventListener("click", takeScreenshot);

  /* ==========================================================================
     PDF EXPORTS
     ========================================================================== */
  function pdfDoc() {
    if (!window.jspdf || !window.jspdf.jsPDF) { toast("PDF library failed to load — check your internet connection and try again.", "error"); return null; }
    const { jsPDF } = window.jspdf; return new jsPDF({ unit: "pt", format: "a4" });
  }
  function pdfHeaderFooter(doc, title) {
    const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(13, 16, 24); doc.rect(0, 0, pageW, 6, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(140, 146, 166);
    doc.text(title, 44, pageH - 20); doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageW - 44, pageH - 20, { align: "right" });
  }
  function wrapText(doc, text, x, y, maxW, lh, ensureSpace) {
    const lines = doc.splitTextToSize(text, maxW);
    lines.forEach(line => { y = ensureSpace(y, lh); doc.text(line, x, y); y += lh; });
    return y;
  }

  const CONCEPT_SECTIONS = [
    ["The Problem", "Most digital health tools treat every visit as a blank slate. A patient's allergies, past injuries and recent lab results rarely follow them into a new conversation, a new app, or a new doctor's office. That gap causes real harm: a well-meaning suggestion — a supplement, an exercise plan, even a casual chatbot reply — can quietly conflict with something that happened weeks earlier."],
    ["The Idea", "MediMind centres everything around one continuous patient record. Allergies, conditions and injuries are captured once and referenced everywhere after: by the AI assistant before it replies, by the report summariser when it compares results, and by doctors who only ever see the slice of history relevant to the patient in front of them."],
    ["Patient Accounts", "Every patient signs up once and builds a structured health profile: basic details, a running list of allergies, diagnosed conditions with dates, and injuries with notes. This record is private to the account and forms the single source of truth every other feature reads from."],
    ["The AI Health Assistant", "Before replying to anything, the assistant checks the patient's stored history. It asks short follow-up questions to narrow down severity and duration, then — critically — cross-references the concern against recent injuries and known allergies before saying anything. A patient with a neck strain logged three weeks ago asking about workouts will be steered away from neck-loading exercises rather than given generic fitness advice. The assistant closes by pointing to a relevant specialist and lets the patient book directly."],
    ["Report Summariser", "Patients can upload a PDF or photo of a lab report. In a production build this stage would use OCR (for scanned documents) and a medical-literature-aware extraction model to pull out structured values — heart rate, blood sugar, blood pressure, cholesterol, and so on — and normalise them into a consistent schema. Each new report is automatically compared against the previous one, so a patient immediately sees what changed and in which direction, instead of having to read two PDFs side by side."],
    ["Doctor Dashboard", "Doctors only see patients who have booked an appointment with them, and only the history relevant to that appointment — not an unrestricted view of every record in the system. This mirrors real clinical consent: access is granted by the booking relationship, not by default. Doctors get an appointment schedule, a quick patient summary, and the ability to mark visits complete."],
    ["How a Production Version Would Differ", "This build is a front-end demo: no server, no real AI model, no OCR — the logic is rule-based and the data lives in the browser. A production system would add: a real backend with authenticated APIs; an encrypted database (at rest and in transit) compliant with regulations such as HIPAA or India's DPDP Act; a genuine NLP/LLM layer for the assistant, grounded in the patient's structured record via retrieval; a document-understanding pipeline (OCR + extraction model) for reports; role-based access control and full audit logging for every time a doctor views a record; and a notification layer for appointment reminders."],
    ["Safety Principles", "Three principles guide the design regardless of how it's implemented: never suggest something that conflicts with a documented allergy or recent injury without flagging it; never let an AI reply stand in for a licensed clinician — always route anything serious to a real doctor; and always make clear to the patient what data is being used and why."],
    ["Roadmap Ideas", "Natural extensions include wearable-device integration for continuous vitals, multilingual support for the assistant, voice input for patients who find typing difficult, insurance and billing integration, and family-linked accounts so a guardian can manage a dependent's profile with appropriate permissions."]
  ];
  function downloadConceptPDF() {
    const doc = pdfDoc(); if (!doc) return;
    const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight(), margin = 48;
    function ensureSpace(y, needed) { if (y + needed > pageH - 50) { doc.addPage(); pdfHeaderFooter(doc, "MediMind — Concept Document"); return 70; } return y; }
    doc.setFillColor(7, 8, 12); doc.rect(0, 0, pageW, pageH, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(30); doc.text("MediMind", margin, 160);
    doc.setFontSize(14); doc.setTextColor(150, 200, 220); doc.text("AI-Guided Patient Care — Concept Document", margin, 190);
    doc.setFontSize(10); doc.setTextColor(150, 155, 175);
    doc.text("From the problem it solves to how a production build would be architected.", margin, 214);
    doc.text("Generated " + new Date().toLocaleString(), margin, 230);
    doc.addPage(); pdfHeaderFooter(doc, "MediMind — Concept Document");
    doc.setTextColor(20, 20, 25);
    let y = 70;
    CONCEPT_SECTIONS.forEach(([heading, body]) => {
      y = ensureSpace(y, 50);
      doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(10, 120, 140); doc.text(heading, margin, y); y += 20;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(30, 32, 40);
      y = wrapText(doc, body, margin, y, pageW - margin * 2, 15, ensureSpace);
      y += 16;
    });
    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(140, 146, 166);
    y = ensureSpace(y, 30); doc.text("Disclaimer: MediMind is a demonstration concept. It is not a certified medical device and does not provide medical advice.", margin, y, { maxWidth: pageW - margin * 2 });
    doc.save("medimind-concept.pdf");
    toast("Concept PDF downloaded.", "success");
  }
  $("#btn-download-concept").addEventListener("click", downloadConceptPDF);
  $("#footer-download-concept").addEventListener("click", downloadConceptPDF);
  $("#settings-download-concept").addEventListener("click", downloadConceptPDF);

  function downloadHealthPDF() {
    const u = currentUser(); if (!u) { toast("Sign in first.", "error"); return; }
    const doc = pdfDoc(); const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight(), margin = 48;
    function ensureSpace(y, needed) { if (y + needed > pageH - 50) { doc.addPage(); pdfHeaderFooter(doc, "MediMind — Health Report"); return 70; } return y; }
    pdfHeaderFooter(doc, "MediMind — Health Report");
    let y = 60;
    doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(10, 120, 140); doc.text(u.name, margin, y); y += 22;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(90, 95, 110);
    doc.text(`DOB: ${u.dob ? prettyDate(u.dob) : "—"}   Blood group: ${u.blood || "Unknown"}   Generated: ${new Date().toLocaleDateString()}`, margin, y); y += 26;

    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(20, 20, 25); doc.text("Allergies", margin, y); y += 16;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    y = wrapText(doc, u.allergies.length ? u.allergies.join(", ") : "None recorded.", margin, y, pageW - margin * 2, 14, ensureSpace); y += 10;

    doc.setFont("helvetica", "bold"); doc.setFontSize(12); y = ensureSpace(y, 20); doc.text("Conditions", margin, y); y += 16;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    y = wrapText(doc, u.conditions.length ? u.conditions.map(c => `${c.name} (since ${prettyDate(c.date)})`).join("; ") : "None recorded.", margin, y, pageW - margin * 2, 14, ensureSpace); y += 10;

    doc.setFont("helvetica", "bold"); doc.setFontSize(12); y = ensureSpace(y, 20); doc.text("Injuries", margin, y); y += 16;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    y = wrapText(doc, u.injuries.length ? u.injuries.map(i => `${i.name} (${prettyDate(i.date)})`).join("; ") : "None recorded.", margin, y, pageW - margin * 2, 14, ensureSpace); y += 16;

    const sorted = (u.reports || []).slice().sort((a, b) => b.date.localeCompare(a.date));
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); y = ensureSpace(y, 20); doc.text("Latest Vitals", margin, y); y += 16;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    if (sorted[0]) {
      const v = sorted[0].vitals;
      y = wrapText(doc, `Heart rate ${v.hr} bpm · Blood sugar ${v.sugar} mg/dL · BP ${v.sys}/${v.dia} mmHg · Cholesterol ${v.chol} mg/dL (as of ${prettyDate(sorted[0].date)})`, margin, y, pageW - margin * 2, 14, ensureSpace); y += 6;
      y = wrapText(doc, sorted[0].summary, margin, y, pageW - margin * 2, 14, ensureSpace);
    } else { y = wrapText(doc, "No reports uploaded yet.", margin, y, pageW - margin * 2, 14, ensureSpace); }

    doc.setFont("helvetica", "italic"); doc.setFontSize(8.5); y = ensureSpace(y, 26); doc.setTextColor(140, 146, 166);
    doc.text("This document is generated from demo data and is not medical advice.", margin, y);
    const safe = u.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    doc.save(`medimind-health-report-${safe}.pdf`);
    toast("Health report PDF downloaded.", "success");
  }
  $("#qa-pdf").addEventListener("click", downloadHealthPDF);
  $("#settings-download-health").addEventListener("click", downloadHealthPDF);

  /* ==========================================================================
     BACKUP / RESET
     ========================================================================== */
  function backupData() {
    const u = currentUser(); if (!u) { toast("Sign in first.", "error"); return; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(u, null, 2)], { type: "application/json" }));
    a.download = `medimind-backup-${todayISO()}.json`; document.body.appendChild(a); a.click(); a.remove();
    toast("Backup downloaded.", "success");
  }
  $("#settings-backup").addEventListener("click", backupData);
  $("#settings-reset").addEventListener("click", () => {
    if (!confirm("This clears all MediMind demo data from this browser. Continue?")) return;
    localStorage.removeItem(DB_KEY); localStorage.removeItem("medimind.tour");
    location.reload();
  });

  /* ==========================================================================
     GUIDED TOUR (covers the whole patient app)
     ========================================================================== */
  const TOUR_KEY = "medimind.tour";
  function hasSeenTour() { try { return !!localStorage.getItem(TOUR_KEY); } catch (e) { return false; } }
  function markTourSeen(v) { try { localStorage.setItem(TOUR_KEY, v); } catch (e) {} }
  function maybeOfferTour() { openModal("#tour-prompt"); }
  $("#tour-start").addEventListener("click", () => { closeModal("#tour-prompt"); startTour(); });
  $("#tour-skip").addEventListener("click", () => { closeModal("#tour-prompt"); markTourSeen("skipped"); toast("No problem — restart anytime with the 🧭 Tour button or press T."); });

  const TOUR_STEPS = [
    { title: "Welcome to MediMind 👋", text: "This full tour walks through every part of the platform: your profile, the AI assistant, report comparisons, booking a doctor, and the clinician side too. Use Next/Back or the arrow keys any time." },
    { view: "overview", sel: ".side-nav", title: "Your navigation", text: "Six sections live here: Overview, AI Assistant, Reports, Doctors & Appointments, Medical Profile, Health Tips, and Settings. Keys 1–6 jump straight to the main ones." },
    { view: "overview", sel: "#header-search", title: "Universal search", text: "Jump to any section, doctor, or action from here — try typing 'tour', 'pdf' or a doctor's specialty. Press / anywhere to focus it." },
    { view: "overview", sel: ".ov-grid", title: "Your health snapshot", text: "Allergies, active conditions, recent injuries and your next appointment, all at a glance — this is what the AI assistant checks before it ever replies." },
    { view: "overview", sel: "#ov-vitals-compare", title: "Vitals trend", text: "The moment you have two reports on file, MediMind compares them automatically — up or down, and whether that direction is a good sign." },
    { view: "overview", sel: ".quick-actions", title: "Quick actions", text: "Jump straight into the assistant, upload a report, book a doctor, or download a PDF of your health record." },
    { view: "overview", sel: "#activity-list", title: "Recent activity", text: "A running log of everything you've done — logins, uploads, bookings and assistant conversations." },
    { view: "assistant", sel: "#chat-window", title: "AI Health Assistant", text: "It greets you having already loaded your profile. Try 'Neck pain after the gym' — because a neck strain is on file, it will specifically warn you before suggesting anything." },
    { view: "assistant", sel: "#chat-quick", title: "Guided follow-ups", text: "Instead of guessing, the assistant asks short follow-up questions — duration, then severity — before giving any pointer." },
    { view: "assistant", sel: "#chat-form", title: "Doctor hand-off", text: "Every answer ends with a matching specialist and a one-tap Book button, so a conversation can turn into an appointment immediately." },
    { view: "reports", sel: "#upload-drop", title: "Upload a report", text: "Drop a PDF or photo here. This demo simulates the extraction step and lets you review the numbers before saving." },
    { view: "reports", sel: "#reports-compare", title: "Previous vs. latest", text: "The same comparison from your dashboard, focused entirely on your report history." },
    { view: "reports", sel: "#reports-list", title: "Report history", text: "Every report you've ever added, each with its own plain-English summary." },
    { view: "doctors", sel: "#doc-grid", title: "Specialists", text: "Six demo doctor profiles across different specialties — tap Book on any of them." },
    { view: "doctors", sel: "#appt-list", title: "Your appointments", text: "Everything you've booked, with status and a cancel option while it's still upcoming." },
    { view: "profile", sel: "#allergy-list", title: "Allergies", text: "Add or remove allergies here — the assistant checks this list on every message." },
    { view: "profile", sel: "#injury-list", title: "Injuries", text: "Log an injury with a date, and for about two months afterwards the assistant will factor it into anything exercise-related." },
    { view: "tips", sel: "#tip-hero", title: "Daily health tips", text: "General wellness tips, rotated daily — never prescriptive, always general." },
    { view: "settings", sel: "#settings-download-concept", title: "Downloads", text: "Grab the full concept PDF, or export your own profile as a health report PDF, right from Settings." },
    { view: "settings", sel: "#theme-switch-2", title: "Light & dark mode", text: "Switch themes here, from the header, or press L." },
    { sel: "#btn-screenshot", title: "Screenshot anything", text: "Captures whatever section you're currently viewing as a downloadable image, watermarked with your name." },
    { title: "One more thing — the Doctor side 🩺", text: "Log out and choose 'Doctor login' on the sign-in screen to see the clinician dashboard: a schedule of bookings and read-only access to the relevant patient history for each one." },
    { title: "You're ready 🎉", text: "Restart this tour any time with the 🧭 Tour button or the T key, and press ? to see every keyboard shortcut." }
  ];
  let tourIdx = 0, tourActive = false;
  function tourSwitch(view) { if (view) switchView(view); }
  function startTour() {
    closeModal("#tour-prompt"); markTourSeen("done");
    $("#btn-tour").classList.remove("pulse");
    tourActive = true; $("#pp-tour").classList.add("open"); showTourStep(0);
  }
  function endTour() { tourActive = false; $("#pp-tour").classList.remove("open"); document.querySelector(".main-content") && document.querySelector(".main-content").scrollTo({ top: 0 }); }
  function showTourStep(i) {
    tourIdx = i; const s = TOUR_STEPS[i]; const card = $("#pp-card");
    tourSwitch(s.view);
    card.innerHTML = `<div class="pp-step-count">Step ${i + 1} of ${TOUR_STEPS.length}</div><h3>${s.title}</h3><p>${s.text}</p>
      <div class="pp-dots">${TOUR_STEPS.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("")}</div>
      <div class="pp-card-actions"><button class="btn-ghost small" data-tour-a="skip">Skip tour</button>
      <span><button class="btn-ghost small" data-tour-a="prev" ${i ? "" : "disabled"}>Back</button>
      <button class="btn-pill small" data-tour-a="next">${i === TOUR_STEPS.length - 1 ? "Finish" : "Next"}</button></span></div>`;
    card.classList.remove("in"); void card.offsetWidth; card.classList.add("in");
    setTimeout(() => {
      const el = s.sel && $(s.sel);
      if (el) el.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
      setTimeout(placeTour, el ? 420 : 0);
    }, 160);
  }
  function placeTour() {
    if (!tourActive) return;
    const s = TOUR_STEPS[tourIdx], el = s.sel && $(s.sel), spot = $("#pp-spot"), card = $("#pp-card");
    const vw = window.innerWidth, vh = window.innerHeight, cw = Math.min(380, vw - 24);
    card.style.width = cw + "px"; const ch = card.offsetHeight;
    if (!el || !el.offsetParent) {
      spot.classList.add("center"); spot.style.cssText = "";
      card.style.left = (vw - cw) / 2 + "px"; card.style.top = Math.max(12, (vh - ch) / 2) + "px"; return;
    }
    spot.classList.remove("center");
    const r = el.getBoundingClientRect(), p = 8;
    Object.assign(spot.style, { left: r.left - p + "px", top: r.top - p + "px", width: r.width + p * 2 + "px", height: r.height + p * 2 + "px" });
    let top;
    if (r.bottom + ch + 28 < vh) top = r.bottom + p + 12; else if (r.top - ch - 28 > 0) top = r.top - p - 12 - ch; else top = vh - ch - 16;
    card.style.top = top + "px"; card.style.left = Math.min(Math.max(12, r.left), vw - cw - 12) + "px";
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("#pp-card [data-tour-a]"); if (!b) return;
    const a = b.dataset.tourA;
    if (a === "skip") endTour();
    else if (a === "prev" && tourIdx > 0) showTourStep(tourIdx - 1);
    else if (a === "next") { if (tourIdx >= TOUR_STEPS.length - 1) endTour(); else showTourStep(tourIdx + 1); }
  });
  let tourRaf; const retourPlace = () => { cancelAnimationFrame(tourRaf); tourRaf = requestAnimationFrame(placeTour); };
  window.addEventListener("resize", retourPlace); window.addEventListener("scroll", retourPlace, { passive: true });
  $("#btn-tour").addEventListener("click", startTour);
  if (!hasSeenTour()) $("#btn-tour").classList.add("pulse");

  /* ==========================================================================
     SHORTCUTS
     ========================================================================== */
  $("#btn-shortcuts").addEventListener("click", () => openModal("#shortcuts-modal"));
  $("#shortcuts-close").addEventListener("click", () => closeModal("#shortcuts-modal"));
  document.addEventListener("keydown", (e) => {
    if (tourActive) {
      if (e.key === "Escape") endTour();
      else if (e.key === "ArrowRight") { e.preventDefault(); tourIdx >= TOUR_STEPS.length - 1 ? endTour() : showTourStep(tourIdx + 1); }
      else if (e.key === "ArrowLeft" && tourIdx > 0) { e.preventDefault(); showTourStep(tourIdx - 1); }
      return;
    }
    const tag = (e.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || tag === "select";
    if (e.key === "Escape") { $$(".modal-overlay.open").forEach(m => m.classList.remove("open")); return; }
    if (typing) return;
    if (e.key === "/") { e.preventDefault(); const si = $("#global-search"); if (si) { si.focus(); } return; }
    if (e.key === "?") { openModal("#shortcuts-modal"); return; }
    if (!$("#app-patient").classList.contains("active") && !$("#app-doctor").classList.contains("active")) return;
    if (e.shiftKey && e.key.toLowerCase() === "l") { e.preventDefault(); exitApp(); return; }
    const k = e.key.toLowerCase();
    if (k === "l") toggleTheme();
    else if (k === "t" && $("#app-patient").classList.contains("active")) startTour();
    else if (k === "s") takeScreenshot();
    else if (/^[1-6]$/.test(k) && $("#app-patient").classList.contains("active")) {
      const views = ["overview", "assistant", "reports", "doctors", "profile", "tips"];
      switchView(views[Number(k) - 1]);
    }
  });

  /* ==========================================================================
     RESUME SESSION ON RELOAD
     ========================================================================== */
  if (DB.session) { enterApp(); } else { $("#screen-landing").style.display = ""; }
})();