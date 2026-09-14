# Balneário 1º de Maio 🎂💸🍽️

App interna (mobile-first, bilingue **pt-PT / en-GB**) para gerir os **aniversários e bolos** e as
**multas** da equipa do **Clube Desportivo 1º de Maio** (Funchal, Madeira).

Todo o dinheiro das multas vai para os **jantares de equipa**: a app mostra o "fundo do jantar",
não uma caixa com movimentos. Cada jantar fecha o fundo recebido desde o jantar anterior.

Não há épocas: a equipa é uma só e os dados são contínuos. A única regra de calendário é a
**janela dos bolos**, de **7 de setembro a 31 de maio** — quem faz anos no verão (1 de junho a
6 de setembro) traz bolo numa data alternativa, definida pelo administrador.

As regras aplicam-se a **todos os membros** — jogadores **e** equipa técnica. Os treinadores
também levam multas, também trazem bolo e também podem ser caloteiro-mor.

---

## Índice

1. [Como funciona o acesso](#1-como-funciona-o-acesso)
2. [Stack](#2-stack)
3. [Configurar o Supabase (passo a passo)](#3-configurar-o-supabase-passo-a-passo)
4. [Configurar e correr a app](#4-configurar-e-correr-a-app)
5. [Deploy](#5-deploy)
6. [Alterar os PINs](#6-alterar-os-pins)
7. [Keep-alive (plano gratuito)](#7-keep-alive-plano-gratuito)
8. [Backup e reposição](#8-backup-e-reposição)
9. [Testes e verificações](#9-testes-e-verificações)
10. [Personalizar cores e logótipo](#10-personalizar-cores-e-logótipo)
11. [Estrutura do projeto](#11-estrutura-do-projeto)
12. [Notas de segurança](#12-notas-de-segurança)

---

## 1. Como funciona o acesso

Não há contas individuais. Existem **dois perfis**, cada um com um **PIN de 6 dígitos**:

| Perfil | PIN | O que pode fazer |
| --- | --- | --- |
| **Equipa** | partilhado com o plantel | Ver tudo (aniversários, multas, rankings, regulamento, jantares) e partilhar no WhatsApp |
| **Administrador** | só para quem gere | Tudo o anterior + atribuir multas, registar pagamentos e bolos, gerir membros e regulamento, prémios do bolo, jantares, histórico e backups |

Por trás, cada perfil é uma conta fixa no Supabase Auth em que **a password é o PIN**. O ecrã de
login só mostra "Equipa / Administrador" + PIN; os emails ficam em variáveis de ambiente.

> **Perfil de acesso ≠ tipo de membro.** Um treinador pode usar o PIN de administrador e continuar
> a aparecer nos rankings e no calendário de bolos como qualquer outro membro.

---

## 2. Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS + React Router
- **Dados:** `@supabase/supabase-js` + TanStack Query
- **i18n:** `i18next` / `react-i18next` (pt-PT e en-GB, sem strings fixas nos componentes)
- **Datas:** `date-fns` (locales `pt` e `enGB`) e fuso `Atlantic/Madeira`
- **Backend:** Supabase (PostgreSQL + Auth + Storage + **Row Level Security**)
- **PWA:** `manifest.json` + ícones + service worker mínimo
- Sem backend próprio: **todas as permissões são garantidas por RLS no Postgres**, nunca só na UI.

Requisitos para desenvolver: **Node 20.19+ ou 22.12+** e npm.

---

## 3. Configurar o Supabase (passo a passo)

### 3.1 Criar o projeto

1. Em [supabase.com](https://supabase.com) → **New project**.
2. Escolhe a região **West EU (London)** ou **Frankfurt** (mais perto da Madeira) e guarda a
   password da base de dados.
3. Em **Project Settings → API**, aponta o **Project URL** e a **anon public key** (precisas delas
   no passo 4). A `service_role key` **nunca** entra na app.

### 3.2 Correr as migrations e o seed

**Opção A — pelo Dashboard (mais simples):** abre **SQL Editor** e cola, **por esta ordem**, o
conteúdo de cada ficheiro, correndo um de cada vez:

1. `supabase/migrations/20260911000100_schema.sql` — tabelas, tipos e índices
2. `supabase/migrations/20260911000200_functions_triggers.sql` — funções, triggers e regras de negócio
3. `supabase/migrations/20260911000300_views.sql` — vistas `fine_stats` e `dinner_fund`
4. `supabase/migrations/20260911000400_rls.sql` — RLS e privilégios
5. `supabase/migrations/20260911000500_storage.sql` — bucket privado `member-photos`
6. `supabase/migrations/20260914000100_member_awards.sql` — prémio mensal "o mais estiloso"
7. **Ou** `supabase/squad.sql` — o plantel oficial (ver secção 3.7), **ou** `supabase/seed.sql` —
   dados de exemplo fictícios (ver secção 3.6). Nunca os dois.

**Opção B — pela CLI:**

```bash
npm i -g supabase
supabase link --project-ref <ref-do-projeto>
supabase db push          # aplica supabase/migrations/
psql "<connection string>" -f supabase/squad.sql   # plantel oficial
# ou, para dados de exemplo em vez do plantel real:
psql "<connection string>" -f supabase/seed.sql
```

### 3.3 Criar as duas contas (com auto-confirm)

**Authentication → Users → Add user → Create new user**, duas vezes:

| Email | Password (= PIN) | Auto Confirm User |
| --- | --- | --- |
| `admin@balneario.app` | 6 dígitos à tua escolha | ✅ ligado |
| `equipa@balneario.app` | 6 dígitos à tua escolha | ✅ ligado |

> Os domínios não precisam de existir — ninguém recebe email. O importante é o **Auto Confirm**
> estar ligado, senão o login falha.

### 3.4 Marcar os perfis (admin / team)

No **SQL Editor**, com os emails que criaste:

```sql
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
where email = 'admin@balneario.app';

update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"team"}'
where email = 'equipa@balneario.app';
```

Confirma:

```sql
select email, raw_app_meta_data ->> 'role' as role from auth.users;
```

> Se um dia mudares isto, a pessoa tem de **sair e entrar outra vez** (o role vive dentro do token).

### 3.5 Desativar registos públicos

**Authentication → Sign In / Providers → Email** → desligar **"Allow new users to sign up"**.
Sem isto, qualquer pessoa podia criar conta e ler os dados.

### 3.6 Dados de exemplo (seed)

O `supabase/seed.sql` cria 6 jogadores e 2 treinadores fictícios, o regulamento de exemplo, um
**jantar registado** (30/05/2026, com o fundo fechado em 33,00 €), multas pagas antes desse jantar
(portanto bloqueadas), uma paga **depois** (que conta para o fundo atual), multas por pagar, bolos
já trazidos, aniversários no verão sem data e prémios do bolo incompletos.

Antes de usar a app a sério, apaga os dados de exemplo:

```sql
begin;
set session_replication_role = replica;  -- não suja o histórico
truncate table cake_awards, member_awards, cakes, fines, fine_rules, members, dinners, activity_log restart identity cascade;
set session_replication_role = default;
commit;
```

Depois adiciona os membros reais e gera o calendário de bolos (ver a seguir).

### 3.7 Plantel oficial (`supabase/squad.sql`)

O `supabase/squad.sql` insere o plantel real: **26 jogadores e 3 treinadores**, gerado a partir da
lista oficial do clube em `data/1demais.xlsx`. Usa-o **em vez** do `seed.sql`, nunca os dois.

```bash
psql "<connection string>" -f supabase/squad.sql
```

Os ids são fixos, por isso podes correr o ficheiro outra vez sem duplicar ninguém: actualiza os
dados de quem já lá está. Ao inserir, o trigger `members_create_cake` cria logo a linha de bolo de
cada um — quem faz anos fora da janela (7 set – 31 mai) **ou já fez anos este ano** fica à espera de
uma data alternativa, a combinar em **Aniversários**.

> ⚠️ **Dados pessoais.** Este ficheiro e o `data/` têm nomes e datas de nascimento reais, e estão no
> `.gitignore` de propósito porque **este repositório é público**. Se quiseres versioná-los, torna o
> repositório privado primeiro — uma vez publicados, ficam no histórico e nas caches do GitHub.

---

## 4. Configurar e correr a app

```bash
cp .env.example .env.local     # e preenche os valores
npm install
npm run dev                    # http://localhost:5173
```

`.env.local`:

| Variável | O que é |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL do Supabase |
| `VITE_SUPABASE_ANON_KEY` | anon/public key |
| `VITE_ADMIN_EMAIL` | email da conta de administrador |
| `VITE_TEAM_EMAIL` | email da conta de equipa |
| `VITE_APP_URL` | URL público da app (entra no fim das mensagens do WhatsApp) |

> **Sem conta Supabase?** Para desenvolver localmente há um backend equivalente em Docker
> (Postgres + PostgREST + um gateway de autenticação), com as mesmas migrations, o mesmo seed e
> **o mesmo RLS**:
>
> ```bash
> ./scripts/dev-local/start.sh   # escreve o .env.local e aplica migrations + seed
> npm run dev
> ./scripts/dev-local/stop.sh
> ```
>
> PINs locais: **123456** (administrador) e **654321** (equipa). Detalhes e limitações
> (não há Storage, por isso os avatares usam as iniciais) em
> [`scripts/dev-local/README.md`](scripts/dev-local/README.md).

Primeiros passos dentro da app (com o PIN de administrador):

1. **Administração → Membros** → adicionar jogadores e equipa técnica (a foto adiciona-se depois de
   criar o membro).
2. **Aniversários → Gerar calendário** → cria a linha de bolo de cada membro (idempotente: nunca
   apaga datas alternativas nem bolos já trazidos).
3. **Administração → Regulamento** → ajustar regras e valores.

---

## 5. Deploy

Site estático: o `dist/` serve-se em qualquer lado. Já vão incluídos os ficheiros de configuração:

- **Cloudflare Workers** (o que está em uso): `wrangler.jsonc` — build `npm run build`, output `dist`.
  O encaminhamento das rotas da SPA vem de `assets.not_found_handling`, **não** de um `_redirects`:
  as duas coisas juntas fazem o deploy falhar com *"Infinite loop detected in this rule"*.
  O `public/_headers` continua a aplicar-se e é ele que traz o `noindex`.
- **Netlify:** `netlify.toml`
- **Vercel:** `vercel.json`
- **Cloudflare Pages** (caminho antigo): precisa de um `public/_redirects` com `/*  /index.html  200`,
  que foi removido por ser incompatível com os Workers.

Em qualquer plataforma, define as variáveis `VITE_*` nas **environment variables** do projeto
(têm de estar presentes no momento do build) e confirma que o header **`X-Robots-Tag: noindex`**
está ativo — a app tem nomes, datas de nascimento e multas.

Depois do primeiro deploy, no telemóvel: **Partilhar → Adicionar ao ecrã principal** instala a PWA.

---

## 6. Alterar os PINs

No Dashboard: **Authentication → Users** → clicar no utilizador → **Reset password** /
**Update user** → escrever o novo PIN de 6 dígitos → guardar.

Ou por SQL (a extensão `pgcrypto` já está instalada):

```sql
update auth.users
set encrypted_password = crypt('123456', gen_salt('bf'))
where email = 'equipa@balneario.app';
```

Quem já estava com sessão iniciada **não é expulso** (a sessão dura até expirar). Para forçar toda
a gente a entrar de novo: **Authentication → Users → … → Sign out user**.

---

## 7. Keep-alive (plano gratuito)

O plano gratuito do Supabase pausa projetos sem atividade durante 7 dias — exatamente o que
aconteceria nas férias (junho a agosto). O workflow `.github/workflows/keep-alive.yml` faz uma
**query real** à tabela `keep_alive` de 2 em 2 dias.

Secrets a criar em **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Valor |
| --- | --- |
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | anon/public key |
| `TEAM_EMAIL` | `equipa@balneario.app` |
| `TEAM_PIN` | PIN de 6 dígitos da conta de equipa |

O workflow autentica-se com o **perfil de equipa** (só leitura) — não precisa da `service_role key`.
Se mudares o PIN da equipa, atualiza o secret `TEAM_PIN`.

---

## 8. Backup e reposição

- **Administração → Backup e exportação → Backup completo** descarrega **um único JSON** com todas
  as tabelas. Faz isto de vez em quando (no fim da temporada, antes de mexidas grandes).
- Na mesma página exportas os dados em JSON: `multas-<data>.json`, `bolos-<data>.json` e
  `jantares-<data>.json` (valores em números, datas em `aaaa-mm-dd`, descrições em PT e EN).

Para **repor** um backup numa base de dados com as migrations aplicadas:

```bash
node scripts/backup-to-sql.mjs backup-balneario-2026-09-11.json > restore.sql
```

Depois cola o `restore.sql` no **SQL Editor** do Supabase. O script apaga os dados atuais e volta a
inserir os do backup dentro de uma transação, desligando temporariamente os triggers (histórico e
bloqueios do jantar) para que os dados entrem exatamente como estavam.

> As **fotos** vivem no Storage e não entram no backup JSON. Para as guardar, usa
> **Storage → member-photos → Download** no Dashboard.

---

## 9. Testes e verificações

```bash
npm run check        # i18n + tipos + testes + build
npm run i18n:check   # chaves em falta entre pt-PT e en-GB (e chaves usadas no código que não existem)
npm run test         # testes unitários (datas, aniversários, multas, partilha, exportações)
npm run typecheck
```

**Testes da base de dados** (RLS, bloqueios do jantar, prémios, calendário de bolos):
cola `supabase/tests/acceptance.sql` no SQL Editor. Corre dentro de uma transação e termina com
`rollback`, por isso **não altera dados**; imprime `ALL ACCEPTANCE TESTS PASSED` se estiver tudo bem.

Para correr as migrations e os testes localmente num Postgres normal (sem Supabase):

```bash
docker run -d --name balneario-pg -e POSTGRES_PASSWORD=postgres postgres:17-alpine
docker exec balneario-pg psql -U postgres -c "create database app"
for f in supabase/tests/supabase_stub.sql supabase/migrations/*.sql supabase/seed.sql; do
  docker exec -i balneario-pg psql -U postgres -d app -v ON_ERROR_STOP=1 -f - < "$f"
done
docker exec -i balneario-pg psql -U postgres -d app -f - < supabase/tests/acceptance.sql
```

O `supabase/tests/supabase_stub.sql` imita o mínimo da plataforma (roles, `auth.jwt()`, `storage`)
e **nunca deve ser corrido num projeto Supabase real**.

---

## 10. Personalizar cores e logótipo

- **Cores:** estão como variáveis CSS no topo de `src/index.css` (`--primary`, `--background`, …),
  em claro e escuro, e expostas ao Tailwind em `tailwind.config.ts`. O azul atual (`#0047AB`) é um
  **placeholder**: confirma os hex oficiais com o clube e muda só essas variáveis.
- **Logótipo:** o emblema do clube está em `assets/crest.jpg` e é a fonte única de todos os ícones.
  Para o trocar, põe o novo ficheiro em `assets/crest.{svg,png,webp,jpg}` (o SVG tem prioridade) e
  corre `npm run assets:generate`: refaz o logótipo do cabeçalho, o favicon, os ícones da PWA
  (incluindo o *maskable*), o ícone do iOS e a imagem de pré-visualização do WhatsApp.
  Numa fonte raster, o script torna transparente a folha à volta do emblema a partir dos quatro
  cantos, preservando os brancos internos do brasão.

---

## 11. Estrutura do projeto

```
src/
  components/     UI partilhada (botões, sheets, avatares, partilha, layout)
  hooks/          autenticação, queries e mutações (TanStack Query), calendário de bolos
  lib/            i18n, datas (Madeira), dinheiro, aniversários, partilha, exportações
  locales/        pt-PT.json e en-GB.json (todos os textos da interface)
  pages/          ecrãs; pages/admin/ só carrega para o perfil de administrador
  types/db.ts     tipos das tabelas e vistas
supabase/
  migrations/     esquema, lógica (janela dos bolos, jantares), vistas, RLS e storage
  seed.sql        dados de exemplo
  tests/          testes de aceitação SQL + stub para Postgres local
scripts/          i18n:check, geração de assets, backup → SQL
```

---

## 12. Notas de segurança

- **Sem login não se lê nada.** O papel `anon` não tem políticas nem privilégios (nem nas vistas).
- O perfil **equipa** lê tudo, mas qualquer `insert`/`update`/`delete` é recusado **pela base de
  dados**, não apenas escondido na interface.
- O **histórico** (`activity_log`) só é legível pelo administrador e só é escrito por triggers.
- **Ninguém apaga membros**: quem sai fica inativo (há um trigger que impede o `delete`).
- **Pagamentos fechados:** depois de um jantar registado, as multas pagas até essa data ficam
  bloqueadas (não se anulam, editam nem apagam) — garantido por trigger. A data e o valor do jantar
  também ficam imutáveis; só o jantar mais recente pode ser anulado.
- As **fotos** estão num bucket privado e são servidas por signed URLs temporárias.
- A app pede `noindex` no HTML, no `robots.txt` e no header `X-Robots-Tag`.
- O ano de nascimento só aparece ao administrador (a equipa vê dia e mês).

---

*CD 1º de Maio · Desde 1925* ⚽
