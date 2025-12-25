// 랜덤 익명 닉네임 생성기

const adjectives = [
  '행복한', '신나는', '졸린', '배고픈', '열정적인',
  '차분한', '용감한', '귀여운', '똑똑한', '부지런한',
  '느긋한', '활발한', '조용한', '밝은', '따뜻한',
  '시원한', '상쾌한', '달콤한', '매콤한', '새침한',
  '호기심많은', '긍정적인', '창의적인', '성실한', '유쾌한'
];

const animals = [
  '고양이', '강아지', '토끼', '햄스터', '펭귄',
  '판다', '코알라', '수달', '여우', '늑대',
  '사자', '호랑이', '곰', '기린', '코끼리',
  '돌고래', '고래', '부엉이', '독수리', '앵무새',
  '물개', '알파카', '라마', '미어캣', '너구리'
];

const foods = [
  '라면', '김밥', '떡볶이', '치킨', '피자',
  '햄버거', '타코', '초밥', '샌드위치', '파스타',
  '카레', '짜장면', '탕수육', '만두', '순대',
  '아이스크림', '케이크', '쿠키', '와플', '도넛'
];

const things = [
  '별', '달', '해', '구름', '바람',
  '꽃', '나무', '바다', '산', '강',
  '비', '눈', '무지개', '번개', '안개',
  '책', '커피', '음악', '그림', '여행'
];

export function generateNickname(): string {
  const categories = [animals, foods, things];
  const category = categories[Math.floor(Math.random() * categories.length)];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = category[Math.floor(Math.random() * category.length)];
  const number = Math.floor(Math.random() * 1000);
  
  return `${adjective}${noun}${number}`;
}

// UUID 기반 고정 닉네임 생성 (같은 UUID는 항상 같은 닉네임)
export function generateNicknameFromUUID(uuid: string): string {
  // UUID를 숫자로 변환
  const hash = uuid.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  const adjectiveIndex = hash % adjectives.length;
  const animalIndex = (hash * 7) % animals.length;
  const number = hash % 1000;
  
  return `${adjectives[adjectiveIndex]}${animals[animalIndex]}${number}`;
}

// 닉네임 유효성 검사
export function validateNickname(nickname: string): {
  valid: boolean;
  error?: string;
} {
  if (!nickname || nickname.trim().length === 0) {
    return { valid: false, error: '닉네임을 입력해주세요.' };
  }
  
  if (nickname.length < 2) {
    return { valid: false, error: '닉네임은 2자 이상이어야 합니다.' };
  }
  
  if (nickname.length > 20) {
    return { valid: false, error: '닉네임은 20자 이하여야 합니다.' };
  }
  
  // 특수문자 제한
  if (/[<>\"\'&]/.test(nickname)) {
    return { valid: false, error: '사용할 수 없는 문자가 포함되어 있습니다.' };
  }
  
  // 금지 단어
  const banned = ['관리자', 'admin', '운영자', '공지', '시스템'];
  const lowerNickname = nickname.toLowerCase();
  for (const word of banned) {
    if (lowerNickname.includes(word)) {
      return { valid: false, error: `"${word}"가 포함된 닉네임은 사용할 수 없습니다.` };
    }
  }
  
  return { valid: true };
}

