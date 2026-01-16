// blog.js (SPA simples dentro de uma única blog.html)
// Rotas:
// - # (ou vazio): lista pública
// - #post/<slug>: leitura pública
// - #admin: painel moderador (login)

// Firebase (SDK modular via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, query, where, orderBy, limit, startAfter,
  setDoc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

// === 1) CONFIG DO SEU PROJETO ===
const firebaseConfig = {
  apiKey: "AIzaSyCafN3RYgChH-Xl2qACLbAes5Ftmwvssug",
  authDomain: "fuxicopoliglota.firebaseapp.com",
  projectId: "fuxicopoliglota",
  storageBucket: "fuxicopoliglota.firebasestorage.app",
  messagingSenderId: "878407521160",
  appId: "1:878407521160:web:77f24cbb1e24b32acc203d",
  measurementId: "G-DJ533FQQPT"
};

// “Usuário” que você quer usar no login (sem e-mail visível):
// user: blogpost -> email interno: blogpost@fuxico.local
const USERNAME_TO_EMAIL_DOMAIN = "fuxico.local";
const ALLOWED_USERNAMES = new Set(["blogpost"]); // somente esse usuário

// Coleção
const POSTS_COL = "posts";

// === 2) INIT FIREBASE ===
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// === 3) ELEMENTOS (LISTA) ===
const el = (id) => document.getElementById(id);

const viewList = el("viewList");
const listSection = el("listSection");
const postsGrid = el("postsGrid");
const loadMoreBtn = el("loadMoreBtn");
const searchInput = el("searchInput");
const chipRow = el("chipRow");
const activeTagEl = el("activeTag");
const emptyState = el("emptyState");

// === 4) ELEMENTOS (POST) ===
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
const adminQuickCard = el("adminQuickCard");

// === 5) ELEMENTOS (ADMIN) ===
const viewAdmin = el("viewAdmin");
const loginBox = el("loginBox");
const adminBox = el("adminBox");
const loginUser = el("loginUser");
const loginPass = el("loginPass");
const loginBtn = el("loginBtn");
const loginMsg = el("loginMsg");
const logoutBtn = el("logoutBtn");
const seedBtn = el("seedBtn");

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
const previewBtn = el("previewBtn");
const adminList = el("adminList");
const adminMsg = el("adminMsg");

// === 6) ESTADO ===
let allLoadedPosts = [];     // posts já carregados (pra busca/chips)
let lastDoc = null;          // paginação
let activeTag = "Tudo";
let searchTerm = "";
let isModerator = false;

let currentEditingId = null; // docId do post no editor (admin)

// === 7) UTILITÁRIOS ===
function safeText(s) {
  return (s ?? "").toString();
}
function slugify(input) {
  return safeText(input)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
function formatDate(ts) {
  if (!ts) return "";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"numeric" });
  } catch {
    return "";
  }
}
function tagsFromInput(v) {
  return safeText(v)
    .split(",")
    .map(t => t.trim())
    .filter(Boolean);
}
function uniq(arr) {
  return [...new Set(arr)];
}
function show(elm, yes) {
  if (!elm) return;
  elm.style.display = yes ? "" : "none";
}

// === 8) REVEAL ANIMATIONS ===
function setupReveal() {
  const targets = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add("is-in");
    });
  }, { threshold: 0.12 });

  targets.forEach(t => io.observe(t));
}

// === 9) ROUTER (hash) ===
function parseRoute() {
  const h = (location.hash || "").replace(/^#/, "").trim();
  if (!h) return { name: "list" };
  if (h === "admin") return { name: "admin" };
  if (h.startsWith("post/")) return { name: "post", slug: h.slice(5) };
  return { name: "list" };
}

async function go(route) {
  // Esconde tudo
  show(viewList, false);
  show(listSection, false);
  show(viewPost, false);
  show(viewAdmin, false);
  readProgress.style.width = "0%";

  // Mostra o que precisa
  if (route.name === "list") {
    show(viewList, true);
    show(listSection, true);
    adminQuickCard && show(adminQuickCard, isModerator);
    await ensureListLoaded();
  }

  if (route.name === "post") {
    show(viewPost, true);
    show(viewList, false);
    show(listSection, false);
    adminQuickCard && show(adminQuickCard, isModerator);
    await loadPostBySlug(route.slug);
  }

  if (route.name === "admin") {
    show(viewAdmin, true);
    await refreshAdminUI();
  }

  setupReveal();
}

window.addEventListener("hashchange", () => go(parseRoute()));

// === 10) LISTAGEM PÚBLICA (Firestore) ===
function buildPublicQuery({ afterDoc = null } = {}) {
  // Tenta ordenar por publishedAt, mas se não existir, o Firestore pode reclamar.
  // Então, vamos usar publishedAt quando possível, e cair para updatedAt se precisar.
  // (No começo, recomendo você preencher publishedAt nos posts publicados.)
  let q = query(
    collection(db, POSTS_COL),
    where("status", "==", "published"),
    orderBy("publishedAt", "desc"),
    limit(9)
  );
  if (afterDoc) q = query(
    collection(db, POSTS_COL),
    where("status", "==", "published"),
    orderBy("publishedAt", "desc"),
    startAfter(afterDoc),
    limit(9)
  );
  return q;
}

async function fetchNextPage() {
  loadMoreBtn.disabled = true;
  loadMoreBtn.textContent = "Carregando…";

  try {
    const q = buildPublicQuery({ afterDoc: lastDoc });
    const snap = await getDocs(q);
    const docs = snap.docs;

    if (!docs.length && allLoadedPosts.length === 0) {
      postsGrid.innerHTML = "";
      show(emptyState, true);
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = "Sem mais posts";
      return;
    }

    const newPosts = docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    lastDoc = docs[docs.length - 1] || lastDoc;
    allLoadedPosts = allLoadedPosts.concat(newPosts);

    renderChipsFromPosts(allLoadedPosts);
    renderPublicGrid();

    loadMoreBtn.disabled = docs.length < 9;
    loadMoreBtn.textContent = docs.length < 9 ? "Sem mais posts" : "Carregar mais";
  } catch (err) {
    console.error(err);
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = "Erro ao carregar";
    show(emptyState, true);
    emptyState.innerHTML = `Não foi possível carregar posts (verifique Rules/índices).`;
  }
}

function renderChipsFromPosts(posts) {
  // Pega tags existentes
  const tags = uniq(
    posts.flatMap(p => Array.isArray(p.tags) ? p.tags : [])
  ).slice(0, 20);

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
      // atualiza pressed
      [...chipRow.querySelectorAll(".blog-chip")].forEach(x => x.setAttribute("aria-pressed", x.textContent === activeTag ? "true" : "false"));
      renderPublicGrid();
    });
    return b;
  };

  chipRow.appendChild(mk("Tudo"));
  tags.forEach(t => chipRow.appendChild(mk(t)));
}

function renderPublicGrid() {
  show(emptyState, false);

  const filtered = allLoadedPosts.filter(p => {
    const title = safeText(p.title).toLowerCase();
    const excerpt = safeText(p.excerpt).toLowerCase();
    const content = safeText(p.contentHtml).toLowerCase();

    const okTag = (activeTag === "Tudo") || (Array.isArray(p.tags) && p.tags.includes(activeTag));
    const okSearch = !searchTerm || (title.includes(searchTerm) || excerpt.includes(searchTerm) || content.includes(searchTerm));
    return okTag && okSearch;
  });

  postsGrid.innerHTML = "";

  if (!filtered.length) {
    show(emptyState, true);
    emptyState.textContent = "Nenhum post encontrado com esse filtro/busca.";
    return;
  }

  filtered.forEach(p => postsGrid.appendChild(renderPostCard(p)));
}

function renderPostCard(p) {
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
  const dt = formatDate(p.publishedAt);
  meta.textContent = dt ? `📅 ${dt}` : "📌 Publicado";
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

async function ensureListLoaded() {
  if (allLoadedPosts.length) return;
  await fetchNextPage();
}

// === 11) LEITURA DO POST (na mesma página) ===
async function loadPostBySlug(slug) {
  const clean = decodeURIComponent(safeText(slug)).trim();
  if (!clean) {
    location.hash = "";
    return;
  }

  // Reset UI
  postTitle.textContent = "Carregando…";
  postExcerpt.textContent = "";
  postMeta.textContent = "Carregando…";
  postContent.innerHTML = "<p>Carregando conteúdo…</p>";
  toc.innerHTML = "";
  show(postCover, false);

  try {
    // 1) tenta por docId
    let snap = await getDoc(doc(db, POSTS_COL, clean));
    let data = snap.exists() ? { id: snap.id, ...snap.data() } : null;

    // 2) se não existir, tenta por campo slug
    if (!data) {
      const q = query(collection(db, POSTS_COL), where("slug", "==", clean), limit(1));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const d = qSnap.docs[0];
        data = { id: d.id, ...d.data() };
      }
    }

    if (!data) {
      postTitle.textContent = "Post não encontrado";
      postContent.innerHTML = "<p>Esse post não existe (ou não está acessível).</p>";
      return;
    }

    // Público só vê publicado
    if (!isModerator && data.status !== "published") {
      postTitle.textContent = "Indisponível";
      postContent.innerHTML = "<p>Esse post ainda não está publicado.</p>";
      return;
    }

    // Render
    postTitle.textContent = data.title || "Sem título";
    postExcerpt.textContent = data.excerpt || "";

    const dt = formatDate(data.publishedAt);
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

    // Admin quick card
    show(adminQuickCard, isModerator);
  } catch (err) {
    console.error(err);
    postTitle.textContent = "Erro ao carregar";
    postContent.innerHTML = "<p>Ocorreu um erro ao carregar o post. Verifique Rules/índices.</p>";
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
    const article = el("article");
    if (!article) return;

    const rect = article.getBoundingClientRect();
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const y = window.scrollY;
    const pct = docH > 0 ? Math.min(100, Math.max(0, (y / docH) * 100)) : 0;
    readProgress.style.width = pct + "%";
  };

  window.removeEventListener("scroll", onScroll);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

backToListBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  location.hash = "";
});

// === 12) ADMIN: AUTH + CRUD ===
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
    adminMsg.textContent = "Logado. Você pode criar/editar posts.";
  } else {
    show(loginBox, true);
    show(adminBox, false);
    loginMsg.textContent = 'Use usuário "blogpost" e senha "adminblog".';
  }
}

loginBtn?.addEventListener("click", async () => {
  loginMsg.textContent = "Entrando…";
  const email = usernameToEmail(loginUser.value);
  if (!email) {
    loginMsg.textContent = "Usuário inválido.";
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, email, loginPass.value);
    loginMsg.textContent = "Logado!";
  } catch (err) {
    console.error(err);
    loginMsg.textContent = "Falha no login (verifique usuário/senha no Auth).";
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
  aContent.value = "<h2>Seu título</h2>\n<p>Escreva aqui…</p>";
  adminMsg.textContent = "Novo post pronto. Preencha e clique em Salvar.";
});

aTitle?.addEventListener("input", () => {
  // ajuda a criar slug automaticamente se ainda está vazio
  if (!aSlug.value.trim()) aSlug.value = slugify(aTitle.value);
});

previewBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  const slug = slugify(aSlug.value || aTitle.value);
  if (!slug) return;
  // salva rascunho local de preview? aqui só navega
  location.hash = `post/${encodeURIComponent(slug)}`;
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

  if (!title || !slug) {
    adminMsg.textContent = "Preencha pelo menos Título e Slug.";
    return;
  }

  const id = currentEditingId || slug; // padrão: docId = slug

  const payload = {
    title,
    slug,
    excerpt,
    coverUrl,
    tags,
    status,
    contentHtml,
    updatedAt: serverTimestamp(),
  };

  try {
    const ref = doc(db, POSTS_COL, id);
    const existing = await getDoc(ref);

    if (!existing.exists()) {
      // create
      payload.createdAt = serverTimestamp();
      if (status === "published") payload.publishedAt = serverTimestamp();
      await setDoc(ref, payload);
    } else {
      // update
      if (status === "published") {
        // se ainda não tinha publishedAt, seta
        const cur = existing.data();
        if (!cur.publishedAt) payload.publishedAt = serverTimestamp();
      }
      await updateDoc(ref, payload);
    }

    currentEditingId = id;
    adminMsg.textContent = `Salvo com sucesso: ${id}`;
    await loadAdminList();
    // atualiza lista pública da sessão
    allLoadedPosts = [];
    lastDoc = null;
  } catch (err) {
    console.error(err);
    adminMsg.textContent = "Erro ao salvar. Verifique Rules do Firestore.";
  }
});

deleteBtn?.addEventListener("click", async () => {
  if (!isModerator) return;
  if (!currentEditingId) {
    adminMsg.textContent = "Nenhum post selecionado.";
    return;
  }
  const ok = confirm("Excluir este post? Isso não pode ser desfeito.");
  if (!ok) return;

  try {
    await deleteDoc(doc(db, POSTS_COL, currentEditingId));
    adminMsg.textContent = "Post excluído.";
    currentEditingId = null;
    await loadAdminList();
    allLoadedPosts = [];
    lastDoc = null;
  } catch (err) {
    console.error(err);
    adminMsg.textContent = "Erro ao excluir. Verifique Rules.";
  }
});

async function loadAdminList() {
  adminList.innerHTML = "Carregando…";

  try {
    const q = query(collection(db, POSTS_COL), orderBy("updatedAt", "desc"), limit(50));
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    adminList.innerHTML = "";
    if (!items.length) {
      adminList.textContent = "Nenhum post ainda.";
      return;
    }

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

      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.gap = "8px";
      right.style.alignItems = "center";
      right.innerHTML = `<span style="font-size:12px;color:rgba(11,18,32,.65);">Editar</span>`;

      row.appendChild(left);
      row.appendChild(right);

      row.addEventListener("click", () => loadIntoEditor(p));

      adminList.appendChild(row);
    });
  } catch (err) {
    console.error(err);
    adminList.textContent = "Erro ao listar (Rules/índice).";
  }
}

function loadIntoEditor(p) {
  currentEditingId = p.id;
  aTitle.value = p.title || "";
  aSlug.value = p.slug || p.id || "";
  aExcerpt.value = p.excerpt || "";
  aCoverUrl.value = p.coverUrl || "";
  aTags.value = Array.isArray(p.tags) ? p.tags.join(", ") : "";
  aStatus.value = p.status || "draft";
  aContent.value = p.contentHtml || "<p>(sem conteúdo)</p>";

  adminMsg.textContent = `Editando: ${currentEditingId}`;
}

// === 13) SEED: criar 3 posts de teste (de verdade no Firestore) ===
seedBtn?.addEventListener("click", async () => {
  if (!isModerator) {
    alert("Você precisa estar logado como moderador.");
    return;
  }

  const ok = confirm('Criar 3 posts de teste no Firestore?');
  if (!ok) return;

  const samples = [
    {
      title: "3 jeitos de destravar a conversação em inglês",
      slug: "destravar-conversacao-ingles",
      excerpt: "Técnicas simples pra parar de travar e falar com mais confiança (sem decorar texto).",
      tags: ["conversacao", "fluencia"],
      status: "published",
      coverUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=60",
      contentHtml: `
        <p>Travar é normal — o segredo é reduzir fricção e aumentar repetição com leveza.</p>
        <h2>1) Use frases âncora</h2>
        <p>Tenha 5 frases que você domina e use como “ponte” (ex: <strong>In my opinion…</strong>).</p>
        <h2>2) Troque perfeição por clareza</h2>
        <p>Se você foi entendido, já venceu. Depois você refina.</p>
        <h2>3) Faça micro-roteiros</h2>
        <p>Antes do encontro, pense em 3 tópicos e 2 exemplos pra cada.</p>
        <blockquote>Falar bem é praticar pequeno muitas vezes, não fazer perfeito uma vez.</blockquote>
      `
    },
    {
      title: "Como aprender vocabulário sem esquecer no dia seguinte",
      slug: "vocabulario-sem-esquecer",
      excerpt: "Um método prático: contexto + revisão curta + uso real no fuxico.",
      tags: ["vocabulario", "estudo"],
      status: "published",
      coverUrl: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1200&q=60",
      contentHtml: `
        <p>Palavra solta morre rápido. Palavra em frase vive.</p>
        <h2>Contexto primeiro</h2>
        <p>Crie uma frase sua com a palavra, do seu jeito.</p>
        <h2>Revisão em 2 minutos</h2>
        <p>Revise amanhã e daqui a 3 dias. Curto e constante.</p>
        <h2>Uso real</h2>
        <p>Leve a palavra para o encontro e use 2 vezes.</p>
      `
    },
    {
      title: "Temas bons pra fuxicar (e render conversa)",
      slug: "temas-para-fuxicar",
      excerpt: "Lista de temas leves e divertidos pra reuniões em inglês/espanhol/italiano.",
      tags: ["temas", "comunidade"],
      status: "draft",
      coverUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=60",
      contentHtml: `
        <p>Esse é um exemplo em <strong>rascunho</strong> (não aparece pro público).</p>
        <h2>Temas leves</h2>
        <ul>
          <li>Filme/serie da semana</li>
          <li>Comida favorita e receita</li>
          <li>Viagem que marcou</li>
        </ul>
        <h2>Temas que rendem</h2>
        <ul>
          <li>Um hábito que mudou sua vida</li>
          <li>Coisa que você aprendeu recentemente</li>
          <li>Um “mito” sobre aprender idiomas</li>
        </ul>
      `
    }
  ];

  try {
    for (const p of samples) {
      const ref = doc(db, POSTS_COL, p.slug);
      await setDoc(ref, {
        ...p,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        publishedAt: p.status === "published" ? serverTimestamp() : null,
      }, { merge: true });
    }

    adminMsg.textContent = "3 posts criados! Volte ao Blog para ver.";
    allLoadedPosts = [];
    lastDoc = null;
    await loadAdminList();
  } catch (err) {
    console.error(err);
    adminMsg.textContent = "Erro ao criar posts. Verifique Rules.";
  }
});

// === 14) AUTH STATE ===
onAuthStateChanged(auth, (user) => {
  // Moderador = logado com o email equivalente ao username permitido
  if (!user) {
    isModerator = false;
  } else {
    const allowedEmails = [...ALLOWED_USERNAMES].map(u => `${u}@${USERNAME_TO_EMAIL_DOMAIN}`);
    isModerator = allowedEmails.includes(user.email);
  }

  // se estiver lendo um draft, só moderador pode
  // e também mostra atalho no post
  adminQuickCard && show(adminQuickCard, isModerator);

  // atualiza UI atual
  const r = parseRoute();
  if (r.name === "admin") refreshAdminUI();
});

// === 15) BUSCA / FILTRO ===
searchInput?.addEventListener("input", () => {
  searchTerm = safeText(searchInput.value).trim().toLowerCase();
  renderPublicGrid();
});

loadMoreBtn?.addEventListener("click", fetchNextPage);

// === 16) START ===
go(parseRoute());
