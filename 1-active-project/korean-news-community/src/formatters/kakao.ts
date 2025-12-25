import { Article } from '../database';

interface UpdateData {
  aiVibe: Article[];
  localBiz: Article[];
  updateTime: string;
}

// 카카오톡용 텍스트 포맷 생성
export function formatKakaoOutput(data: UpdateData): string {
  const { aiVibe, localBiz, updateTime } = data;
  const timeLabel = getTimeLabel(updateTime);
  
  let output = '';
  
  // 헤더
  output += '════════════════════════\n';
  output += `⏰ [${timeLabel}] 뉴스 업데이트\n`;
  output += '════════════════════════\n\n';
  
  // AI·바이브코딩 섹션
  output += '🔵 AI · 바이브코딩 뉴스\n';
  output += '────────────────────────\n\n';
  
  if (aiVibe.length === 0) {
    output += '📭 새로운 소식이 없습니다.\n\n';
  } else {
    aiVibe.slice(0, 5).forEach((article, index) => {
      output += formatArticleKakao(article, index + 1);
    });
  }
  
  output += '\n';
  
  // 자영업·네이버 플레이스 섹션
  output += '🟢 자영업 · 네이버 플레이스 뉴스\n';
  output += '────────────────────────\n\n';
  
  if (localBiz.length === 0) {
    output += '📭 새로운 소식이 없습니다.\n\n';
  } else {
    localBiz.slice(0, 5).forEach((article, index) => {
      output += formatArticleKakao(article, index + 1);
    });
  }
  
  // 푸터
  output += '════════════════════════\n';
  output += '📲 더 많은 소식은 사이트에서!\n';
  output += '🔗 https://yourdomain.com\n';
  output += '════════════════════════\n';
  
  return output;
}

function formatArticleKakao(article: Article, index: number): string {
  let text = '';
  
  // 제목
  text += `${index}) ${article.title}\n`;
  
  // 요약 (2-3줄)
  if (article.summary) {
    const summaryLines = article.summary.slice(0, 200).split('\n').slice(0, 3);
    text += `${summaryLines.join(' ')}\n`;
  }
  
  // 원문 링크
  text += `🔗 ${article.original_url}\n\n`;
  
  return text;
}

function getTimeLabel(updateTime: string): string {
  const hour = parseInt(updateTime.split(':')[0], 10);
  
  if (hour === 7) return '오전 7시 업데이트';
  if (hour === 12) return '오후 12시 업데이트';
  if (hour === 18) return '오후 6시 업데이트';
  if (hour === 23) return '오후 11시 업데이트';
  
  return `${updateTime} 업데이트`;
}

// 짧은 버전 (링크 공유용)
export function formatKakaoShort(data: UpdateData): string {
  const { aiVibe, localBiz, updateTime } = data;
  const timeLabel = getTimeLabel(updateTime);
  
  let output = `⏰ ${timeLabel}\n\n`;
  
  // AI 섹션 (상위 3개만)
  if (aiVibe.length > 0) {
    output += '🔵 AI·자동화\n';
    aiVibe.slice(0, 3).forEach((article, i) => {
      output += `${i + 1}. ${article.title.slice(0, 30)}...\n`;
    });
    output += '\n';
  }
  
  // 자영업 섹션 (상위 3개만)
  if (localBiz.length > 0) {
    output += '🟢 자영업·플레이스\n';
    localBiz.slice(0, 3).forEach((article, i) => {
      output += `${i + 1}. ${article.title.slice(0, 30)}...\n`;
    });
    output += '\n';
  }
  
  output += '📲 전체 보기: https://yourdomain.com';
  
  return output;
}

