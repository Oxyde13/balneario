// Gateway de desenvolvimento: imita a superfície do Supabase (/auth/v1 + /rest/v1)
// em frente a um PostgREST local. Serve para correr a app sem conta Supabase.
// NÃO é para produção: as passwords estão em claro aqui.
import { createServer } from 'node:http';
import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const PORT = 54321;
const REST = 'http://127.0.0.1:54322';
const SECRET = process.env.JWT_SECRET ?? readFileSync(new URL('./.jwt.secret', import.meta.url), 'utf8').trim();

const USERS = [
  { id: '11111111-1111-4111-8111-111111111111', email: 'admin@balneario.app', pin: '123456', role: 'admin' },
  { id: '22222222-2222-4222-8222-222222222222', email: 'equipa@balneario.app', pin: '654321', role: 'team' },
];

const b64 = (input) => Buffer.from(input).toString('base64url');

function sign(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    app_metadata: { provider: 'email', role: user.role },
    user_metadata: {},
    iat: now,
    exp: now + 3600,
  };
  const head = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64(JSON.stringify(payload));
  const signature = createHmac('sha256', SECRET).update(`${head}.${body}`).digest('base64url');
  return { token: `${head}.${body}.${signature}`, expiresAt: payload.exp };
}

const publicUser = (user) => ({
  id: user.id,
  aud: 'authenticated',
  role: 'authenticated',
  email: user.email,
  email_confirmed_at: '2026-09-01T00:00:00Z',
  app_metadata: { provider: 'email', role: user.role },
  user_metadata: {},
  identities: [],
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
});

function session(user) {
  const { token, expiresAt } = sign(user);
  return {
    access_token: token,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: expiresAt,
    refresh_token: `refresh-${user.id}`,
    user: publicUser(user),
  };
}

const cors = (res, origin) => {
  res.setHeader('Access-Control-Allow-Origin', origin ?? '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS,HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'authorization,apikey,content-type,prefer,accept,accept-profile,content-profile,range,x-client-info,x-supabase-api-version');
  res.setHeader('Access-Control-Expose-Headers', 'content-range,content-profile,x-total-count');
  res.setHeader('Access-Control-Max-Age', '86400');
};

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });

const userFromToken = (authorization) => {
  const token = (authorization ?? '').replace(/^Bearer\s+/i, '');
  const [, body] = token.split('.');
  if (!body) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString());
    return USERS.find((user) => user.id === claims.sub) ?? null;
  } catch {
    return null;
  }
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // ---- Auth ----
  if (url.pathname === '/auth/v1/token') {
    const body = JSON.parse((await readBody(req)).toString() || '{}');
    const grant = url.searchParams.get('grant_type');

    if (grant === 'refresh_token') {
      const user = USERS.find((candidate) => `refresh-${candidate.id}` === body.refresh_token);
      if (!user) return json(res, 400, { error: 'invalid_grant', message: 'Invalid Refresh Token' });
      console.log(`[auth] refresh ${user.email}`);
      return json(res, 200, session(user));
    }

    const user = USERS.find((candidate) => candidate.email === body.email);
    if (!user || user.pin !== body.password) {
      console.log(`[auth] PIN errado para ${body.email}`);
      return json(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials', code: 'invalid_credentials', message: 'Invalid login credentials' });
    }
    console.log(`[auth] login ${user.email} (${user.role})`);
    return json(res, 200, session(user));
  }

  if (url.pathname === '/auth/v1/user') {
    const user = userFromToken(req.headers.authorization);
    if (!user) return json(res, 401, { message: 'invalid claim' });
    return json(res, 200, publicUser(user));
  }

  if (url.pathname === '/auth/v1/logout') {
    res.writeHead(204);
    return res.end();
  }

  // ---- Storage (não disponível localmente: os avatares usam as iniciais) ----
  if (url.pathname.startsWith('/storage/v1/')) {
    return json(res, 501, { message: 'Storage não está disponível no gateway local', statusCode: '501' });
  }

  // ---- REST -> PostgREST ----
  if (url.pathname.startsWith('/rest/v1/')) {
    const target = `${REST}${url.pathname.replace('/rest/v1', '')}${url.search}`;
    const headers = {};
    for (const name of ['authorization', 'content-type', 'prefer', 'accept', 'range', 'accept-profile', 'content-profile']) {
      if (req.headers[name]) headers[name] = req.headers[name];
    }
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readBody(req);
    try {
      const upstream = await fetch(target, { method: req.method, headers, body: body?.length ? body : undefined });
      const text = await upstream.text();
      if (upstream.status >= 400) console.log(`[rest] ${req.method} ${url.pathname}${url.search} -> ${upstream.status} ${text.slice(0, 160)}`);
      res.writeHead(upstream.status, {
        'content-type': upstream.headers.get('content-type') ?? 'application/json',
        ...(upstream.headers.get('content-range') ? { 'content-range': upstream.headers.get('content-range') } : {}),
        'access-control-allow-origin': req.headers.origin ?? '*',
        'access-control-expose-headers': 'content-range',
      });
      return res.end(text);
    } catch (error) {
      return json(res, 502, { message: `PostgREST inacessível: ${error.message}` });
    }
  }

  return json(res, 404, { message: `Rota não suportada pelo gateway: ${url.pathname}`, request_id: randomUUID() });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Gateway Supabase-lite em http://127.0.0.1:${PORT}`);
  console.log('  admin@balneario.app  PIN 123456  (administrador)');
  console.log('  equipa@balneario.app PIN 654321  (equipa)');
});
