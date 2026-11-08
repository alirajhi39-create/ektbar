/* محاكاة محلية لكل دوال API للتأكد من أنها تُحمّل وتستجيب بأمان */
import health from '../api/health';
import auth from '../api/auth';
import questions from '../api/questions';
import settings from '../api/settings';
import results from '../api/results';

function mkRes() {
  const r = {
    statusCode: 0,
    body: '' as string,
    status(s: number) { this.statusCode = s; return this; },
    json(d: unknown) { this.body = JSON.stringify(d); return this; },
  };
  return r;
}

const handlers: [string, (req: unknown, res: unknown) => Promise<unknown>][] = [
  ['health', health as never], ['auth', auth as never], ['questions', questions as never],
  ['settings', settings as never], ['results', results as never],
];

for (const [name, fn] of handlers) {
  const req = { method: 'GET', query: name === 'auth' ? { action: 'status' } : {}, headers: {}, body: {} };
  const res = mkRes();
  try {
    await fn(req as never, res as never);
    console.log(`${name.padEnd(10)} → ${res.statusCode}: ${res.body.slice(0, 110)}`);
  } catch (e) {
    console.log(`${name.padEnd(10)} → THREW: ${e instanceof Error ? e.message.slice(0, 110) : String(e)}`);
  }
}
