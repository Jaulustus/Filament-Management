import crypto from 'crypto';

export function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

export function sanitizeId(id) {
  return (id || '').toString().trim().toLowerCase();
}

