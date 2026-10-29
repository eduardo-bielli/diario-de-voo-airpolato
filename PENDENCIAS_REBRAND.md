# Rebrand — Air Locks (master) → Air Polato (fork)

> Air Locks é o produto base/master. Air Polato é o primeiro fork.
> Cada fork tem seu próprio Supabase (dados do zero) e seu próprio config.js.
> Atualizado: 2026-10-29

## Arquitetura

| | Air Locks (master) | Air Polato (fork) |
|---|---|---|
| Deploy | locks-agenda.netlify.app | airpolato.netlify.app |
| Supabase | onoqei... (diario-de-voo) | lxejhx... (air-polato) |
| Repo | outro chat | este |

Regra: código genérico via APP_CONFIG → cada deploy só muda config.js.

## Feito

- [x] Air Locks → Air Polato nos 6 arquivos
- [x] backup-airlocks- → backup-airpolato-
- [x] Placeholder/login (seu.email@dominio.com / E-mail)
- [x] APP_CONFIG.APP_NAME = "Air Polato" nos 3 config.js
- [x] APP_CONFIG.DOMINIO_PADRAO = "airpolato.com.br" nos 3 config.js
- [x] Supabase URL/key via APP_CONFIG nos 3 web HTMLs
- [x] resetarSenha → airpolato.netlify.app nos 4 HTMLs
- [x] iOS alinhado via npx cap sync (14 matches APP_CONFIG, sem vestígios)
- [x] iOS config.js copiado + <script src> adicionado

## Pendências (curto prazo)

- [ ] Push origin/main (commit 662b896 + docs)
- [ ] Confirmar Netlify deploy source
- [ ] Testar login Eduardo + Jonathas em airpolato.netlify.app
- [ ] Testar "esqueci senha" → link airpolato.netlify.app
- [ ] iOS: rebuild via Xcode + testar
- [ ] normalizarEmail: exigir email completo (remover concatenação)

## Pendências (quando www.airpolato.com.br existir)

- [ ] Supabase Auth → URL Configuration: https://www.airpolato.com.br
- [ ] config.js (3 arquivos): RESET_URL: "https://www.airpolato.com.br/"
- [ ] resetarSenha (4 HTMLs): airpolato.netlify.app → www.airpolato.com.br
- [ ] Netlify custom domain + HTTPS
- [ ] iOS rebuild

## Notas

- NÃO apagar Supabase onoqei... (é do Air Locks master)
- NÃO apagar Supabase lxejhx... (é do Air Polato)
- capacitor-app/www/ é fonte da verdade do iOS (não editar ios/App/App/public/ direto)
