// utils/password.util.ts
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * * Hash password
 * @param password 
 * @returns encrypted string
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * * Compare password
 * @param plain 
 * @param hashed 
 * @returns boolean
 */
export async function comparePassword(
  plain: string,
  hashed: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}