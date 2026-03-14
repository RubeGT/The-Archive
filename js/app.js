/**
 * ARG Wiki - Main Application
 * Handles routing, search, puzzles, and mysterious interactions
 */

// === State ===
let articlesData = [];
let hiddenData = {};
let puzzleState = {};

// Initialize puzzle state from localStorage
function loadPuzzleState() {
  try {
    const saved = localStorage.getItem('arg_puzzle_state');
    if (saved) puzzleState = JSON.parse(saved);
  } catch (e) {}
}

function savePuzzleState() {
  try {
    localStorage.setItem('arg_puzzle_state', JSON.stringify(puzzleState));
  } catch (e) {}
}

// === Data Loading ===
async function loadArticles() {
  try {
    const res = await fetch('data/articles.json');
    const data = await res.json();
    articlesData = data.articles || [];
    hiddenData = {
      hiddenArticles: data.hiddenArticles || [],
      ...data
    };
    return data;
  } catch (e) {
    console.error('Failed to load articles:', e);
    articlesData = [];
    return { articles: [] };
  }
}

// === Routing (Hash-based for static hosting) ===
function getCurrentRoute() {
  const hash = window.location.hash.slice(1) || 'index';
  return hash;
}

function navigateTo(route) {
  window.location.hash = route;
  renderPage();
}

// === Page Rendering ===
async function renderPage() {
  const route = getCurrentRoute();
  const container = document.getElementById('main-content');
  if (!container) return;

  loadPuzzleState();

  if (route === 'index' || route === '') {
    renderIndex(container);
  } else if (route.startsWith('article/')) {
    const id = route.replace('article/', '');
    renderArticle(container, id);
  } else if (route.startsWith('hidden/')) {
    const id = route.replace('hidden/', '');
    renderHiddenPage(container, id);
  } else if (route === 'admin') {
    renderAdmin(container);
  } else if (route === 'error') {
    renderFakeError(container);
  } else {
    render404(container);
  }

  // Re-attach event listeners
  attachGlobalListeners();
}

// === Index Page ===
function renderIndex(container) {
  const filtered = document.getElementById('search-input')?.value
    ? filterArticles(articlesData, document.getElementById('search-input').value)
    : articlesData;

  container.innerHTML = `
    <div class="wiki-header">
      <h1 class="wiki-title">THE ARCHIVE</h1>
      <p class="wiki-subtitle">CLASSIFIED DOCUMENTATION • LAST UPDATE: [REDACTED]</p>
    </div>
    <div class="search-container">
      <input type="text" id="search-input" class="search-bar" placeholder="Search the archive..." />
    </div>
    <ul class="article-list">
      ${filtered.map(a => `
        <li class="article-item">
          <a href="#article/${a.id}">${escapeHtml(a.title)}</a>
          <div class="article-meta">${a.date} • ${a.category}</div>
        </li>
      `).join('')}
    </ul>
    <footer class="wiki-footer">
      ${articlesData.length} entries indexed. Some files may be restricted.
    </footer>
  `;

  // Search on input
  document.getElementById('search-input')?.addEventListener('input', (e) => {
    renderIndex(container);
    document.getElementById('search-input').value = e.target.value;
  });
}

// === Article Page ===
function renderArticle(container, id) {
  const article = articlesData.find(a => a.id === id);
  if (!article) {
    render404(container);
    return;
  }

  container.innerHTML = `
    <div class="wiki-header">
      <a href="#index" style="font-size: 0.8rem; margin-bottom: 1rem; display: inline-block;">← Back to index</a>
      <h1 class="wiki-title">${escapeHtml(article.title)}</h1>
      <div class="article-date">${article.date} • ${article.category}</div>
    </div>
    <div class="article-content">
      ${article.content}
    </div>
    <footer class="wiki-footer">
      Document ID: ${article.id}
    </footer>
  `;

  // Process special elements
  processSecretLinks(container);
  processBase64Hints(container);

  // Track viewing for puzzle
  if (!puzzleState.viewedArticles) puzzleState.viewedArticles = [];
  if (!puzzleState.viewedArticles.includes(id)) {
    puzzleState.viewedArticles.push(id);
    savePuzzleState();
  }
}

// === Hidden Pages ===
function renderHiddenPage(container, id) {
  const hidden = hiddenData.hiddenArticles?.find(a => a.id === id);

  if (id === 'corrupted') {
    renderCorruptedPage(container);
    return;
  }

  if (!hidden) {
    render404(container);
    return;
  }

  if (hidden.requiresPassword && !puzzleState[`unlocked_${id}`]) {
    renderPasswordGate(container, id, hidden);
    return;
  }

  if (hidden.requiresUnlock && !puzzleState[hidden.unlockKey]) {
    container.innerHTML = `
      <div class="wiki-header">
        <h1 class="wiki-title">ACCESS DENIED</h1>
        <p>Required clearance not obtained.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="wiki-header">
      <a href="#index">← Back to index</a>
      <h1 class="wiki-title">${escapeHtml(hidden.title || 'Restricted')}</h1>
    </div>
    <div class="article-content">
      ${hidden.content}
    </div>
  `;

  processSecretLinks(container);
}

// === Password Gate ===
function renderPasswordGate(container, id, hidden) {
  container.innerHTML = `
    <div class="wiki-header">
      <h1 class="wiki-title">RESTRICTED ACCESS</h1>
      <p class="wiki-subtitle">Password required</p>
    </div>
    <div class="article-content">
      <p>This document is classified. Enter the passphrase:</p>
      <input type="password" id="password-input" placeholder="Passphrase" />
      <button id="password-submit" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--accent-red); border: none; color: white; cursor: pointer; font-family: inherit;">Verify</button>
      <p id="password-error" style="color: var(--accent-red); font-size: 0.8rem; margin-top: 0.5rem; display: none;">Incorrect.</p>
    </div>
  `;

  document.getElementById('password-submit')?.addEventListener('click', () => {
    const input = document.getElementById('password-input')?.value?.toLowerCase().trim();
    const correct = (hidden.password || '').toLowerCase();
    if (input === correct) {
      puzzleState[`unlocked_${id}`] = true;
      savePuzzleState();
      renderHiddenPage(container, id);
    } else {
      const err = document.getElementById('password-error');
      if (err) {
        err.style.display = 'block';
        setTimeout(() => { err.style.display = 'none'; }, 2000);
      }
    }
  });

  document.getElementById('password-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('password-submit')?.click();
  });
}

// === Corrupted Page ===
function renderCorruptedPage(container) {
  container.innerHTML = `
    <div class="corrupted-page">
      <div class="corrupted-text">FILE CORRUPTED</div>
      <div class="corrupted-text" style="font-size: 1rem; margin-top: 1rem;">ERROR 0x7F3A: Index violation</div>
      <button class="corrupted-escape" id="corrupted-escape">[ CLICK TO ESCAPE ]</button>
    </div>
  `;

  const btn = document.getElementById('corrupted-escape');
  let clickCount = 0;
  btn?.addEventListener('click', () => {
    clickCount++;
    if (clickCount >= 3) {
      puzzleState.puzzle_complete = true;
      savePuzzleState();
      navigateTo('hidden/beyond');
    } else {
      btn.textContent = `[ ${3 - clickCount} more... ]`;
    }
  });
}

// === Fake Error Page (ARG element) ===
function renderFakeError(container) {
  container.innerHTML = `
    <div class="corrupted-page" style="animation: none;">
      <div class="corrupted-text">SYSTEM ERROR 0x5F</div>
      <div style="font-size: 0.9rem; margin-top: 1rem; color: var(--text-muted);">Connection refused. Database unreachable.</div>
      <div style="font-size: 0.75rem; margin-top: 2rem;">This page was not supposed to load. <a href="#index">Index</a></div>
    </div>
  `;
}

// === 404 ===
function render404(container) {
  container.innerHTML = `
    <div class="wiki-header">
      <h1 class="wiki-title">404</h1>
      <p class="wiki-subtitle">Document not found. It may have been redacted.</p>
    </div>
    <div class="article-content">
      <p>The requested file does not exist in this archive. <a href="#index">Return to index</a>.</p>
    </div>
  `;
}

// === Admin Panel ===
function renderAdmin(container) {
  container.innerHTML = `
    <div class="wiki-header">
      <h1 class="wiki-title">ADMIN</h1>
      <p class="wiki-subtitle">Content management</p>
    </div>
    <div class="article-content">
      <p>Add new article (saved to localStorage for demo - export to JSON for production):</p>
      <label>ID: <input type="text" id="admin-id" placeholder="my-article" /></label><br/>
      <label>Title: <input type="text" id="admin-title" placeholder="Article Title" /></label><br/>
      <label>Date: <input type="text" id="admin-date" placeholder="YYYY-MM-DD" /></label><br/>
      <label>Category: <input type="text" id="admin-category" placeholder="category" /></label><br/>
      <label>Content: <textarea id="admin-content" rows="6" placeholder="HTML content..."></textarea></label><br/>
      <button id="admin-save" style="padding: 0.5rem 1rem; background: var(--accent-red); border: none; color: white; cursor: pointer; font-family: inherit;">Save Article</button>
      <p id="admin-msg" style="margin-top: 1rem; font-size: 0.8rem;"></p>
    </div>
  `;

  document.getElementById('admin-save')?.addEventListener('click', () => {
    const id = document.getElementById('admin-id')?.value?.trim();
    const title = document.getElementById('admin-title')?.value?.trim();
    const date = document.getElementById('admin-date')?.value?.trim() || new Date().toISOString().slice(0, 10);
    const category = document.getElementById('admin-category')?.value?.trim() || 'misc';
    const content = document.getElementById('admin-content')?.value?.trim();
    if (!id || !title || !content) {
      document.getElementById('admin-msg').textContent = 'ID, title, and content required.';
      return;
    }
    const newArticle = { id, title, date, category, visible: true, content, clue: null };
    articlesData.push(newArticle);
    localStorage.setItem('arg_articles_extra', JSON.stringify(articlesData.filter(a => !hiddenData.articles?.find(x => x.id === a.id))));
    document.getElementById('admin-msg').textContent = 'Saved! (localStorage - add to data/articles.json for persistence)';
  });
}

// === Utilities ===
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function filterArticles(articles, query) {
  if (!query.trim()) return articles;
  const q = query.toLowerCase();
  return articles.filter(a =>
    a.title?.toLowerCase().includes(q) ||
    a.content?.toLowerCase().includes(q) ||
    a.category?.toLowerCase().includes(q)
  );
}

function processSecretLinks(container) {
  container?.querySelectorAll('.secret-link').forEach(el => {
    const href = el.getAttribute('data-href');
    if (href) {
      el.href = href;
      el.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = href.replace('#', '');
        renderPage();
      });
    }
  });
}

function processBase64Hints(container) {
  container?.querySelectorAll('.base64-hint').forEach(el => {
    el.title = 'Try decoding this (base64)';
    el.addEventListener('click', () => {
      try {
        const decoded = atob(el.textContent);
        alert(`Decoded: ${decoded}`);
      } catch (e) {
        alert('Invalid encoding.');
      }
    });
  });
}

// === Global Listeners ===
function attachGlobalListeners() {
  // Eerie click effect - random subtle flicker
  document.querySelectorAll('.article-item').forEach((el, i) => {
    el.addEventListener('click', () => {
      if (Math.random() < 0.1) {
        document.body.style.animation = 'none';
        document.body.offsetHeight; // trigger reflow
        document.body.style.animation = 'flicker 0.05s ease-out';
        setTimeout(() => { document.body.style.animation = ''; }, 50);
      }
    });
  });

  // Konami-style secret: Admin access
  let keySeq = [];
  const adminSeq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  document.addEventListener('keydown', (e) => {
    keySeq.push(e.key);
    if (keySeq.length > adminSeq.length) keySeq.shift();
    if (keySeq.join(',') === adminSeq.join(',')) {
      navigateTo('admin');
      keySeq = [];
    }
  });
}

// === Eerie Audio/Visual Effect ===
function initEerieEffects() {
  // Optional: Add a hidden trigger zone - triple-click in bottom-left
  let clickCount = 0;
  let clickTimer = null;
  document.addEventListener('click', (e) => {
    if (e.clientX < 100 && e.clientY > window.innerHeight - 100) {
      clickCount++;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => { clickCount = 0; }, 500);
      if (clickCount >= 3) {
        triggerGlitchEffect();
        clickCount = 0;
      }
    }
  });
}

function triggerGlitchEffect() {
  document.body.style.filter = 'hue-rotate(90deg)';
  document.body.style.animation = 'body-flicker 0.2s steps(2)';
  setTimeout(() => {
    document.body.style.filter = '';
    document.body.style.animation = '';
  }, 200);
}

// === Entry Point ===
document.addEventListener('DOMContentLoaded', async () => {
  await loadArticles();

  // Load extra articles from localStorage (admin-created)
  try {
    const extra = localStorage.getItem('arg_articles_extra');
    if (extra) {
      const parsed = JSON.parse(extra);
      articlesData = [...articlesData.filter(a => !parsed.find(p => p.id === a.id)), ...parsed];
    }
  } catch (e) {}

  renderPage();
  initEerieEffects();

  window.addEventListener('hashchange', renderPage);
});
