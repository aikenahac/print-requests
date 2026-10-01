import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scrypt = promisify(scryptCallback)

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex")
  const hash = (await scrypt(password, salt, 64)) as Buffer
  return `scrypt:${salt}:${hash.toString("hex")}`
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, hex] = stored.split(":")
  if (algorithm !== "scrypt" || !salt || !hex) return false
  const expected = Buffer.from(hex, "hex")
  if (expected.length !== 64) return false
  const actual = (await scrypt(password, salt, expected.length)) as Buffer
  return timingSafeEqual(actual, expected)
}

export function validPassword(password: string) {
  return password.length >= 12 && password.length <= 128
}

export function newPasswordError(password: string, confirmation: string) {
  if (!validPassword(password)) return "Use a password between 12 and 128 characters."
  if (password !== confirmation) return "The new passwords do not match."
  return null
}
