/**
 * Joi 검증 미들웨어
 * @param {Object} schema - Joi 검증 스키마
 * @param {String} property - 검증할 속성 (body, query, params)
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      error.isJoi = true;
      return next(error);
    }

    // 검증된 값으로 교체 (타입 변환 및 기본값 적용)
    req[property] = value;
    next();
  };
};

module.exports = { validate };
