import { Article } from '../database';

interface UpdateData {
  aiVibe: Article[];
  localBiz: Article[];
  updateTime: string;
}

// 뉴스레터 스타일 HTML 생성
export function formatHtmlOutput(data: UpdateData): string {
  const { aiVibe, localBiz, updateTime } = data;
  const dateStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>뉴스 업데이트 - ${updateTime}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
      color: #e0e0e0;
      line-height: 1.6;
      min-height: 100vh;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 50px;
      padding: 30px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 10px;
      background: linear-gradient(135deg, #60a5fa, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .header .date {
      color: #888;
      font-size: 14px;
    }
    .header .update-time {
      display: inline-block;
      margin-top: 15px;
      padding: 8px 20px;
      background: rgba(96, 165, 250, 0.2);
      border-radius: 20px;
      font-size: 14px;
      color: #60a5fa;
    }
    .section {
      margin-bottom: 50px;
    }
    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 2px solid rgba(255, 255, 255, 0.1);
    }
    .section-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    .section-icon.ai {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    }
    .section-icon.biz {
      background: linear-gradient(135deg, #10b981, #059669);
    }
    .section-title {
      font-size: 20px;
      font-weight: 600;
    }
    .article-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 20px;
      transition: all 0.3s ease;
    }
    .article-card:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.15);
      transform: translateY(-2px);
    }
    .article-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #fff;
    }
    .article-title a {
      color: inherit;
      text-decoration: none;
    }
    .article-title a:hover {
      color: #60a5fa;
    }
    .article-summary {
      color: #a0a0a0;
      font-size: 14px;
      margin-bottom: 15px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .article-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: #666;
    }
    .article-source {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .article-tags {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .tag {
      padding: 4px 10px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      font-size: 11px;
      color: #888;
    }
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #666;
    }
    .footer {
      text-align: center;
      padding: 30px;
      color: #666;
      font-size: 13px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      margin-top: 30px;
    }
    .footer a {
      color: #60a5fa;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>📰 오늘의 뉴스 업데이트</h1>
      <p class="date">${dateStr}</p>
      <span class="update-time">⏰ ${updateTime} 업데이트</span>
    </header>
    
    <section class="section">
      <div class="section-header">
        <div class="section-icon ai">🔵</div>
        <h2 class="section-title">AI · 바이브코딩 뉴스</h2>
      </div>
      ${aiVibe.length > 0 
        ? aiVibe.map(article => formatArticleCard(article)).join('')
        : '<div class="empty-state">📭 새로운 소식이 없습니다.</div>'
      }
    </section>
    
    <section class="section">
      <div class="section-header">
        <div class="section-icon biz">🟢</div>
        <h2 class="section-title">자영업 · 네이버 플레이스 뉴스</h2>
      </div>
      ${localBiz.length > 0 
        ? localBiz.map(article => formatArticleCard(article)).join('')
        : '<div class="empty-state">📭 새로운 소식이 없습니다.</div>'
      }
    </section>
    
    <footer class="footer">
      <p>이 뉴스레터가 도움이 되셨다면 공유해주세요!</p>
      <p style="margin-top: 10px;">
        <a href="https://yourdomain.com">🔗 사이트 방문하기</a>
      </p>
    </footer>
  </div>
</body>
</html>`;
}

function formatArticleCard(article: Article): string {
  const tags = article.tags ? JSON.parse(article.tags) : [];
  
  return `
    <article class="article-card">
      <h3 class="article-title">
        <a href="${escapeHtml(article.original_url)}" target="_blank" rel="noopener">
          ${escapeHtml(article.title)}
        </a>
      </h3>
      ${article.summary ? `<p class="article-summary">${escapeHtml(article.summary)}</p>` : ''}
      <div class="article-meta">
        <span class="article-source">
          📰 ${escapeHtml(article.source_name || '알 수 없음')}
        </span>
        <div class="article-tags">
          ${tags.slice(0, 3).map((tag: string) => `<span class="tag">#${escapeHtml(tag)}</span>`).join('')}
        </div>
      </div>
    </article>
  `;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

