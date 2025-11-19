const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Phase 1: 하드코딩된 사용자 정보 (실제로는 DB에서 조회)
// Phase 2에서 User 테이블 추가 예정
const ADMIN_USER = {
  id: 'admin',
  username: 'admin',
  // 비밀번호: admin123 (bcrypt 해시)
  passwordHash: '$2b$10$YourHashedPasswordHere', // 실제 사용 시 bcrypt.hash('admin123', 10)로 생성
  name: '관리자'
};

const authController = {
  /**
   * 로그인
   */
  async login(req, res, next) {
    try {
      const { username, password } = req.body;

      // Phase 1: 간단한 인증 (username이 admin이고 password가 admin123인 경우만 허용)
      if (username !== 'admin' || password !== 'admin123') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '아이디 또는 비밀번호를 확인해주세요'
          }
        });
      }

      // JWT 토큰 생성
      const token = jwt.sign(
        {
          id: ADMIN_USER.id,
          username: ADMIN_USER.username
        },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        }
      );

      // 응답
      res.json({
        success: true,
        data: {
          token,
          expiresIn: 86400, // 24 hours in seconds
          user: {
            id: ADMIN_USER.id,
            name: ADMIN_USER.name
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * 로그아웃
   */
  async logout(req, res, next) {
    try {
      // JWT는 stateless이므로 서버에서 할 일 없음
      // 클라이언트에서 토큰 삭제
      res.json({
        success: true,
        message: '로그아웃되었습니다'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * 비밀번호 변경
   */
  async changePassword(req, res, next) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Phase 1: 간단한 구현 (실제로는 DB 업데이트 필요)
      if (oldPassword !== 'admin123') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '현재 비밀번호가 올바르지 않습니다'
          }
        });
      }

      // Phase 2에서 실제 비밀번호 업데이트 구현
      // const hashedPassword = await bcrypt.hash(newPassword, 10);
      // await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });

      res.json({
        success: true,
        message: '비밀번호가 변경되었습니다'
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = authController;
