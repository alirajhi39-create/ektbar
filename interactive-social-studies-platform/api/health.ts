import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, json } from './_lib/core';

/** فحص التكامل: ينجح فقط إذا كانت قاعدة Neon مضبوطة وتستجيب */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await db()`SELECT 1`;
    json(res, 200, { ok: true, db: 'neon' });
  } catch {
    json(res, 503, { ok: false });
  }
}
