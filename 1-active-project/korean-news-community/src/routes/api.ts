import { Router, Request, Response } from 'express';
import { ArticleRepository, CommentRepository } from '../database';
import {
  CommentService,
  LikeService,
  SubmissionService,
  UserService,
  generateNicknameFromUUID
} from '../community';

const router = Router();

// ===========================
// 기사 API
// ===========================

// 기사 목록 조회
router.get('/articles', (req: Request, res: Response) => {
  try {
    const {
      category,
      page = '1',
      limit = '20',
      sort = 'recent',
      search,
      tag
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const offset = (pageNum - 1) * limitNum;

    let articles;

    if (search) {
      // 검색
      articles = ArticleRepository.search(
        search as string,
        category as string | undefined
      );
    } else if (category) {
      // 카테고리별 조회
      const orderBy = sort === 'popular'
        ? '(like_count * 2 + comment_count) DESC'
        : sort === 'score'
          ? 'total_score DESC'
          : 'published_at DESC';

      articles = ArticleRepository.findByCategory(category as string, {
        limit: limitNum,
        offset,
        orderBy
      });
    } else {
      // 전체 조회 (최신순)
      articles = ArticleRepository.findByCategory('ai-vibe', {
        limit: Math.floor(limitNum / 2),
        offset: Math.floor(offset / 2)
      }).concat(
        ArticleRepository.findByCategory('local-biz', {
          limit: Math.ceil(limitNum / 2),
          offset: Math.ceil(offset / 2)
        })
      );
    }

    // 태그 필터
    if (tag) {
      articles = articles.filter(article => {
        const tags = article.tags ? JSON.parse(article.tags) : [];
        return tags.includes(tag);
      });
    }

    res.json({
      success: true,
      data: articles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        hasMore: articles.length === limitNum
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 인기 기사 조회
router.get('/articles/popular', (req: Request, res: Response) => {
  try {
    const { category, limit = '10' } = req.query;
    const limitNum = Math.min(20, parseInt(limit as string, 10));

    const articles = ArticleRepository.findPopular(
      category as string || 'ai-vibe',
      limitNum
    );

    res.json({ success: true, data: articles });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 주요 기사 조회
router.get('/articles/featured', (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const articles = ArticleRepository.findFeatured(category as string);
    res.json({ success: true, data: articles });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 기사 상세 조회
router.get('/articles/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const article = ArticleRepository.findById(parseInt(id, 10));

    if (!article) {
      return res.status(404).json({ success: false, error: '기사를 찾을 수 없습니다.' });
    }

    // 조회수 증가
    ArticleRepository.incrementViewCount(article.id!);

    // 좋아요 여부 확인
    const userUuid = req.cookies?.user_uuid;
    const hasLiked = userUuid
      ? LikeService.hasLikedArticle(article.id!, userUuid)
      : false;

    res.json({
      success: true,
      data: {
        ...article,
        tags: article.tags ? JSON.parse(article.tags) : [],
        hasLiked
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 기사 좋아요 토글
router.post('/articles/:id/like', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let userUuid = req.cookies?.user_uuid;

    if (!userUuid) {
      userUuid = UserService.getOrCreateUUID();
      res.cookie('user_uuid', userUuid, {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax'
      });
    }

    const result = LikeService.toggleArticleLike(parseInt(id, 10), userUuid);
    const article = ArticleRepository.findById(parseInt(id, 10));

    res.json({
      success: true,
      liked: result.liked,
      likeCount: article?.like_count || 0
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================
// 댓글 API
// ===========================

// 댓글 목록 조회
router.get('/articles/:id/comments', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sort = 'recent' } = req.query;

    const comments = CommentService.getByArticleId(
      parseInt(id, 10),
      sort as 'recent' | 'popular'
    );

    res.json({ success: true, data: comments });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 댓글 작성
router.post('/articles/:id/comments', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, nickname, parentId } = req.body;

    let userUuid = req.cookies?.user_uuid;
    if (!userUuid) {
      userUuid = UserService.getOrCreateUUID();
      res.cookie('user_uuid', userUuid, {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax'
      });
    }

    // 닉네임이 없으면 자동 생성
    const finalNickname = nickname || generateNicknameFromUUID(userUuid);

    const result = CommentService.create({
      articleId: parseInt(id, 10),
      userUuid,
      nickname: finalNickname,
      content,
      parentId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 댓글 좋아요 토글
router.post('/comments/:id/like', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let userUuid = req.cookies?.user_uuid;

    if (!userUuid) {
      userUuid = UserService.getOrCreateUUID();
      res.cookie('user_uuid', userUuid, {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax'
      });
    }

    const result = LikeService.toggleCommentLike(parseInt(id, 10), userUuid);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================
// 기사 제출 API
// ===========================

// 기사 제출
router.post('/submissions', (req: Request, res: Response) => {
  try {
    const { category, title, url, description, nickname } = req.body;

    let userUuid = req.cookies?.user_uuid;
    if (!userUuid) {
      userUuid = UserService.getOrCreateUUID();
      res.cookie('user_uuid', userUuid, {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax'
      });
    }

    const result = SubmissionService.submit({
      userUuid,
      category,
      title,
      url,
      description,
      nickname
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================
// 사용자 API
// ===========================

// 사용자 정보 (UUID, 닉네임)
router.get('/user', (req: Request, res: Response) => {
  try {
    let userUuid = req.cookies?.user_uuid;
    let isNewUser = false;

    if (!userUuid) {
      userUuid = UserService.getOrCreateUUID();
      isNewUser = true;
      res.cookie('user_uuid', userUuid, {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax'
      });
    }

    const nickname = generateNicknameFromUUID(userUuid);

    res.json({
      success: true,
      data: {
        uuid: userUuid,
        nickname,
        isNewUser
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================
// 업데이트 정보 API
// ===========================

// 최근 업데이트 기사 (특정 시간 이내)
router.get('/updates/recent', (req: Request, res: Response) => {
  try {
    const { hours = '6' } = req.query;
    const hoursNum = Math.min(24, parseInt(hours as string, 10));

    const aiVibeArticles = ArticleRepository.getRecentByTimeRange(hoursNum, 'ai-vibe');
    const localBizArticles = ArticleRepository.getRecentByTimeRange(hoursNum, 'local-biz');

    res.json({
      success: true,
      data: {
        aiVibe: aiVibeArticles,
        localBiz: localBizArticles,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

