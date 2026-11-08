import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

/* نقطة تشخيص مستقلة تمامًا — لا تستورد أي ملفات أخرى حتى لا تتوقف مع أي خطأ تحزيم */
const ENV_KEYS = ['DATABASE_URL', 'POSTGRES_URL', 'NEON_DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'POSTGRES_URL_NON_POOLING'];

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const foundKey = ENV_KEYS.find((k) => {
    const v = process.env[k];
    return typeof v === 'string' && v.trim().startsWith('postgres');
  });

  if (!foundKey) {
    const present = ENV_KEYS.filter((k) => process.env[k]);
    res.status(503).json({
      ok: false,
      stage: 'missing-env',
      hint: present.length > 0
        ? `المتغير ${present[0]} موجود لكن قيمته غير صالحة — يجب أن تبدأ بـ postgresql://`
        : 'DATABASE_URL غير موجود على الخادم — أضفه في Vercel ثم اضغط Redeploy',
    });
    return;
  }

  try {
    const sql = neon(process.env[foundKey] as string);
    await sql`SELECT 1 AS ok`;
    res.status(200).json({ ok: true, db: 'neon', via: foundKey });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(503).json({
      ok: false,
      stage: 'connect-fail',
      hint: `المتغير موجود لكن الاتصال فشل: ${msg.slice(0, 140)}`,
    });
  }
}
