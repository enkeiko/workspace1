import { Router, Request, Response, NextFunction } from 'express';
import {
  ArticleRepository,
  CommentRepository,
  SubmissionRepository,
  UpdateLogRepository,
  BlockedWordRepository
} from '../database';
import { CommentService, SubmissionService } from '../community';
import { spamFilter } from '../community/spam-filter';
import { config } from '../config';
import { collectAllNews } from '../collectors';

const router = Router();

// 관리자 인증 미들웨어
function adminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const adminSecret = config.adminSecret;

  if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
    return res.status(401).json({ success: false, error: '인증이 필요합니다.' });
  }

  next();
}

// 모든 관리자 라우트에 인증 적용
router.use(adminAuth);

// ===========================
// 기사 관리 API
// ===========================

// 기사 목록 (관리자용 - 모든 상태 포함)
router.get('/articles', (req: Request, res: Response) => {
  try {
    const { category, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    let articles;
    if (category) {
      articles = ArticleRepository.findByCategory(category as string, {
        limit: limitNum,
        offset
      });
    } else {
      articles = [
        ...ArticleRepository.findByCategory('ai-vibe', { limit: limitNum / 2 }),
        ...ArticleRepository.findByCategory('local-biz', { limit: limitNum / 2 })
      ];
    }

    res.json({ success: true, data: articles });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 기사 삭제
router.delete('/articles/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    ArticleRepository.delete(parseInt(id, 10));
    res.json({ success: true, message: '기사가 삭제되었습니다.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 기사 주요 기사 토글
router.patch('/articles/:id/featured', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { featured } = req.body;

    ArticleRepository.updateFeatured(parseInt(id, 10), featured);
    res.json({ success: true, message: featured ? '주요 기사로 설정되었습니다.' : '주요 기사 해제되었습니다.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================
// 댓글 관리 API
// ===========================

// 댓글 삭제
router.delete('/comments/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = CommentService.delete(parseInt(id, 10));

    if (success) {
      res.json({ success: true, message: '댓글이 삭제되었습니다.' });
    } else {
      res.status(400).json({ success: false, error: '댓글 삭제에 실패했습니다.' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 댓글 스팸 처리
router.patch('/comments/:id/spam', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = CommentService.markAsSpam(parseInt(id, 10));

    if (success) {
      res.json({ success: true, message: '댓글이 스팸으로 처리되었습니다.' });
    } else {
      res.status(400).json({ success: false, error: '스팸 처리에 실패했습니다.' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================
// 제출 관리 API
// ===========================

// 대기 중인 제출 목록
router.get('/submissions/pending', (req: Request, res: Response) => {
  try {
    const submissions = SubmissionService.getPending();
    res.json({ success: true, data: submissions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 제출 승인
router.post('/submissions/:id/approve', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const submission = SubmissionRepository.findPending().find(
      s => s.id === parseInt(id, 10)
    );

    if (!submission) {
      return res.status(404).json({ success: false, error: '제출을 찾을 수 없습니다.' });
    }

    const result = SubmissionService.approve(parseInt(id, 10), submission);

    if (result.success) {
      res.json({ success: true, message: '승인되었습니다.', articleId: result.articleId });
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 제출 거부
router.post('/submissions/:id/reject', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const success = SubmissionService.reject(parseInt(id, 10), note);

    if (success) {
      res.json({ success: true, message: '거부되었습니다.' });
    } else {
      res.status(400).json({ success: false, error: '거부 처리에 실패했습니다.' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================
// 스팸 필터 관리 API
// ===========================

// 차단 단어 목록
router.get('/spam/words', (req: Request, res: Response) => {
  try {
    const words = spamFilter.getBlockedWords();
    res.json({ success: true, data: words });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 차단 단어 추가
router.post('/spam/words', (req: Request, res: Response) => {
  try {
    const { word } = req.body;

    if (!word || word.trim().length === 0) {
      return res.status(400).json({ success: false, error: '단어를 입력해주세요.' });
    }

    const success = spamFilter.addBlockedWord(word.trim());

    if (success) {
      res.json({ success: true, message: '차단 단어가 추가되었습니다.' });
    } else {
      res.status(400).json({ success: false, error: '이미 등록된 단어입니다.' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 차단 단어 삭제
router.delete('/spam/words/:word', (req: Request, res: Response) => {
  try {
    const { word } = req.params;
    const success = spamFilter.removeBlockedWord(word);

    if (success) {
      res.json({ success: true, message: '차단 단어가 삭제되었습니다.' });
    } else {
      res.status(400).json({ success: false, error: '단어를 찾을 수 없습니다.' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================
// 수집 관리 API
// ===========================

// 수동 수집 트리거
router.post('/collect', async (req: Request, res: Response) => {
  try {
    console.log('🔄 관리자 수동 수집 시작...');
    const stats = await collectAllNews();

    // 로그 기록
    UpdateLogRepository.insert({
      update_time: new Date().toTimeString().slice(0, 5),
      articles_collected: stats.total,
      articles_ai_vibe: stats.aiVibe,
      articles_local_biz: stats.localBiz,
      status: stats.errors.length > 0 ? 'partial' : 'success',
      error_message: stats.errors.length > 0 ? stats.errors.join('; ') : undefined
    });

    res.json({
      success: true,
      message: '수집이 완료되었습니다.',
      stats
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 수집 로그 조회
router.get('/logs', (req: Request, res: Response) => {
  try {
    const { limit = '20' } = req.query;
    const logs = UpdateLogRepository.getRecent(parseInt(limit as string, 10));
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================
// 통계 API
// ===========================

router.get('/stats', (req: Request, res: Response) => {
  try {
    const aiVibeCount = ArticleRepository.findByCategory('ai-vibe', { limit: 10000 }).length;
    const localBizCount = ArticleRepository.findByCategory('local-biz', { limit: 10000 }).length;
    const pendingSubmissions = SubmissionService.getPending().length;
    const recentLogs = UpdateLogRepository.getRecent(5);

    res.json({
      success: true,
      data: {
        articles: {
          total: aiVibeCount + localBizCount,
          aiVibe: aiVibeCount,
          localBiz: localBizCount
        },
        pendingSubmissions,
        recentUpdates: recentLogs
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

