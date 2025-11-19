const Joi = require('joi');

const authValidation = {
  /**
   * 로그인 검증
   */
  login: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(5)
      .max(20)
      .required()
      .messages({
        'string.base': '사용자명은 문자열이어야 합니다',
        'string.alphanum': '사용자명은 영문자와 숫자만 포함할 수 있습니다',
        'string.min': '사용자명은 최소 5자 이상이어야 합니다',
        'string.max': '사용자명은 최대 20자 이하여야 합니다',
        'any.required': '사용자명을 입력해주세요'
      }),
    password: Joi.string()
      .min(8)
      .max(30)
      .required()
      .messages({
        'string.base': '비밀번호는 문자열이어야 합니다',
        'string.min': '비밀번호는 최소 8자 이상이어야 합니다',
        'string.max': '비밀번호는 최대 30자 이하여야 합니다',
        'any.required': '비밀번호를 입력해주세요'
      })
  }),

  /**
   * 비밀번호 변경 검증
   */
  changePassword: Joi.object({
    oldPassword: Joi.string()
      .required()
      .messages({
        'any.required': '현재 비밀번호를 입력해주세요'
      }),
    newPassword: Joi.string()
      .min(8)
      .max(30)
      .required()
      .messages({
        'string.min': '새 비밀번호는 최소 8자 이상이어야 합니다',
        'string.max': '새 비밀번호는 최대 30자 이하여야 합니다',
        'any.required': '새 비밀번호를 입력해주세요'
      })
  })
};

module.exports = authValidation;
