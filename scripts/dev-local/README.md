# Backend local (opcional)

Para desenvolver **sem criar um projeto Supabase**: Postgres + PostgREST + um pequeno gateway
que imita `/auth/v1` e `/rest/v1`.

```bash
./scripts/dev-local/start.sh   # aplica migrations + seed e escreve .env.local
npm run dev                    # http://localhost:5173
./scripts/dev-local/stop.sh
```

PINs: **123456** (administrador) e **654321** (equipa) — definidos em `gateway.mjs`.

O que é igual ao Supabase: o esquema, as migrations, o seed e **o RLS** (o perfil equipa continua
a não poder escrever nada, o `activity_log` continua invisível para ele).

O que **não** existe aqui: Storage (as fotos não podem ser carregadas; os avatares mostram as
iniciais), rate limiting do Auth e refresh tokens a sério. Isto é só para desenvolvimento — as
passwords estão em claro em `gateway.mjs`.
