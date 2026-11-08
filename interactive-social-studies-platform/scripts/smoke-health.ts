/* اختبار نقطة التشخيص الجديدة */
import health from '../api/health';

function mkRes() {
  const r = {
    statusCode: 0,
    body: '' as string,
    status(s: number) { this.statusCode = s; return this; },
    json(d: unknown) { this.body = JSON.stringify(d); return this; },
  };
  return r;
}

const scenarios: [string, Record<string, string>][] = [
  ['بدون أي متغير', {}],
  ['قيمة غير صالحة', { DATABASE_URL: 'not-a-postgres-url' }],
  ['رابط سليم الشكل (سيفشل الاتصال)', { DATABASE_URL: 'postgresql://u:p@nonexistent-host.neon.tech/db?sslmode=require' }],
];

for (const [label, env] of scenarios) {
  delete process.env.DATABASE_URL;
  delete process.env.POSTGRES_URL;
  Object.assign(process.env, env);
  const res = mkRes();
  await health({ method: 'GET', query: {}, headers: {}, body: {} } as never, res as never);
  console.log(`${label} → ${res.statusCode}`);
  console.log(`   ${(JSON.parse(res.body) as { hint?: string }).hint ?? 'OK'}`);
}
