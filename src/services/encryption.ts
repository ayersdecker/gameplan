import { XChaCha20Poly1305 } from '@stablelib/xchacha20poly1305';
import { randomBytes } from '@stablelib/random';
import { encode, decode } from '@stablelib/base64';

/**
 * Generate a random encryption key for a conversation
 * Returns base64-encoded 256-bit key
 */
export const generateConversationKey = (): string => {
  const key = randomBytes(32);
  return encode(key);
};

/**
 * Encrypt a message using XChaCha20-Poly1305 AEAD
 */
export const encryptMessage = (message: string, key: string): string => {
  try {
    const keyBytes = decode(key);
    const cipher = new XChaCha20Poly1305(keyBytes);
    const nonce = randomBytes(24);
    const messageBytes = new TextEncoder().encode(message);
    
    const encrypted = cipher.seal(nonce, messageBytes);
    
    const combined = new Uint8Array(nonce.length + encrypted.length);
    combined.set(nonce);
    combined.set(encrypted, nonce.length);
    
    return encode(combined);
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt message');
  }
};

/**
 * Decrypt a message using XChaCha20-Poly1305 AEAD
 */
export const decryptMessage = (encryptedData: string, key: string): string => {
  try {
    const keyBytes = decode(key);
    const combined = decode(encryptedData);
    
    const nonce = combined.slice(0, 24);
    const ciphertext = combined.slice(24);
    
    const cipher = new XChaCha20Poly1305(keyBytes);
    const decrypted = cipher.open(nonce, ciphertext);
    
    if (!decrypted) {
      throw new Error('Authentication failed');
    }
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt message');
  }
};
