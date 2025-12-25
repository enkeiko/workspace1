import { Article } from '../database';

interface UpdateData {
  aiVibe: Article[];
  localBiz: Article[];
  updateTime: string;
}

// Markdown 포맷 생성
export function formatMarkdownOutput(data: UpdateData): string {
  const { aiVibe, localBiz, updateTime } = data;
  const dateStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  
  let md = '';
  
  // 헤더
  md += `# 📰 오늘의 뉴스 업데이트\n\n`;
  md += `> **${dateStr}** | ⏰ ${updateTime} 업데이트\n\n`;
  md += `---\n\n`;
  
  // AI·바이브코딩 섹션
  md += `## 🔵 AI · 바이브코딩 뉴스\n\n`;
  
  if (aiVibe.length === 0) {
    md += `> 📭 새로운 소식이 없습니다.\n\n`;
  } else {
    aiVibe.forEach((article, index) => {
      md += formatArticleMarkdown(article, index + 1);
    });
  }
  
  md += `---\n\n`;
  
  // 자영업·네이버 플레이스 섹션
  md += `## 🟢 자영업 · 네이버 플레이스 뉴스\n\n`;
  
  if (localBiz.length === 0) {
    md += `> 📭 새로운 소식이 없습니다.\n\n`;
  } else {
    localBiz.forEach((article, index) => {
      md += formatArticleMarkdown(article, index + 1);
    });
  }
  
  // 푸터
  md += `---\n\n`;
  md += `### 📲 더 많은 소식\n\n`;
  md += `- 🔗 [사이트 방문하기](https://yourdomain.com)\n`;
  md += `- 💬 댓글로 의견을 나눠보세요!\n\n`;
  md += `---\n\n`;
  md += `*이 뉴스레터가 도움이 되셨다면 공유해주세요!*\n`;
  
  return md;
}

function formatArticleMarkdown(article: Article, index: number): string {
  const tags = article.tags ? JSON.parse(article.tags) : [];
  
  let md = '';
  
  // 제목 (링크 포함)
  md += `### ${index}. [${article.title}](${article.original_url})\n\n`;
  
  // 요약 (더 자세하게)
  if (article.summary) {
    // 요약이 너무 짧으면 개선
    let summary = article.summary;
    if (summary.length < 100 && article.title.length > 20) {
      // 제목에서 추가 정보 추출
      summary = `${summary} ${article.title}에 대한 상세 내용은 원문을 확인하세요.`;
    }
    md += `${summary}\n\n`;
  } else {
    // 요약이 없으면 제목 기반 설명
    md += `${article.title}에 대한 최신 소식입니다. 자세한 내용은 원문을 확인하세요.\n\n`;
  }
  
  // 메타 정보 (간소화)
  md += `**출처**: ${article.source_name || '알 수 없음'} | `;
  md += `**점수**: ${article.total_score?.toFixed(1) || '-'}/10\n\n`;
  
  // 링크 (명확하게)
  md += `🔗 [전체 기사 읽기 →](${article.original_url})\n\n`;
  
  md += `---\n\n`;
  
  return md;
}

// 테이블 형식 Markdown
export function formatMarkdownTable(articles: Article[]): string {
  if (articles.length === 0) {
    return '데이터가 없습니다.';
  }
  
  let md = '';
  
  md += `| # | 제목 | 출처 | 점수 |\n`;
  md += `|---|------|------|------|\n`;
  
  articles.forEach((article, index) => {
    const title = article.title.length > 40 
      ? article.title.slice(0, 40) + '...' 
      : article.title;
    md += `| ${index + 1} | [${title}](${article.original_url}) | ${article.source_name || '-'} | ${article.total_score?.toFixed(1) || '-'} |\n`;
  });
  
  return md;
}

// RSS 피드용 간단한 Markdown
export function formatSimpleMarkdown(articles: Article[]): string {
  return articles.map((article, index) => {
    return `${index + 1}. **${article.title}**\n   ${article.summary || ''}\n   [원문](${article.original_url})\n`;
  }).join('\n');
}

