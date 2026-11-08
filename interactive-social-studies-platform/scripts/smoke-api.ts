/* اختبار دخاني محلي لمعالجات API دون DATABASE_URL — يجب أن تسقط بأمان */
import health from '../api/health';
import settings from '../api/settings';

function mkRes() {
  const r: {
    statusCode: number;
    body: unknown;
    status: (s: number) => typeof r;
    json: (d: unknown) => typeof r;
  } = {
    statusCode: 0,
    body: null,
    status(s) { this.statusCode = s; return this; },
    json(d) { this.body = d; return this; },
  };
  return r;
}

const req = { method: 'GET', query: {}, headers: {}, body: {} };

const r1 = mkRes();
await health(req as never, r1 as never);
console.log('HEALTH      →', r1.statusCode, JSON.stringify(r1.body));

const r2 = mkRes();
await settings(req as never, r2 as never);
console.log('SETTINGS    →', r2.statusCode, JSON.stringify(r2.body));
