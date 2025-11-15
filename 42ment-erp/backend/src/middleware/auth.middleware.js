const jwt = require('jsonwebtoken');

/**
 * JWT 토큰 인증 미들웨어
 */
const authenticate = (req, res, next) => {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No token provided'
        }
      });
    }

    const token = authHeader.substring(7); // "Bearer " 제거

    // 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 요청 객체에 사용자 정보 추가
    req.user = {
      id: decoded.id,
      username: decoded.username
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token expired'
        }
      });
    }

    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid token'
      }
    });
  }
};

module.exports = { authenticate };
