// ===========================
// State Management
// ===========================
const state = {
  currentCategory: 'ai-vibe',
  currentSort: 'recent',
  currentTag: null,
  searchQuery: '',
  articles: [],
  featuredArticles: [],
  page: 1,
  hasMore: true,
  loading: false,
  user: null
};

// ===========================
// DOM Elements
// ===========================
const elements = {
  // Tabs
  tabs: document.querySelectorAll('.tab'),
  
  // Filters
  filterBtns: document.querySelectorAll('.filter-btn'),
  tagsToggle: document.getElementById('tagsToggle'),
  tagsFilter: document.getElementById('tagsFilter'),
  tagsList: document.getElementById('tagsList'),
  
  // Search
  searchToggle: document.getElementById('searchToggle'),
  searchBar: document.getElementById('searchBar'),
  searchInput: document.getElementById('searchInput'),
  searchClose: document.getElementById('searchClose'),
  
  // Content
  featuredSection: document.getElementById('featuredSection'),
  featuredList: document.getElementById('featuredList'),
  articlesList: document.getElementById('articlesList'),
  loading: document.getElementById('loading'),
  emptyState: document.getElementById('emptyState'),
  loadMore: document.getElementById('loadMore'),
  
  // Modals
  articleModal: document.getElementById('articleModal'),
  modalBody: document.getElementById('modalBody'),
  modalClose: document.getElementById('modalClose'),
  submitModal: document.getElementById('submitModal'),
  submitBtn: document.getElementById('submitBtn'),
  submitModalClose: document.getElementById('submitModalClose'),
  submitForm: document.getElementById('submitForm'),
  
  // Update Banner
  updateBanner: document.getElementById('updateBanner'),
  updateTime: document.getElementById('updateTime'),
  nextUpdate: document.getElementById('nextUpdate')
};

// ===========================
// Tags Configuration
// ===========================
const TAGS = {
  'ai-vibe': ['AI', 'ChatGPT', '자동화', '바이브코딩', 'SaaS', '노코드', '수익화', '프롬프트'],
  'local-biz': ['네이버플레이스', '리뷰마케팅', '로컬SEO', '자영업', '매출', '마케팅', '오프라인']
};

// ===========================
// API Functions
// ===========================
const api = {
  async getArticles(options = {}) {
    const params = new URLSearchParams({
      category: options.category || state.currentCategory,
      page: options.page || state.page,
      limit: 20,
      sort: options.sort || state.currentSort,
      ...(options.search && { search: options.search }),
      ...(options.tag && { tag: options.tag })
    });
    
    const response = await fetch(`/api/articles?${params}`);
    return response.json();
  },
  
  async getFeatured(category) {
    const response = await fetch(`/api/articles/featured?category=${category}`);
    return response.json();
  },
  
  async getArticle(id) {
    const response = await fetch(`/api/articles/${id}`);
    return response.json();
  },
  
  async likeArticle(id) {
    const response = await fetch(`/api/articles/${id}/like`, { method: 'POST' });
    return response.json();
  },
  
  async getComments(articleId, sort = 'recent') {
    const response = await fetch(`/api/articles/${articleId}/comments?sort=${sort}`);
    return response.json();
  },
  
  async postComment(articleId, content, nickname) {
    const response = await fetch(`/api/articles/${articleId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, nickname })
    });
    return response.json();
  },
  
  async likeComment(commentId) {
    const response = await fetch(`/api/comments/${commentId}/like`, { method: 'POST' });
    return response.json();
  },
  
  async submitArticle(data) {
    const response = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },
  
  async getUser() {
    const response = await fetch('/api/user');
    return response.json();
  }
};

// ===========================
// Render Functions
// ===========================
function renderFeaturedArticles(articles) {
  if (articles.length === 0) {
    elements.featuredSection.style.display = 'none';
    return;
  }
  
  elements.featuredSection.style.display = 'block';
  elements.featuredList.innerHTML = articles.map(article => `
    <div class="featured-card" data-id="${article.id}">
      <h3>${escapeHtml(article.title)}</h3>
      <div class="meta">
        📰 ${escapeHtml(article.source_name || '알 수 없음')} · 
        ❤️ ${article.like_count || 0}
      </div>
    </div>
  `).join('');
}

function renderArticles(articles, append = false) {
  if (!append) {
    elements.articlesList.innerHTML = '';
  }
  
  if (articles.length === 0 && !append) {
    elements.emptyState.style.display = 'block';
    elements.loadMore.style.display = 'none';
    return;
  }
  
  elements.emptyState.style.display = 'none';
  
  const html = articles.map(article => {
    const tags = article.tags ? JSON.parse(article.tags) : [];
    
    return `
      <article class="article-card" data-id="${article.id}">
        <div class="article-header">
          ${article.thumbnail_url ? `
            <img class="article-thumbnail" src="${escapeHtml(article.thumbnail_url)}" alt="" loading="lazy" onerror="this.style.display='none'">
          ` : ''}
          <div class="article-info">
            <h3 class="article-title">${escapeHtml(article.title)}</h3>
            ${article.summary ? `
              <p class="article-summary">${escapeHtml(article.summary)}</p>
            ` : ''}
          </div>
        </div>
        
        ${tags.length > 0 ? `
          <div class="article-tags">
            ${tags.slice(0, 3).map(tag => `
              <span class="article-tag">#${escapeHtml(tag)}</span>
            `).join('')}
          </div>
        ` : ''}
        
        <div class="article-footer">
          <div class="article-meta">
            <span>📰 ${escapeHtml(article.source_name || '알 수 없음')}</span>
          </div>
          <div class="article-stats">
            <span class="stat">❤️ ${article.like_count || 0}</span>
            <span class="stat">💬 ${article.comment_count || 0}</span>
          </div>
        </div>
      </article>
    `;
  }).join('');
  
  if (append) {
    elements.articlesList.insertAdjacentHTML('beforeend', html);
  } else {
    elements.articlesList.innerHTML = html;
  }
  
  elements.loadMore.style.display = state.hasMore ? 'block' : 'none';
}

function renderTags() {
  const tags = TAGS[state.currentCategory] || [];
  elements.tagsList.innerHTML = tags.map(tag => `
    <button class="tag-btn ${state.currentTag === tag ? 'active' : ''}" data-tag="${tag}">
      #${tag}
    </button>
  `).join('');
}

function renderArticleModal(article, comments) {
  const tags = article.tags ? (typeof article.tags === 'string' ? JSON.parse(article.tags) : article.tags) : [];
  
  elements.modalBody.innerHTML = `
    <div class="article-detail">
      <h2 class="title">${escapeHtml(article.title)}</h2>
      
      ${article.summary ? `
        <p class="summary">${escapeHtml(article.summary)}</p>
      ` : ''}
      
      <div class="meta-row">
        <span class="source">📰 ${escapeHtml(article.source_name || '알 수 없음')}</span>
        <a href="${escapeHtml(article.original_url)}" class="original-link" target="_blank" rel="noopener">
          원문 보기 ↗
        </a>
      </div>
      
      <div class="interactions">
        <button class="like-btn ${article.hasLiked ? 'liked' : ''}" data-article-id="${article.id}">
          ${article.hasLiked ? '❤️' : '🤍'} 좋아요 <span class="like-count">${article.like_count || 0}</span>
        </button>
      </div>
      
      ${tags.length > 0 ? `
        <div class="article-tags">
          ${tags.map(tag => `<span class="article-tag">#${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
    </div>
    
    <div class="comments-section">
      <div class="comments-header">
        <h3>💬 댓글 (${comments.length})</h3>
        <div class="comments-sort">
          <button class="active" data-sort="recent">최신순</button>
          <button data-sort="popular">추천순</button>
        </div>
      </div>
      
      <div class="comment-form">
        <textarea placeholder="댓글을 작성하세요..." id="commentInput"></textarea>
        <button type="button" id="commentSubmit">등록</button>
      </div>
      
      <div class="comments-list" id="commentsList">
        ${renderComments(comments)}
      </div>
    </div>
  `;
  
  // Add event listeners
  setupModalEventListeners(article.id);
}

function renderComments(comments) {
  if (comments.length === 0) {
    return '<p class="empty-state">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</p>';
  }
  
  return comments.map(comment => `
    <div class="comment-item" data-id="${comment.id}">
      <div class="comment-header">
        <span class="comment-nickname">${escapeHtml(comment.nickname)}</span>
        <span class="comment-time">${formatTime(comment.created_at)}</span>
      </div>
      <p class="comment-content">${escapeHtml(comment.content)}</p>
      <div class="comment-actions">
        <button class="comment-like-btn" data-comment-id="${comment.id}">
          👍 ${comment.like_count || 0}
        </button>
      </div>
    </div>
  `).join('');
}

// ===========================
// Event Handlers
// ===========================
async function loadArticles(reset = false) {
  if (state.loading) return;
  
  state.loading = true;
  elements.loading.style.display = 'flex';
  
  if (reset) {
    state.page = 1;
    state.articles = [];
    elements.articlesList.innerHTML = '';
  }
  
  try {
    const result = await api.getArticles({
      category: state.currentCategory,
      page: state.page,
      sort: state.currentSort,
      search: state.searchQuery || undefined,
      tag: state.currentTag || undefined
    });
    
    if (result.success) {
      state.articles = reset ? result.data : [...state.articles, ...result.data];
      state.hasMore = result.pagination.hasMore;
      renderArticles(result.data, !reset);
    }
  } catch (error) {
    console.error('Failed to load articles:', error);
  } finally {
    state.loading = false;
    elements.loading.style.display = 'none';
  }
}

async function loadFeatured() {
  try {
    const result = await api.getFeatured(state.currentCategory);
    if (result.success) {
      state.featuredArticles = result.data;
      renderFeaturedArticles(result.data);
    }
  } catch (error) {
    console.error('Failed to load featured:', error);
  }
}

async function openArticle(articleId) {
  try {
    const [articleResult, commentsResult] = await Promise.all([
      api.getArticle(articleId),
      api.getComments(articleId)
    ]);
    
    if (articleResult.success) {
      renderArticleModal(articleResult.data, commentsResult.data || []);
      elements.articleModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  } catch (error) {
    console.error('Failed to load article:', error);
  }
}

function closeArticleModal() {
  elements.articleModal.classList.remove('active');
  document.body.style.overflow = '';
}

function setupModalEventListeners(articleId) {
  // Like button
  const likeBtn = elements.modalBody.querySelector('.like-btn');
  if (likeBtn) {
    likeBtn.addEventListener('click', async () => {
      const result = await api.likeArticle(articleId);
      if (result.success) {
        likeBtn.classList.toggle('liked', result.liked);
        likeBtn.innerHTML = `${result.liked ? '❤️' : '🤍'} 좋아요 <span class="like-count">${result.likeCount}</span>`;
      }
    });
  }
  
  // Comment submit
  const commentSubmit = document.getElementById('commentSubmit');
  const commentInput = document.getElementById('commentInput');
  
  if (commentSubmit && commentInput) {
    commentSubmit.addEventListener('click', async () => {
      const content = commentInput.value.trim();
      if (!content) return;
      
      const result = await api.postComment(articleId, content, state.user?.nickname);
      if (result.success) {
        commentInput.value = '';
        // Reload comments
        const commentsResult = await api.getComments(articleId);
        if (commentsResult.success) {
          document.getElementById('commentsList').innerHTML = renderComments(commentsResult.data);
        }
      } else {
        alert(result.error || '댓글 작성에 실패했습니다.');
      }
    });
  }
  
  // Comment sort
  const sortBtns = elements.modalBody.querySelectorAll('.comments-sort button');
  sortBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      sortBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const sort = btn.dataset.sort;
      const commentsResult = await api.getComments(articleId, sort);
      if (commentsResult.success) {
        document.getElementById('commentsList').innerHTML = renderComments(commentsResult.data);
      }
    });
  });
  
  // Comment likes
  elements.modalBody.addEventListener('click', async (e) => {
    const likeBtn = e.target.closest('.comment-like-btn');
    if (likeBtn) {
      const commentId = likeBtn.dataset.commentId;
      const result = await api.likeComment(commentId);
      if (result.success) {
        // Reload to update count
        const commentsResult = await api.getComments(articleId);
        if (commentsResult.success) {
          document.getElementById('commentsList').innerHTML = renderComments(commentsResult.data);
        }
      }
    }
  });
}

// ===========================
// Initialize
// ===========================
function init() {
  // Load initial data
  loadFeatured();
  loadArticles(true);
  renderTags();
  loadUser();
  
  // Tab clicks
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      elements.tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentCategory = tab.dataset.category;
      state.currentTag = null;
      renderTags();
      loadFeatured();
      loadArticles(true);
    });
  });
  
  // Filter clicks
  elements.filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentSort = btn.dataset.sort;
      loadArticles(true);
    });
  });
  
  // Tags toggle
  elements.tagsToggle.addEventListener('click', () => {
    elements.tagsToggle.classList.toggle('active');
    elements.tagsFilter.classList.toggle('active');
  });
  
  // Tag clicks
  elements.tagsList.addEventListener('click', (e) => {
    const tagBtn = e.target.closest('.tag-btn');
    if (tagBtn) {
      const tag = tagBtn.dataset.tag;
      if (state.currentTag === tag) {
        state.currentTag = null;
        tagBtn.classList.remove('active');
      } else {
        elements.tagsList.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
        tagBtn.classList.add('active');
        state.currentTag = tag;
      }
      loadArticles(true);
    }
  });
  
  // Search
  elements.searchToggle.addEventListener('click', () => {
    elements.searchBar.classList.add('active');
    elements.searchInput.focus();
  });
  
  elements.searchClose.addEventListener('click', () => {
    elements.searchBar.classList.remove('active');
    elements.searchInput.value = '';
    state.searchQuery = '';
    loadArticles(true);
  });
  
  elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      state.searchQuery = elements.searchInput.value.trim();
      loadArticles(true);
    }
  });
  
  // Article clicks
  elements.articlesList.addEventListener('click', (e) => {
    const card = e.target.closest('.article-card');
    if (card) {
      openArticle(card.dataset.id);
    }
  });
  
  elements.featuredList.addEventListener('click', (e) => {
    const card = e.target.closest('.featured-card');
    if (card) {
      openArticle(card.dataset.id);
    }
  });
  
  // Modal close
  elements.modalClose.addEventListener('click', closeArticleModal);
  elements.articleModal.addEventListener('click', (e) => {
    if (e.target === elements.articleModal) {
      closeArticleModal();
    }
  });
  
  // Submit modal
  elements.submitBtn.addEventListener('click', () => {
    elements.submitModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  });
  
  elements.submitModalClose.addEventListener('click', () => {
    elements.submitModal.classList.remove('active');
    document.body.style.overflow = '';
  });
  
  elements.submitModal.addEventListener('click', (e) => {
    if (e.target === elements.submitModal) {
      elements.submitModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
  
  // Submit form
  elements.submitForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(elements.submitForm);
    const data = {
      category: formData.get('category'),
      title: formData.get('title'),
      url: formData.get('url'),
      description: formData.get('description'),
      nickname: formData.get('nickname')
    };
    
    const result = await api.submitArticle(data);
    
    if (result.success) {
      alert('제출이 완료되었습니다! 관리자 승인 후 게시됩니다.');
      elements.submitForm.reset();
      elements.submitModal.classList.remove('active');
      document.body.style.overflow = '';
    } else {
      alert(result.error || '제출에 실패했습니다.');
    }
  });
  
  // Load more
  elements.loadMore.addEventListener('click', () => {
    state.page++;
    loadArticles(false);
  });
  
  // Update banner
  updateBanner();
  setInterval(updateBanner, 60000);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeArticleModal();
      elements.submitModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
}

async function loadUser() {
  try {
    const result = await api.getUser();
    if (result.success) {
      state.user = result.data;
    }
  } catch (error) {
    console.error('Failed to load user:', error);
  }
}

function updateBanner() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  elements.updateTime.textContent = `마지막 확인: ${timeStr}`;
  
  // Calculate next update
  const hours = [7, 12, 18, 23];
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  let nextHour = hours.find(h => h > currentHour) || hours[0];
  let hoursUntil = nextHour - currentHour;
  if (hoursUntil < 0) hoursUntil += 24;
  
  elements.nextUpdate.textContent = `다음 업데이트: ${hoursUntil}시간 후`;
}

// ===========================
// Utility Functions
// ===========================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = (now - date) / 1000;
  
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  
  return date.toLocaleDateString('ko-KR');
}

// Start the app
document.addEventListener('DOMContentLoaded', init);

