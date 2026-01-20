import bcrypt from 'bcryptjs';

/**
 * 密码加密配置
 */
const SALT_ROUNDS = 10; // bcrypt 加密轮数

/**
 * 对明文密码进行哈希加密
 * @param password 明文密码
 * @returns 加密后的密码哈希值
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    throw new Error(`密码加密失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 验证密码是否匹配
 * @param password 用户输入的明文密码
 * @param hashedPassword 数据库中存储的密码哈希值
 * @returns 密码是否匹配
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    throw new Error(`密码验证失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 验证密码强度
 * @param password 待验证的密码
 * @returns 验证结果对象
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 最小长度检查
  if (password.length < 8) {
    errors.push('密码长度至少为 8 个字符');
  }

  // 最大长度检查（防止 DoS 攻击）
  if (password.length > 128) {
    errors.push('密码长度不能超过 128 个字符');
  }

  // 包含数字
  if (!/\d/.test(password)) {
    errors.push('密码必须包含至少一个数字');
  }

  // 包含字母
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('密码必须包含至少一个字母');
  }

  // 可选：包含特殊字符（根据需求启用）
  // if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
  //   errors.push('密码必须包含至少一个特殊字符');
  // }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
