/**
 * AI Ops for Real Estate — Cloudflare Worker
 *
 * Hybrid worker: handles dynamic routes (/blog, /blog/<slug>, /admin, /api/*,
 * /sitemap.xml, /feed.xml, /robots.txt) and falls through to the static asset
 * binding for everything else (the marketing site at /, /index.html, etc.).
 *
 * Cloudflare Access gates /admin and /api/posts mutating routes at the proxy
 * level — by the time a request reaches the Worker for those paths, identity
 * is already verified.
 */

const ROUTES = [
  ['GET',    /^\/$/,                    null], // fall-through to static
  ['GET',    /^\/blog\/?$/,              renderBlogIndex],
  ['GET',    /^\/blog\/([a-z0-9-]+)\/?$/, renderBlogPost],
  ['GET',    /^\/blog\/feed\.xml$/,      renderRssFeed],
  ['GET',    /^\/feed\.xml$/,            renderRssFeed],
  ['GET',    /^\/sitemap\.xml$/,         renderSitemap],
  ['GET',    /^\/robots\.txt$/,          renderRobots],
  ['GET',    /^\/admin\/?$/,             renderAdmin],
  ['GET',    /^\/api\/posts\/?$/,        apiListPosts],
  ['GET',    /^\/api\/posts\/([a-z0-9-]+)$/, apiGetPost],
  ['POST',   /^\/api\/posts\/?$/,        apiCreatePost],
  ['PUT',    /^\/api\/posts\/(\d+)$/,    apiUpdatePost],
  ['DELETE', /^\/api\/posts\/(\d+)$/,    apiDeletePost],
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const path = url.pathname;

    // Try dynamic routes first
    for (const [verb, pattern, handler] of ROUTES) {
      if (verb !== method) continue;
      const match = path.match(pattern);
      if (!match) continue;
      if (!handler) break; // explicit fall-through
      try {
        // ensure schema before any DB-touching handler
        if (handler !== renderRobots && handler !== renderAdmin) {
          await ensureSchema(env);
        }
        return await handler(request, env, ctx, match);
      } catch (e) {
        return jsonResponse({ error: String(e && e.stack || e) }, 500);
      }
    }

    // Fall through to static assets
    return env.ASSETS.fetch(request);
  }
};

// ---------------------------------------------------------------------------
// Schema bootstrap — runs once, idempotent
// ---------------------------------------------------------------------------

let _schemaReady = false;
async function ensureSchema(env) {
  if (_schemaReady) return;
  if (!env.DB) {
    _schemaReady = true; // no DB bound yet — let handlers degrade gracefully
    return;
  }
  await env.DB.batch([
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        excerpt TEXT,
        body_md TEXT NOT NULL,
        body_html TEXT NOT NULL,
        meta_description TEXT,
        og_image TEXT,
        tags_json TEXT DEFAULT '[]',
        status TEXT DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
        read_minutes INTEGER DEFAULT 1,
        published_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published ON blog_posts(status, published_at DESC)`),
  ]);
  _schemaReady = true;
}

// ---------------------------------------------------------------------------
// Blog index — list all published posts
// ---------------------------------------------------------------------------

async function renderBlogIndex(request, env) {
  const rows = env.DB
    ? (await env.DB.prepare(
        `SELECT slug, title, excerpt, published_at, read_minutes, tags_json
         FROM blog_posts WHERE status = 'published'
         ORDER BY published_at DESC LIMIT 100`
      ).all()).results
    : [];

  const cards = rows.length
    ? rows.map(p => `
        <a href="/blog/${escapeAttr(p.slug)}" class="post-card">
          <div class="post-card-meta">
            <span class="post-tag">Article</span>
            <span>${formatDate(p.published_at)}</span>
            <span>${p.read_minutes || 1} min read</span>
          </div>
          <h2>${escapeHtml(p.title)}</h2>
          <div class="excerpt">${escapeHtml(p.excerpt || '')}</div>
          <span class="read-more">Read</span>
        </a>`).join('')
    : `<div class="post-card" style="cursor:default">
         <div class="post-card-meta"><span class="post-tag">Coming soon</span></div>
         <h2>The first post is on its way</h2>
         <div class="excerpt">Field notes on building an AI ops layer for a real estate practice. Working drafts, post-mortems, and the playbook as it evolves.</div>
       </div>`;

  return htmlResponse(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Blog — AI Ops for Real Estate</title>
<meta name="description" content="Field notes on building and running an AI operations layer for a real estate practice. Real workflows, real tooling, real lessons.">
<link rel="canonical" href="${env.SITE_URL}/blog">
<meta property="og:title" content="Blog — AI Ops for Real Estate">
<meta property="og:description" content="Field notes on building and running an AI operations layer for a real estate practice.">
<meta property="og:url" content="${env.SITE_URL}/blog">
<meta property="og:type" content="website">
<meta property="og:image" content="${env.SITE_URL}/closingday-logo.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Blog — AI Ops for Real Estate">
<meta name="twitter:description" content="Field notes on building and running an AI operations layer for a real estate practice.">
<link rel="alternate" type="application/rss+xml" title="AI Ops for Real Estate" href="${env.SITE_URL}/blog/feed.xml">
<link rel="stylesheet" href="/blog.css">
</head>
<body>
${navHtml(env, 'blog')}
<main class="blog-wrap">
  <header class="blog-hero">
    <span class="blog-tag">Field Notes</span>
    <h1>Notes from building an AI ops practice</h1>
    <p>How the system actually runs. Edge cases, voice rules, persona corrections, and the things that broke before they worked.</p>
  </header>
  <div class="post-list">
    ${cards}
  </div>
</main>
${footerHtml(env)}
</body>
</html>`);
}

// ---------------------------------------------------------------------------
// Single post
// ---------------------------------------------------------------------------

async function renderBlogPost(request, env, ctx, match) {
  const slug = match[1];
  if (!env.DB) return htmlResponse('Not found', 404);
  const post = await env.DB
    .prepare(`SELECT * FROM blog_posts WHERE slug = ? AND status = 'published' LIMIT 1`)
    .bind(slug).first();

  if (!post) return htmlResponse('Not found', 404);

  const tags = safeParse(post.tags_json, []);
  const tagList = Array.isArray(tags) ? tags : [];
  const canonical = `${env.SITE_URL}/blog/${post.slug}`;
  const ogImage = post.og_image || `${env.SITE_URL}/closingday-logo.png`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.meta_description || post.excerpt || '',
    "image": ogImage,
    "datePublished": new Date((post.published_at || 0) * 1000).toISOString(),
    "dateModified": new Date((post.updated_at || 0) * 1000).toISOString(),
    "author": { "@type": "Person", "name": env.SITE_AUTHOR || "Ben Whetstone" },
    "publisher": {
      "@type": "Organization",
      "name": env.SITE_NAME || "AI Ops for Real Estate",
      "logo": { "@type": "ImageObject", "url": `${env.SITE_URL}/closingday-logo.png` }
    },
    "mainEntityOfPage": canonical,
    "keywords": tagList.join(', ')
  };

  return htmlResponse(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(post.title)} — AI Ops for Real Estate</title>
<meta name="description" content="${escapeAttr(post.meta_description || post.excerpt || '')}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${escapeAttr(post.title)}">
<meta property="og:description" content="${escapeAttr(post.meta_description || post.excerpt || '')}">
<meta property="og:url" content="${canonical}">
<meta property="og:type" content="article">
<meta property="og:image" content="${ogImage}">
<meta property="article:published_time" content="${new Date((post.published_at || 0) * 1000).toISOString()}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeAttr(post.title)}">
<meta name="twitter:description" content="${escapeAttr(post.meta_description || post.excerpt || '')}">
<meta name="twitter:image" content="${ogImage}">
<link rel="stylesheet" href="/blog.css">
<script type="application/ld+json">${JSON.stringify(articleSchema)}</script>
</head>
<body>
${navHtml(env)}
<main class="blog-wrap">
  <header class="post-header">
    <div class="post-meta">
      <span class="post-tag">Article</span>
      <span>${formatDate(post.published_at)}</span>
      <span>${post.read_minutes || 1} min read</span>
      ${tagList.map(t => `<span>#${escapeHtml(t)}</span>`).join('')}
    </div>
    <h1>${escapeHtml(post.title)}</h1>
    ${post.excerpt ? `<p class="lede">${escapeHtml(post.excerpt)}</p>` : ''}
  </header>
  <article class="post-article">
${post.body_html}
  </article>
  <aside class="post-cta">
    <h3>Want to see how this stack actually runs?</h3>
    <p>Closing Day is the live SaaS product I built with the same AI ops layer described on this site. Pipeline tracker, AI coach, calendar engine.</p>
    <div class="post-cta-row">
      <a href="https://closingday.info" target="_blank" rel="noopener" class="btn btn-primary">Visit Closing Day</a>
      <a href="/" class="btn btn-secondary">Back to home</a>
    </div>
  </aside>
</main>
${footerHtml(env)}
</body>
</html>`);
}

// ---------------------------------------------------------------------------
// /sitemap.xml — dynamic
// ---------------------------------------------------------------------------

async function renderSitemap(request, env) {
  const rows = env.DB
    ? (await env.DB.prepare(
        `SELECT slug, updated_at FROM blog_posts WHERE status = 'published'`
      ).all()).results
    : [];

  const staticUrls = [
    { loc: `${env.SITE_URL}/`, priority: 1.0 },
    { loc: `${env.SITE_URL}/#about`, priority: 0.6 },
    { loc: `${env.SITE_URL}/#skills`, priority: 0.7 },
    { loc: `${env.SITE_URL}/#start`, priority: 0.6 },
    { loc: `${env.SITE_URL}/#team`, priority: 0.6 },
    { loc: `${env.SITE_URL}/#closingday`, priority: 0.9 },
    { loc: `${env.SITE_URL}/blog`, priority: 0.8 },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls.map(u => `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`).join('\n')}
${rows.map(r => `  <url><loc>${env.SITE_URL}/blog/${r.slug}</loc><lastmod>${new Date((r.updated_at || 0) * 1000).toISOString()}</lastmod><priority>0.7</priority></url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600'
    }
  });
}

// ---------------------------------------------------------------------------
// /robots.txt — static-ish
// ---------------------------------------------------------------------------

function renderRobots(request, env) {
  const txt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${env.SITE_URL}/sitemap.xml
`;
  return new Response(txt, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' }
  });
}

// ---------------------------------------------------------------------------
// /blog/feed.xml — RSS
// ---------------------------------------------------------------------------

async function renderRssFeed(request, env) {
  const rows = env.DB
    ? (await env.DB.prepare(
        `SELECT slug, title, excerpt, body_html, published_at
         FROM blog_posts WHERE status = 'published'
         ORDER BY published_at DESC LIMIT 50`
      ).all()).results
    : [];

  const items = rows.map(p => `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${env.SITE_URL}/blog/${p.slug}</link>
      <guid>${env.SITE_URL}/blog/${p.slug}</guid>
      <pubDate>${new Date((p.published_at || 0) * 1000).toUTCString()}</pubDate>
      <description>${escapeXml(p.excerpt || '')}</description>
    </item>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escapeXml(env.SITE_NAME || 'AI Ops for Real Estate')}</title>
  <link>${env.SITE_URL}/blog</link>
  <description>Field notes on building and running an AI operations layer for a real estate practice.</description>
  <language>en-US</language>
  <atom:link href="${env.SITE_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />
  ${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=600' }
  });
}

// ---------------------------------------------------------------------------
// /admin — editor UI (gated by Cloudflare Access at the proxy)
// ---------------------------------------------------------------------------

function renderAdmin(request, env) {
  return htmlResponse(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin — AI Ops for Real Estate</title>
<meta name="robots" content="noindex,nofollow">
<link rel="stylesheet" href="/blog.css">
<style>
  body { background: var(--surface); }
  .admin-wrap { max-width: 1100px; margin: 0 auto; padding: 4rem 2rem; }
  .admin-hero { display: flex; justify-content: space-between; align-items: end; margin-bottom: 2rem; gap: 1rem; flex-wrap: wrap; }
  .admin-hero h1 { font-size: 2rem; font-weight: 900; letter-spacing: -0.02em; margin: 0; }
  .admin-hero p { color: var(--text-muted); margin: 0.4rem 0 0; }
  .btn-primary { background: var(--teal); color: #fff; padding: 10px 22px; border-radius: 10px; font-weight: 700; border: none; cursor: pointer; font-size: 0.92rem; transition: transform 0.2s; }
  .btn-primary:hover { transform: translateY(-2px); }
  .btn-secondary { background: #fff; color: var(--accent); border: 1px solid var(--border); padding: 10px 22px; border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 0.92rem; }
  .btn-danger { background: transparent; color: var(--rose); border: 1px solid var(--rose); padding: 6px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.82rem; }
  .post-table { background: #fff; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 2rem; }
  .post-row { display: grid; grid-template-columns: 1fr auto auto auto; gap: 1rem; align-items: center; padding: 1rem 1.4rem; border-bottom: 1px solid var(--border); }
  .post-row:last-child { border-bottom: none; }
  .post-row .title { font-weight: 700; }
  .post-row .meta { font-size: 0.82rem; color: var(--text-muted); }
  .status-badge { font-size: 0.7rem; font-weight: 700; padding: 3px 10px; border-radius: 99px; text-transform: uppercase; letter-spacing: 0.6px; }
  .status-draft { background: #fef3c7; color: #92400e; }
  .status-published { background: #d1fae5; color: #065f46; }
  .editor { background: #fff; border: 1px solid var(--border); border-radius: 14px; padding: 2rem; margin-top: 1rem; }
  .editor label { display: block; font-size: 0.82rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.6px; margin: 1rem 0 0.4rem; }
  .editor input, .editor textarea, .editor select { width: 100%; padding: 0.7rem 0.9rem; border: 1px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 0.95rem; background: #fff; }
  .editor textarea { resize: vertical; min-height: 280px; font-family: 'SF Mono', 'Fira Code', monospace; line-height: 1.6; }
  .editor .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .editor-actions { display: flex; gap: 0.6rem; margin-top: 1.4rem; flex-wrap: wrap; }
  .hint { font-size: 0.78rem; color: var(--text-muted); margin-top: 0.3rem; }
  .toast { position: fixed; bottom: 24px; right: 24px; background: var(--text); color: #fff; padding: 14px 20px; border-radius: 10px; box-shadow: 0 6px 24px rgba(0,0,0,0.15); opacity: 0; transition: opacity 0.3s, transform 0.3s; transform: translateY(10px); }
  .toast.show { opacity: 1; transform: translateY(0); }
  .toast.error { background: var(--rose); }
  @media (max-width: 720px) {
    .editor .row-2 { grid-template-columns: 1fr; }
    .post-row { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
${navHtml(env)}
<main class="admin-wrap">
  <header class="admin-hero">
    <div>
      <h1>Blog Admin</h1>
      <p>Drafts, published, scheduled. Cloudflare Access verifies you on every request.</p>
    </div>
    <button class="btn-primary" onclick="newPost()">+ New post</button>
  </header>
  <div id="postList" class="post-table"></div>
  <div id="editor" class="editor" style="display:none">
    <input type="hidden" id="postId">
    <label>Title</label>
    <input id="title" placeholder="Direct, hook-forward, &lt; 60 chars">
    <div class="row-2">
      <div>
        <label>Slug</label>
        <input id="slug" placeholder="lowercase-words-with-dashes">
        <div class="hint">URL: /blog/&lt;slug&gt;. Auto-derived from title if blank.</div>
      </div>
      <div>
        <label>Status</label>
        <select id="status">
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>
    </div>
    <label>Excerpt</label>
    <input id="excerpt" placeholder="One sentence. Goes on the index card and in og:description.">
    <label>Meta description (SEO)</label>
    <input id="metaDescription" placeholder="140-160 chars. Goes in &lt;meta name=description&gt;.">
    <label>Tags (comma-separated)</label>
    <input id="tags" placeholder="ai-ops, cloudflare, blogging">
    <label>Body (Markdown)</label>
    <textarea id="bodyMd" placeholder="# Heading

Body in Markdown. Headings, lists, links, code blocks."></textarea>
    <div class="hint">Markdown is rendered server-side on save. Preview the live URL after publish.</div>
    <div class="editor-actions">
      <button class="btn-primary" onclick="savePost()">Save</button>
      <button class="btn-secondary" onclick="cancelEdit()">Cancel</button>
      <button class="btn-secondary" id="previewBtn" onclick="previewPost()" style="display:none">Open live</button>
      <button class="btn-danger" id="deleteBtn" onclick="deletePost()" style="display:none">Delete</button>
    </div>
  </div>
</main>
<div id="toast" class="toast"></div>

<script>
let posts = [];
async function loadPosts() {
  try {
    const r = await fetch('/api/posts');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    posts = (await r.json()).posts || [];
    renderList();
  } catch (e) {
    toast('Could not load posts: ' + e.message, true);
  }
}
function renderList() {
  const wrap = document.getElementById('postList');
  if (!posts.length) {
    wrap.innerHTML = '<div class="post-row"><div><div class="title">No posts yet</div><div class="meta">Click + New post to get started.</div></div></div>';
    return;
  }
  wrap.innerHTML = posts.map(p => {
    const date = p.published_at
      ? new Date(p.published_at*1000).toISOString().slice(0,10)
      : 'unpublished';
    return '<div class="post-row">' +
      '<div><div class="title">' + escapeHtml(p.title) + '</div><div class="meta">/blog/' + escapeHtml(p.slug) + ' &middot; ' + date + '</div></div>' +
      '<span class="status-badge status-' + p.status + '">' + p.status + '</span>' +
      '<button class="btn-secondary" onclick="editPost(' + p.id + ')">Edit</button>' +
      '<a class="btn-secondary" href="/blog/' + encodeURIComponent(p.slug) + '" target="_blank">View</a>' +
    '</div>';
  }).join('');
}
function newPost() {
  document.getElementById('postId').value = '';
  document.getElementById('title').value = '';
  document.getElementById('slug').value = '';
  document.getElementById('status').value = 'draft';
  document.getElementById('excerpt').value = '';
  document.getElementById('metaDescription').value = '';
  document.getElementById('tags').value = '';
  document.getElementById('bodyMd').value = '';
  document.getElementById('deleteBtn').style.display = 'none';
  document.getElementById('previewBtn').style.display = 'none';
  document.getElementById('editor').style.display = 'block';
  document.getElementById('editor').scrollIntoView({behavior:'smooth',block:'start'});
}
async function editPost(id) {
  try {
    const p = posts.find(x => x.id === id);
    if (!p) return;
    document.getElementById('postId').value = p.id;
    document.getElementById('title').value = p.title || '';
    document.getElementById('slug').value = p.slug || '';
    document.getElementById('status').value = p.status || 'draft';
    document.getElementById('excerpt').value = p.excerpt || '';
    document.getElementById('metaDescription').value = p.meta_description || '';
    document.getElementById('tags').value = (p.tags || []).join(', ');
    // Body fetch (full row)
    const r = await fetch('/api/posts/' + encodeURIComponent(p.slug));
    const full = (await r.json()).post;
    document.getElementById('bodyMd').value = full.body_md || '';
    document.getElementById('deleteBtn').style.display = 'inline-block';
    document.getElementById('previewBtn').style.display = p.status === 'published' ? 'inline-block' : 'none';
    document.getElementById('editor').style.display = 'block';
    document.getElementById('editor').scrollIntoView({behavior:'smooth',block:'start'});
  } catch (e) { toast('Edit load failed: ' + e.message, true); }
}
function cancelEdit() {
  document.getElementById('editor').style.display = 'none';
}
async function savePost() {
  const id = document.getElementById('postId').value;
  const body = {
    title: document.getElementById('title').value.trim(),
    slug: document.getElementById('slug').value.trim(),
    status: document.getElementById('status').value,
    excerpt: document.getElementById('excerpt').value.trim(),
    meta_description: document.getElementById('metaDescription').value.trim(),
    tags: document.getElementById('tags').value.split(',').map(s => s.trim()).filter(Boolean),
    body_md: document.getElementById('bodyMd').value
  };
  if (!body.title) { toast('Title required', true); return; }
  if (!body.body_md) { toast('Body required', true); return; }
  try {
    const url = id ? '/api/posts/' + id : '/api/posts';
    const method = id ? 'PUT' : 'POST';
    const r = await fetch(url, { method, headers: {'content-type':'application/json'}, body: JSON.stringify(body) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || ('HTTP ' + r.status));
    toast('Saved!');
    document.getElementById('editor').style.display = 'none';
    loadPosts();
  } catch (e) { toast('Save failed: ' + e.message, true); }
}
async function deletePost() {
  const id = document.getElementById('postId').value;
  if (!id) return;
  if (!confirm('Delete this post? This cannot be undone.')) return;
  try {
    const r = await fetch('/api/posts/' + id, { method: 'DELETE' });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'HTTP ' + r.status); }
    toast('Deleted');
    document.getElementById('editor').style.display = 'none';
    loadPosts();
  } catch (e) { toast('Delete failed: ' + e.message, true); }
}
function previewPost() {
  const slug = document.getElementById('slug').value;
  if (slug) window.open('/blog/' + encodeURIComponent(slug), '_blank');
}
function toast(msg, isError) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => { t.className = 'toast' + (isError ? ' error' : ''); }, 3000);
}
function escapeHtml(s) { return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
loadPosts();
</script>
</body>
</html>`);
}

// ---------------------------------------------------------------------------
// API: posts CRUD
// ---------------------------------------------------------------------------

async function apiListPosts(request, env) {
  if (!env.DB) return jsonResponse({ posts: [] });
  const rows = (await env.DB.prepare(
    `SELECT id, slug, title, excerpt, meta_description, tags_json, status, read_minutes, published_at, updated_at
     FROM blog_posts ORDER BY COALESCE(published_at, updated_at) DESC LIMIT 200`
  ).all()).results;
  const posts = rows.map(r => ({
    id: r.id, slug: r.slug, title: r.title, excerpt: r.excerpt,
    meta_description: r.meta_description,
    tags: safeParse(r.tags_json, []),
    status: r.status, read_minutes: r.read_minutes,
    published_at: r.published_at, updated_at: r.updated_at
  }));
  return jsonResponse({ posts });
}

async function apiGetPost(request, env, ctx, match) {
  if (!env.DB) return jsonResponse({ error: 'no DB bound' }, 500);
  const slug = match[1];
  const row = await env.DB.prepare(
    `SELECT * FROM blog_posts WHERE slug = ? LIMIT 1`
  ).bind(slug).first();
  if (!row) return jsonResponse({ error: 'not found' }, 404);
  return jsonResponse({
    post: {
      ...row,
      tags: safeParse(row.tags_json, [])
    }
  });
}

async function apiCreatePost(request, env) {
  if (!env.DB) return jsonResponse({ error: 'no DB bound' }, 500);
  const body = await request.json();
  if (!body.title || !body.body_md) return jsonResponse({ error: 'title and body_md required' }, 400);
  const slug = (body.slug || slugify(body.title)).slice(0, 80);
  const html = mdToHtml(body.body_md);
  const readMinutes = Math.max(1, Math.round(body.body_md.split(/\s+/).length / 220));
  const now = Math.floor(Date.now() / 1000);
  const publishedAt = body.status === 'published' ? now : null;

  try {
    await env.DB.prepare(
      `INSERT INTO blog_posts (slug, title, excerpt, body_md, body_html, meta_description, og_image, tags_json, status, read_minutes, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      slug, body.title, body.excerpt || '', body.body_md, html,
      body.meta_description || '', body.og_image || null,
      JSON.stringify(body.tags || []),
      body.status || 'draft', readMinutes, publishedAt, now, now
    ).run();
  } catch (e) {
    if (String(e).includes('UNIQUE')) return jsonResponse({ error: 'slug already exists' }, 409);
    throw e;
  }
  return jsonResponse({ ok: true, slug });
}

async function apiUpdatePost(request, env, ctx, match) {
  if (!env.DB) return jsonResponse({ error: 'no DB bound' }, 500);
  const id = parseInt(match[1], 10);
  const body = await request.json();
  const existing = await env.DB.prepare(`SELECT * FROM blog_posts WHERE id = ?`).bind(id).first();
  if (!existing) return jsonResponse({ error: 'not found' }, 404);

  const slug = (body.slug || existing.slug).slice(0, 80);
  const html = body.body_md ? mdToHtml(body.body_md) : existing.body_html;
  const readMinutes = body.body_md
    ? Math.max(1, Math.round(body.body_md.split(/\s+/).length / 220))
    : existing.read_minutes;
  const now = Math.floor(Date.now() / 1000);
  const wantPublished = body.status === 'published';
  const publishedAt = wantPublished
    ? (existing.published_at || now)
    : (body.status === 'draft' || body.status === 'archived' ? null : existing.published_at);

  try {
    await env.DB.prepare(
      `UPDATE blog_posts SET
        slug = ?, title = ?, excerpt = ?, body_md = ?, body_html = ?,
        meta_description = ?, og_image = ?, tags_json = ?, status = ?,
        read_minutes = ?, published_at = ?, updated_at = ?
       WHERE id = ?`
    ).bind(
      slug,
      body.title || existing.title,
      body.excerpt !== undefined ? body.excerpt : existing.excerpt,
      body.body_md || existing.body_md,
      html,
      body.meta_description !== undefined ? body.meta_description : existing.meta_description,
      body.og_image !== undefined ? body.og_image : existing.og_image,
      JSON.stringify(body.tags || safeParse(existing.tags_json, [])),
      body.status || existing.status,
      readMinutes,
      publishedAt,
      now,
      id
    ).run();
  } catch (e) {
    if (String(e).includes('UNIQUE')) return jsonResponse({ error: 'slug already exists' }, 409);
    throw e;
  }
  return jsonResponse({ ok: true, slug });
}

async function apiDeletePost(request, env, ctx, match) {
  if (!env.DB) return jsonResponse({ error: 'no DB bound' }, 500);
  const id = parseInt(match[1], 10);
  await env.DB.prepare(`DELETE FROM blog_posts WHERE id = ?`).bind(id).run();
  return jsonResponse({ ok: true });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate'
    }
  });
}
function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}
function safeParse(s, fallback) {
  try { return JSON.parse(s); } catch { return fallback; }
}
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }
function escapeXml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'
  }[c]));
}
function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function slugify(s) {
  return String(s).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// Minimal Markdown -> HTML. Handles headings, lists, paragraphs, bold/italic,
// links, code blocks, inline code, blockquotes, hr. Anything more advanced
// can be added later.
function mdToHtml(md) {
  if (!md) return '';
  // Normalize line endings
  let s = String(md).replace(/\r\n?/g, '\n');

  // Code fences ``` ```
  s = s.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code${lang ? ` class="language-${escapeAttr(lang)}"` : ''}>${escapeHtml(code)}</code></pre>`
  );

  // Split into blocks
  const blocks = s.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);

  const out = blocks.map(block => {
    // Skip already-rendered <pre> blocks
    if (/^<pre>/.test(block)) return block;
    // Horizontal rule
    if (/^---+$/.test(block)) return '<hr>';
    // Headings
    if (/^# /.test(block)) return `<h2>${inlineMd(block.replace(/^# /, ''))}</h2>`;
    if (/^## /.test(block)) return `<h2>${inlineMd(block.replace(/^## /, ''))}</h2>`;
    if (/^### /.test(block)) return `<h3>${inlineMd(block.replace(/^### /, ''))}</h3>`;
    if (/^#### /.test(block)) return `<h4>${inlineMd(block.replace(/^#### /, ''))}</h4>`;
    // Blockquote
    if (/^> /.test(block)) {
      return '<blockquote>' + block.split('\n').map(l => inlineMd(l.replace(/^> ?/, ''))).join(' ') + '</blockquote>';
    }
    // Unordered list
    if (/^[-*] /.test(block)) {
      const items = block.split('\n').map(l => l.replace(/^[-*] /, '')).filter(Boolean);
      return '<ul>' + items.map(i => `<li>${inlineMd(i)}</li>`).join('') + '</ul>';
    }
    // Ordered list
    if (/^\d+\. /.test(block)) {
      const items = block.split('\n').map(l => l.replace(/^\d+\. /, '')).filter(Boolean);
      return '<ol>' + items.map(i => `<li>${inlineMd(i)}</li>`).join('') + '</ol>';
    }
    // Paragraph (single break -> <br>)
    return '<p>' + inlineMd(block.replace(/\n/g, '<br>')) + '</p>';
  }).join('\n');

  return out;
}
function inlineMd(s) {
  if (!s) return '';
  let out = escapeHtml(s);
  // Inline code first to protect from other replacements
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Links [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => `<a href="${escapeAttr(url)}">${text}</a>`);
  // Bold **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic *text*
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  return out;
}

// Shared nav (matches the marketing site)
function navHtml(env, currentSection) {
  const nav = [
    ['/', 'Home', null],
    ['/#skills', 'What It Does', 'skills'],
    ['/#start', 'Get Started', 'start'],
    ['/#team', 'The Team', 'team'],
    ['/#closingday', 'Closing Day', 'closingday'],
    ['/blog', 'Blog', 'blog'],
    ['/#contact', 'Contact', 'contact'],
  ];
  return `<nav>
  <div class="nav-inner">
    <a href="/" class="logo"><span>${escapeHtml(env.SITE_NAME || 'AI Ops for Real Estate')}</span></a>
    <button class="hamburger" onclick="document.querySelector('nav ul').classList.toggle('open')" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
    <ul>
      ${nav.map(([href, label, key]) => `<li><a href="${href}" class="${key === currentSection ? 'current' : ''}">${label}</a></li>`).join('')}
    </ul>
  </div>
</nav>`;
}

function footerHtml(env) {
  return `<footer>
  <p>${escapeHtml(env.SITE_NAME || 'AI Ops for Real Estate')} &middot; A case study by <a href="/">${escapeHtml(env.SITE_AUTHOR || 'Ben Whetstone')}</a></p>
  <p>Built with the same agentic-AI stack documented at <a href="/">aiopsforrealestate.com</a> and shipping <a href="https://closingday.info" target="_blank" rel="noopener">closingday.info</a>.</p>
</footer>`;
}
