# Rebrand — Air Locks (master) → Air Polato (fork)

> **Contexto**: Air Locks é o **produto base/master**. Air Polato é o **primeiro fork**.
> Cada fork tem seu próprio Supabase (dados do zero) e seu próprio `config.js`.
>
> Última atualização: 2026-10-29

## Arquitetura multi-cliente

| | Air Locks (master) | Air Polato (fork) |
|---|---|---|
| Deploy | `locks-agenda.netlify.app` | `airpolato.netlify.app` |
| Supabase | `onoqei...` (`diario-de-voo`) | `lxejhx...` (`air-polato`) |
| Repo | outro chat | este (`diario-de-voo-airpolato`) |

**Regra**: código genérico via `APP_CONFIG` → cada deploy só muda `config.js`.

## Feito neste fork (Air Polato)

- [x] `Air Locks` → `Air Polato` nos 6 arquivos ativos
- [x] `backup-airlocks-` → `backup-airpolato-`
- [x] Placeholder/login: `seu.email@dominio.com` / `E-mail`
- [x] `APP_NAME: "Air Polato"` nos 3 `config.js`
- [x] `DOMINIO_PADRAO: "airpolato.com.br"` nos 3 `config.js`
- [x] Supabase URL/key via `APP_CONFIG` nos 3 web HTMLs
- [x] `resetarSenha` → `airpolato.netlify.app` nos 4 HTMLs
- [x] iOS: Supabase URL/key + `DOMINIO_PADRAO` (`airpolato.com.br` ou via APP_CONFIG)
- [x] iOS: `config.js` copiado pro pacote

## Pendências (curto prazo)

- [ ] Confirmar que o commit `662b896` incluiu iOS + config.js
- [ ] iOS carregar `config.js` via `<script src="config.js"></script>` e usar `APP_CONFIG.*`
- [ ] `normalizarEmail`: exigir email completo (remover concatenação com `DOMINIO_PADRAO`)
- [ ] Push `origin/main` e confirmar deploy Netlify
- [ ] Testar login Eduardo + Jonathas em `airpolato.netlify.app`
- [ ] Testar "esqueci senha" → link `airpolato.netlify.app`
- [ ] iOS rebuild via Capacitor

## Pendências (quando `www.airpolato.com.br` existir)

- [ ] Supabase Auth → URL Configuration: `https://www.airpolato.com.br` + redirects
- [ ] `config.js` (3 arquivos): `RESET_URL: "https://www.airpolato.com.br/"`
- [ ] `resetarSenha` (4 HTMLs): `airpolato.netlify.app` → `www.airpolato.com.br`
- [ ] Netlify custom domain + HTTPS
- [ ] iOS rebuild

## Notas

- **Não apagar** projeto Supabase `onoqeiekjbjlfnfukgbh` (é o do Air Locks master, outro chat).
- **Não apagar** projeto Supabase `lxejhxguoyfkszdfwrow` (é o do Air Polato, este fork).
- `config.js` do `capacitor-app/www/` tinha key diferente (`sbp_fca0...`) — confirmar no dashboard do `air-polato` qual é a key oficial.
