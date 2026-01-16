:root{
  --b-ink: #0b1220;
  --b-muted: rgba(11,18,32,.68);
  --b-primary: #1e3a8a;
  --b-accent: #dc2626;
  --b-shadow: 0 18px 40px rgba(0,0,0,.08);
  --b-shadow-soft: 0 10px 30px rgba(0,0,0,.06);
  --b-radius: 22px;
}

.blog-shell{
  padding: 0 10% 70px;
}

/* HERO */
.blog-hero{
  border-radius: 26px;
  background: linear-gradient(120deg, rgba(219,234,254,.88), rgba(255,255,255,.95));
  box-shadow: var(--b-shadow-soft);
  border: 1px solid rgba(2,6,23,.06);
  overflow: hidden;
}

.blog-hero-inner{
  display:grid;
  grid-template-columns: 1.2fr .8fr;
  gap: 22px;
  align-items: center;
}

.blog-hero-left h1{
  margin: 0;
  font-size: clamp(30px, 4vw, 52px);
  color: var(--b-primary);
  letter-spacing: -0.02em;
}

.blog-lead{
  margin: 10px 0 0;
  font-size: clamp(14px, 1.2vw, 18px);
  color: var(--b-muted);
  line-height: 1.65;
  max-width: 62ch;
}

.blog-cta-row{
  display:flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
  align-items: center;
}

.blog-pill{
  display:inline-flex;
  align-items:center;
  gap:10px;
  padding: 12px 16px;
  border-radius: 999px;
  background: rgba(255,255,255,.82);
  border: 1px solid rgba(30,58,138,.12);
  box-shadow: var(--b-shadow-soft);
}

.blog-search{
  flex: 1 1 260px;
  display:flex;
  align-items:center;
  gap:10px;
  padding: 12px 14px;
  border-radius: 999px;
  background: rgba(255,255,255,.9);
  border: 1px solid rgba(30,58,138,.14);
  box-shadow: var(--b-shadow-soft);
}

.blog-search input{
  border:0;
  outline:0;
  background:transparent;
  width:100%;
  font-size: 14px;
  font-family: inherit;
}

.blog-chips{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
  margin-top:16px;
}

.blog-chip{
  cursor:pointer;
  user-select:none;
  padding:10px 14px;
  border-radius:999px;
  border: 1px solid rgba(30,58,138,.14);
  background: rgba(255,255,255,.78);
  color: var(--b-primary);
  font-weight: 600;
  transition: transform .25s ease, box-shadow .25s ease, background .25s ease;
}
.blog-chip:hover{
  transform: translateY(-2px);
  box-shadow: var(--b-shadow-soft);
}
.blog-chip[aria-pressed="true"]{
  background: rgba(30,58,138,.12);
  border-color: rgba(30,58,138,.22);
}

/* Card do hero */
.blog-hero-card{
  text-align:left;
  border-radius: 26px;
  overflow:hidden;
}
.blog-hero-card-title{ margin:0; color: var(--b-primary); }
.blog-hero-card-text{ margin: 10px 0 0; color: rgba(11,18,32,.72); line-height: 1.6; }
.blog-hero-card-cta{ margin-top: 16px; }

/* GRID: mais alinhado */
.blog-grid{
  margin-top: 22px;
  display:grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 22px;
  align-items: stretch;
}

/* CARD: premium + consistente */
.post-card{
  position:relative;
  overflow:hidden;
  background: #fff;
  border-radius: var(--b-radius);
  box-shadow: var(--b-shadow-soft);
  border: 1px solid rgba(2,6,23,.06);
  transition: transform .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s ease;
  display:flex;
  flex-direction:column;
  min-height: 380px;
}
.post-card:hover{
  transform: translateY(-7px);
  box-shadow: var(--b-shadow);
}

/* capa padronizada */
.post-cover{
  height: 180px;
  background: linear-gradient(120deg, rgba(30,58,138,.12), rgba(220,38,38,.10));
}
.post-cover img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
  transform: scale(1.02);
  transition: transform .5s ease;
}
.post-card:hover .post-cover img{ transform: scale(1.07); }

/* corpo com alinhamento */
.post-body{
  padding: 16px 16px 18px;
  display:flex;
  flex-direction:column;
  gap: 10px;
  flex:1;
}

.post-meta{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  color: rgba(11,18,32,.58);
  font-size: 12px;
  align-items:center;
}

.post-title{
  margin: 0;
  font-size: 18px;
  letter-spacing:-.01em;
  color: var(--b-ink);
  line-height:1.25;
  display:-webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow:hidden;
  min-height: 46px; /* deixa títulos alinhados */
}

.post-excerpt{
  margin:0;
  color: rgba(11,18,32,.70);
  font-size: 13.5px;
  line-height:1.65;
  display:-webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow:hidden;
  min-height: 68px;
}

.post-tags{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  margin-top:auto; /* empurra tags pro fim e alinha todos */
}

.post-tag{
  font-size: 12px;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(30,58,138,.08);
  color: var(--b-primary);
  font-weight:600;
  border: 1px solid rgba(30,58,138,.10);
}

/* link invisível */
.post-link{
  position:absolute;
  inset:0;
  text-indent: -9999px;
}

/* Reveal */
.reveal{
  opacity:0;
  transform: translateY(18px) scale(.985);
  filter: blur(6px);
}
.reveal.is-in{
  opacity:1;
  transform: translateY(0) scale(1);
  filter: blur(0);
  transition: opacity .7s ease, transform .7s cubic-bezier(.2,.7,.2,1), filter .7s ease;
}

/* Skeleton */
.skeleton{
  position:relative;
  overflow:hidden;
  background: #fff;
  border-radius: var(--b-radius);
  border: 1px solid rgba(2,6,23,.06);
  box-shadow: var(--b-shadow-soft);
}
.skeleton .sk-cover{height:180px;background:#e5e7eb;}
.skeleton .sk-body{padding:16px;}
.skeleton .sk-line{height:12px;background:#e5e7eb;border-radius:999px;margin-top:12px;}
.skeleton .sk-line.w40{width:40%;}
.skeleton .sk-line.w65{width:65%;}
.skeleton .sk-line.w85{width:85%;}
.skeleton::after{
  content:"";
  position:absolute;
  inset:0;
  transform: translateX(-120%);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent);
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer{to{transform: translateX(120%);}}

/* Botão */
.blog-actions{display:flex;justify-content:center;margin: 22px 0 0;}
.blog-btn{
  appearance:none;
  border:0;
  cursor:pointer;
  background: var(--b-accent);
  color: #fff;
  padding: 12px 18px;
  border-radius: 999px;
  font-weight: 700;
  box-shadow: 0 14px 30px rgba(220,38,38,.22);
  transition: transform .25s ease, box-shadow .25s ease, filter .25s ease;
}
.blog-btn:hover{
  transform: translateY(-2px);
  box-shadow: 0 18px 36px rgba(220,38,38,.26);
}
.blog-btn:disabled{
  opacity:.55;
  cursor:not-allowed;
  filter: grayscale(.2);
  transform:none;
  box-shadow:none;
}

.blog-empty{ text-align:center; color: rgba(11,18,32,.65); margin: 14px 0 0; }

/* POST PAGE: mais “editorial” */
.read-progress{
  position:fixed;
  left:0;
  top:0;
  height:3px;
  width:0;
  background: var(--b-accent);
  z-index: 9999;
}

.post-shell{ padding: 0 10% 70px; }

.post-wrap{
  display:grid;
  grid-template-columns: 1fr 320px;
  gap: 22px;
  align-items:start;
}

.article{
  background: #fff;
  border-radius: 26px;
  box-shadow: var(--b-shadow-soft);
  border: 1px solid rgba(2,6,23,.06);
  overflow:hidden;
}

/* Cabeçalho do artigo com “hero” */
.article-head{
  padding: 26px 26px 0;
  position:relative;
}
.article-head::before{
  content:"";
  position:absolute;
  left:0; right:0; top:0;
  height: 150px;
  background: linear-gradient(120deg, rgba(30,58,138,.12), rgba(220,38,38,.08));
  pointer-events:none;
}
.article-head > *{ position:relative; }

.article h1{
  margin: 10px 0 0;
  color:var(--b-ink);
  font-size: clamp(26px, 3vw, 42px);
  letter-spacing:-.02em;
}
.article .sub{
  margin: 10px 0 0;
  color: rgba(11,18,32,.70);
  line-height:1.75;
  max-width: 70ch;
}

.article-cover{
  margin-top:18px;
  border-radius: 18px;
  overflow:hidden;
  box-shadow: 0 18px 40px rgba(0,0,0,.10);
}
.article-cover img{
  width:100%;
  display:block;
  max-height: 420px;
  object-fit:cover;
}

.article-body{
  padding: 18px 26px 26px;
  color: var(--b-ink);
  max-width: 78ch;
}
.article-body :is(p,li){
  color: rgba(11,18,32,.84);
  line-height:1.9;
}
.article-body h2{
  margin-top: 28px;
  color: var(--b-primary);
  letter-spacing:-.01em;
}
.article-body h3{
  margin-top: 20px;
  color: var(--b-ink);
}
.article-body a{ color: var(--b-primary); font-weight:700; text-decoration:none; }
.article-body a:hover{ text-decoration: underline; }

.article-body blockquote{
  margin: 18px 0;
  padding: 14px 16px;
  border-left: 4px solid rgba(30,58,138,.35);
  background: rgba(30,58,138,.06);
  border-radius: 16px;
}

.aside{
  position: sticky;
  top: 98px;
  display:flex;
  flex-direction:column;
  gap: 14px;
}

.aside-card{
  background: rgba(255,255,255,.9);
  border: 1px solid rgba(30,58,138,.12);
  border-radius: var(--b-radius);
  box-shadow: var(--b-shadow-soft);
  padding: 14px;
  backdrop-filter: blur(8px);
}
.aside-card h4{ margin:0 0 8px; color: var(--b-primary); }

.toc{ margin:0; padding-left: 18px; }
.toc li{ margin: 8px 0; }
.toc a{ color: rgba(11,18,32,.8); font-weight:600; text-decoration:none; }
.toc a:hover{ color: var(--b-primary); text-decoration: underline; }

/* motion prefs */
@media (prefers-reduced-motion: reduce){
  .reveal, .reveal.is-in{
    transition:none !important;
    transform:none !important;
    filter:none !important;
    opacity:1 !important;
  }
  .skeleton::after{ animation:none !important; }
  .post-card, .post-card:hover, .blog-btn, .blog-btn:hover{
    transition:none !important;
    transform:none !important;
  }
}

@media (max-width: 980px){
  .blog-shell, .post-shell{
    padding-left: 20px;
    padding-right: 20px;
  }
  .blog-hero-inner{ grid-template-columns: 1fr; }
  .post-wrap{ grid-template-columns: 1fr; }
  .aside{ position:relative; top:0; }
  .article-body{ max-width: none; }
}
