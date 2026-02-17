/**
 * 简单的密码加密工具
 * 注意：这是简单的hash实现，生产环境应使用更强大的加密方式
 */

/**
 * 使用 SHA-256 对密码进行哈希
 * @param password 原始密码
 * @returns 哈希后的密码字符串
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * 验证密码是否正确
 * @param password 原始密码
 * @param hashedPassword 存储的哈希密码
 * @returns 是否匹配
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  const hash = await hashPassword(password);
  return hash === hashedPassword;
}
