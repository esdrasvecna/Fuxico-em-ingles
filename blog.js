import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, query, where, limit,
  setDoc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCafN3RYgChH-Xl2qACLbAes5Ftmwvssug",
  authDomain: "fuxicopoliglota.firebaseapp.com",
  projectId: "fuxicopoliglota",
  storageBucket: "fuxicopoliglota.firebasestorage.app",
  messagingSenderId: "878407521160",
  appId: "1:878407521160:web:77f24cbb1e24b32acc203d",
  measurementId: "G-DJ533FQQPT"
};

const USERNAME_TO_EMAIL_DOMAIN = "fuxico.local";
const ALLOWED_USERNAMES = new Set(["blogpost"]);
const POSTS_COL = "posts";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const el = (id) => document.getElementById(id);
const show = (node, yes) => { if (node) node.style.display = yes ? "" : "none"; };

const viewList = el("viewList");
const listSection = el("listSection");
const postsGrid = el("postsGrid");
const loadMoreBtn = el("loadMoreBtn");
const searchInput = el("searchInput");
const chipRow = el("chipRow");
const activeTagEl = el("activeTag");
const emptyState = el("emptyState");

const viewPost = el("viewPost");
const postMeta = el("postMeta");
const postTitle = el("postTitle");
const postExcerpt = el("postExcerpt");
const postCover = el("postCover");
const postCoverImg = el("postCoverImg");
const postContent = el("postContent");
const toc = el("toc");
const readProgress = el("readProgress");
const backToListBtn = el("backToListBtn");

const viewAdmin = el("viewAdmin");
const loginBox = el("loginBox");
const adminBox = el("adminBox");
const loginUser = el("loginUser");
const loginPass = el("loginPass");
const loginBtn = el("loginBtn");
const loginMsg = el("loginMsg");
const logoutBtn = el("logoutBtn");

const aTitle = el("aTitle");
const aSlug = el("aSlug");
const aExcerpt = el("aExcerpt");
const aCoverUrl = el("aCoverUrl");
const aTags = el("aTags");
const aStatus = el("aStatus");
const aContent = el("aContent");

const newBtn = el("newBtn");
const saveBtn = el("saveBtn");
const deleteBtn = el("deleteBtn");
const adminList = el("adminList");
const adminMsg = el("adminMsg");

let isModerator = false;

// Público: carrega tudo e pagina no client (sem índice)
let allPublished = [];
let visibleCount = 9;
let activeTag = "Tudo";
let searchTerm = "";

// Admin editor
let currentEditingId = null;

function safeText(s){ return (s ?? "").toString(); }
function slugify(input) {
  return safeText(input)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
function tagsFromInput(v) {
  return safeText(v).split(",").map(t => t.trim()).filter(Boolean);
}
function formatDate(ts) {
  if (!ts) return "";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"numeric" });
  } catch { return ""; }
}
function toMillisMaybe(ts){
  if (!ts) return 0;
  try {
    if (typeof ts === "number") return ts;
    if (ts.toMillis) return ts.toMillis();
    if (ts.toDate) return ts.toDate().getTime();
    const d = new Date(ts);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  } catch { return 0; }
}

function setupReveal() {
  const targets = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("is-in"); });
  }, { threshold: 0.12 });
  targets.forEach(t => io.observe(t));
}

function parseRoute() {
  const h = (location.hash || "").replace(/^#/, "").trim();
  if (!h) return { name: "list" };
  if (h === "admin") return { name: "admin" };
  if (h.startsWith("post/")) return { name: "post", slug: h.slice(5) };
  return { name: "list" };
}

async function go(route) {
  show(viewList, false);
  show(listSection, false);
  show(viewPost, false);
  show(viewAdmin, false);
  readProgress.style.width = "0%";

  if (route.name === "list") {
    show(viewList, true);
    show(listSection, true);
    await ensurePublicLoaded();
  }
  if (route.name === "post") {
    show(viewPost, true);
    await loadPostBySlug(route.slug);
  }
  if (route.name === "admin") {
    show(viewAdmin, true);
    await refreshAdminUI();
  }

  setupReveal();
}

window.addEventListener("hashchange", () => go(parseRoute()));

async function ensurePublicLoaded() {
  if (allPublished.length) {
    renderChips(allPublished);
    renderGrid();
    return;
  }

  loadMoreBtn.disabled = true;
  loadMoreBtn.textContent = "Carregando…";
  show(emptyState, false);

  try {
    // Sem orderBy => sem índice obrigatório
    const q = query(
      collection(db, POSTS_COL),
      where("status", "==", "published"),
      limit(200)
    );

    const snap = await getDocs(q);
    allPublished = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Ordena no client por publishedAt -> updatedAt -> createdAt
    allPublished.sort((a,b) => {
      const am = toMillisMaybe(a.publishedAt) || toMillisMaybe(a.updatedAt) || toMillisMaybe(a.createdAt);
      const bm = toMillisMaybe(b.publishedAt) || toMillisMaybe(b.updatedAt) || toMillisMaybe(b.createdAt);
      return bm - am;
    });

    postsGrid.innerHTML = "";

    if (!allPublished.length) {
      show(emptyState, true);
      emptyState.textContent = "Ainda não há posts publicados.";
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = "Sem posts";
      return;
    }

    renderChips(allPublished);
    renderGrid();

    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = "Carregar mais";
  } catch (err) {
    console.error(err);
    postsGrid.innerHTML = "";
    show(emptyState, true);
    emptyState.textContent = "Não foi possível carregar os posts (verifique Rules/coleção/campos).";
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = "Erro";
  }
}

function renderChips(posts) {
  const tags = [...new Set(posts.flatMap(p => Array.isArray(p.tags) ? p.tags : []))].slice(0, 20);
  chipRow.innerHTML = "";

  const mk = (label) => {
    const b = document.createElement("button");
    b.className = "blog-chip";
    b.type = "button";
    b.textContent = label;
    b.setAttribute("aria-pressed", label === activeTag ? "true" : "false");
    b.addEventListener("click", () => {
      activeTag = label;
      activeTagEl.textContent = label;
      [...chipRow.querySelectorAll(".blog-chip")]
        .forEach(x => x.setAttribute("aria-pressed", x.textContent === activeTag ? "true" : "false"));
      visibleCount = 9;
      renderGrid();
    });
    return b;
  };

  chipRow.appendChild(mk("Tudo"));
  tags.forEach(t => chipRow.appendChild(mk(t)));
}

function passesFilters(p) {
  const title = safeText(p.title).toLowerCase();
  const excerpt = safeText(p.excerpt).toLowerCase();
  const content = safeText(p.contentHtml).toLowerCase();

  const okTag = (activeTag === "Tudo") || (Array.isArray(p.tags) && p.tags.includes(activeTag));
  const okSearch = !searchTerm || title.includes(searchTerm) || excerpt.includes(searchTerm) || content.includes(searchTerm);
  return okTag && okSearch;
}

function renderGrid() {
  const filtered = allPublished.filter(passesFilters);
  postsGrid.innerHTML = "";

  if (!filtered.length) {
    show(emptyState, true);
    emptyState.textContent = "Nenhum post encontrado com esse filtro/busca.";
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = "Sem resultados";
    return;
  }

  show(emptyState, false);

  const page = filtered.slice(0, visibleCount);
  page.forEach(p => postsGrid.appendChild(renderCard(p)));

  if (visibleCount >= filtered.length) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = "Fim";
  } else {
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = "Carregar mais";
  }
}

function renderCard(p) {
  const card = document.createElement("div");
  card.className = "post-card reveal";

  const cover = document.createElement("div");
  cover.className = "post-cover";
  if (p.coverUrl) {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = p.coverUrl;
    img.alt = p.title || "Capa do post";
    cover.appendChild(img);
  }
  card.appendChild(cover);

  const body = document.createElement("div");
  body.className = "post-body";

  const meta = document.createElement("div");
  meta.className = "post-meta";
  const dt = formatDate(p.publishedAt) || formatDate(p.updatedAt) || "";
  meta.textContent = dt ? `📅 ${dt}` : "📌";
  body.appendChild(meta);

  const h = document.createElement("h3");
  h.className = "post-title";
  h.textContent = p.title || "Sem título";
  body.appendChild(h);

  const ex = document.createElement("p");
  ex.className = "post-excerpt";
  ex.textContent = p.excerpt || "Clique para ler.";
  body.appendChild(ex);

  const tags = document.createElement("div");
  tags.className = "post-tags";
  (Array.isArray(p.tags) ? p.tags.slice(0, 3) : []).forEach(t => {
    const s = document.createElement("span");
    s.className = "post-tag";
    s.textContent = t;
    tags.appendChild(s);
  });
  body.appendChild(tags);

  card.appendChild(body);

  const slug = p.slug || p.id;
  const a = document.createElement("a");
  a.className = "post-link";
  a.href = `#post/${encodeURIComponent(slug)}`;
  a.textContent = "Abrir post";
  card.appendChild(a);

  return card;
}

async function loadPostBySlug(slug) {
  const clean = decodeURIComponent(safeText(slug)).trim();
  if (!clean) { location.hash = ""; return; }

  postTitle.textContent = "Carregando…";
  postExcerpt.textContent = "";
  postMeta.textContent = "Carregando…";
  postContent.innerHTML = "<p>Carregando conteúdo…</p>";
  toc.innerHTML = "";
  show(postCover, false);

  try {
    // tenta por docId
    let snap = await getDoc(doc(db, POSTS_COL, clean));
    let data = snap.exists() ? { id: snap.id, ...snap.data() } : null;

    // fallback: pelo cache carregado (evita query extra)
    if (!data && allPublished.length) {
      data = allPublished.find(p => (p.slug === clean) || (p.id === clean)) || null;
    }

    if (!data) {
      postTitle.textContent = "Post não encontrado";
      postContent.innerHTML = "<p>Esse post não existe ou não está acessível.</p>";
      return;
    }

    // público só vê published
    if (!isModerator && data.status !== "published") {
      postTitle.textContent = "Indisponível";
      postContent.innerHTML = "<p>Esse post ainda não está publicado.</p>";
      return;
    }

    postTitle.textContent = data.title || "Sem título";
    postExcerpt.textContent = data.excerpt || "";

    const dt = formatDate(data.publishedAt) || formatDate(data.updatedAt) || "";
    const tags = Array.isArray(data.tags) ? data.tags : [];
    postMeta.textContent = `${dt ? "📅 " + dt : "📌"}${tags.length ? " • 🏷️ " + tags.join(", ") : ""}`;

    if (data.coverUrl) {
      postCoverImg.src = data.coverUrl;
      postCoverImg.alt = data.title || "Capa";
      show(postCover, true);
    }

    postContent.innerHTML = data.contentHtml || "<p>(Sem conteúdo)</p>";
    buildTOC();
    setupReadProgress();
  } catch (err) {
    console.error(err);
    postTitle.textContent = "Erro ao carregar";
    postContent.innerHTML = "<p>Ocorreu um erro ao carregar o post.</p>";
  }
}

function buildTOC() {
  toc.innerHTML = "";
  const headers = postContent.querySelectorAll("h2, h3");
  if (!headers.length) {
    toc.innerHTML = "<li>Sem seções</li>";
    return;
  }
  headers.forEach((h, i) => {
    if (!h.id) h.id = `sec-${i}-${slugify(h.textContent)}`;
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `#${h.id}`;
    a.textContent = h.textContent;
    li.appendChild(a);
    toc.appendChild(li);
  });
}

function setupReadProgress() {
  const onScroll = () => {
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const y = window.scrollY;
    const pct = docH > 0 ? Math.min(100, Math.max(0, (y / docH) * 100)) : 0;
    readProgress.style.width = pct + "%";
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

backToListBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  location.hash = "";
});

function usernameToEmail(username) {
  const u = safeText(username).trim().toLowerCase();
  if (!ALLOWED_USERNAMES.has(u)) return null;
  return `${u}@${USERNAME_TO_EMAIL_DOMAIN}`;
}

async function refreshAdminUI() {
  if (isModerator) {
    show(loginBox, false);
    show(adminBox, true);
    await loadAdminList();
    adminMsg.textContent = "Pronto.";
  } else {
    show(loginBox, true);
    show(adminBox, false);
    loginMsg.textContent = "";
  }
}

loginBtn?.addEventListener("click", async () => {
  loginMsg.textContent = "Entrando…";
  const email = usernameToEmail(loginUser.value);
  if (!email) { loginMsg.textContent = "Usuário inválido."; return; }
  try {
    await signInWithEmailAndPassword(auth, email, loginPass.value);
    loginMsg.textContent = "";
  } catch (err) {
    console.error(err);
    loginMsg.textContent = "Falha no login.";
  }
});

logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  location.hash = "";
});

newBtn?.addEventListener("click", () => {
  currentEditingId = null;
  aTitle.value = "";
  aSlug.value = "";
  aExcerpt.value = "";
  aCoverUrl.value = "";
  aTags.value = "";
  aStatus.value = "draft";
  aContent.value = "<h2>Título</h2>\n<p>Escreva aqui…</p>";
  adminMsg.textContent = "";
});

aTitle?.addEventListener("input", () => {
  if (!aSlug.value.trim()) aSlug.value = slugify(aTitle.value);
});

saveBtn?.addEventListener("click", async () => {
  if (!isModerator) return;

  const title = safeText(aTitle.value).trim();
  const slug = slugify(aSlug.value || title);
  const excerpt = safeText(aExcerpt.value).trim();
  const coverUrl = safeText(aCoverUrl.value).trim();
  const tags = tagsFromInput(aTags.value);
  const status = aStatus.value;
  const contentHtml = safeText(aContent.value);

  if (!title || !slug) { adminMsg.textContent = "Preencha Título e Slug."; return; }

  const id = currentEditingId || slug;
  const payload = {
    title, slug, excerpt, coverUrl, tags, status, contentHtml,
    updatedAt: serverTimestamp(),
  };

  try {
    const ref = doc(db, POSTS_COL, id);
    const existing = await getDoc(ref);

    if (!existing.exists()) {
      payload.createdAt = serverTimestamp();
      if (status === "published") payload.publishedAt = serverTimestamp();
      await setDoc(ref, payload);
    } else {
      // se publicar e não tinha publishedAt
      if (status === "published") {
        const cur = existing.data();
        if (!cur.publishedAt) payload.publishedAt = serverTimestamp();
      }
      await updateDoc(ref, payload);
    }

    currentEditingId = id;
    adminMsg.textContent = "Salvo.";
    await loadAdminList();

    // recarrega público
    allPublished = [];
    visibleCount = 9;
    if (parseRoute().name === "list") await ensurePublicLoaded();
  } catch (err) {
    console.error(err);
    adminMsg.textContent = "Erro ao salvar (Rules).";
  }
});

deleteBtn?.addEventListener("click", async () => {
  if (!isModerator || !currentEditingId) return;
  const ok = confirm("Excluir este post?");
  if (!ok) return;

  try {
    await deleteDoc(doc(db, POSTS_COL, currentEditingId));
    adminMsg.textContent = "Excluído.";
    currentEditingId = null;
    await loadAdminList();
    allPublished = [];
    visibleCount = 9;
  } catch (err) {
    console.error(err);
    adminMsg.textContent = "Erro ao excluir.";
  }
});

async function loadAdminList() {
  adminList.innerHTML = "Carregando…";
  try {
    const snap = await getDocs(query(collection(db, POSTS_COL), limit(100)));
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // ordena no client
    items.sort((a,b) => {
      const am = toMillisMaybe(a.updatedAt) || toMillisMaybe(a.createdAt) || 0;
      const bm = toMillisMaybe(b.updatedAt) || toMillisMaybe(b.createdAt) || 0;
      return bm - am;
    });

    adminList.innerHTML = "";
    if (!items.length) { adminList.textContent = "Sem posts."; return; }

    items.forEach(p => {
      const row = document.createElement("div");
      row.className = "blog-pill";
      row.style.justifyContent = "space-between";
      row.style.cursor = "pointer";

      const left = document.createElement("div");
      left.style.display = "flex";
      left.style.flexDirection = "column";
      left.style.gap = "2px";

      const t = document.createElement("strong");
      t.textContent = p.title || p.id;

      const s = document.createElement("span");
      s.style.color = "rgba(11,18,32,.65)";
      s.style.fontSize = "12px";
      s.textContent = `${p.status || "draft"} • ${p.slug || p.id}`;

      left.appendChild(t);
      left.appendChild(s);

      row.appendChild(left);
      row.addEventListener("click", () => {
        currentEditingId = p.id;
        aTitle.value = p.title || "";
        aSlug.value = p.slug || p.id || "";
        aExcerpt.value = p.excerpt || "";
        aCoverUrl.value = p.coverUrl || "";
        aTags.value = Array.isArray(p.tags) ? p.tags.join(", ") : "";
        aStatus.value = p.status || "draft";
        aContent.value = p.contentHtml || "";
        adminMsg.textContent = "";
      });

      adminList.appendChild(row);
    });
  } catch (err) {
    console.error(err);
    adminList.textContent = "Erro ao listar.";
  }
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    isModerator = false;
  } else {
    const allowedEmails = [...ALLOWED_USERNAMES].map(u => `${u}@${USERNAME_TO_EMAIL_DOMAIN}`);
    isModerator = allowedEmails.includes(user.email);
  }
  const r = parseRoute();
  if (r.name === "admin") refreshAdminUI();
});

searchInput?.addEventListener("input", () => {
  searchTerm = safeText(searchInput.value).trim().toLowerCase();
  visibleCount = 9;
  renderGrid();
});

loadMoreBtn?.addEventListener("click", () => {
  visibleCount += 9;
  renderGrid();
});

go(parseRoute());
