# TODO — Pendências conhecidas

## 🔴 Alta prioridade

- [ ] **Flush do debounce de 500ms**
  - Problema: se clicar num checkbox e der F5 em <500ms, o save pro Supabase é cancelado e o dado volta.
  - Onde: `agendar()` perto da linha 3480 em `teste-cache.html`
  - Solução: `beforeunload` + `pagehide` + `visibilitychange` chamando `flushPending()`
  - Preciso guardar o valor junto com o timer em `_pending[k] = { value, timer }`

## 🟡 Média prioridade

- [ ] **Fluxo inverso de solicitante**
  - Hoje: só dá pra vincular pelo checkbox "Também é solicitante" no form do usuário
  - Falta: no form do solicitante, um `<select>` pra escolher o usuário (ex: cadastrar João/José/Paulo e vincular ao Marcelo)

- [ ] **Limpeza de backups**
  - Tem ~250 arquivos `.bakNNN`, `.BACKUP-antes-*`, `.ESTAVEL-*` na pasta
  - Mover pra `_backups/` ou deletar os mais antigos
  - Já estão no `.gitignore`, então não vão pro git nem pro Netlify

## 🟢 Baixa prioridade / ideias

- [ ] Trocar badge `+N` por ícones ou tooltip com nomes dos vínculos
- [ ] Documentar arquitetura (README.md): sync localStorage↔Supabase, vínculos, debounce

## 🚀 Deploy

Sempre rodar antes de arrastar pro Netlify:
## ✅ Feito recentemente

- [x] **Eliminar FOUC de tema** (17/10)
  - Script inline no `<head>` aplica CSS vars do localStorage antes do body
  - `Theme.load()` aplica local primeiro, cloud depois
- [x] Vínculos passageiro ↔ usuário (checkboxes, sync, badge +N)
- [x] Vínculo solicitante múltiplo
- [x] Menu reorganizado em 4 seções (Home / Operação / Administração / Configurações)
- [x] Campo "Vincular usuário" do passageiro restrito a admin
- [x] Email roteiro resolve solicitante_id como user_id (dono correto)

## 📧 Configuração de E-mail (Pausado)
- [ ] **Verificar Domínio no SendPulse**
  - **Motivo:** SendPulse bloqueia envio (erro 422) para contas ativas sem domínio verificado.
  - **Onde resolver:** Painel do SendPulse > Configurações > Autenticação de e-mail.
  - **O que fazer:** Adicionar `gupolocks.com.br`, copiar os registros SPF e DKIM, colar no painel de DNS do domínio (Registro.br / Cloudflare / Hospedagem).
  - **Após verificar:** No sistema (Configurações > E-mail), ativar o SendPulse novamente.
  
- [ ] **(Alternativa) Reivindicar Domínio no Resend**
  - **Motivo:** Resend só envia para o e-mail do dono até o domínio ser verificado.
  - **Onde resolver:** Resend > Domains > Add Domain e seguir o processo de "Claim Domain".

## 📧 E-mail (Pendente de Melhoria)
- [ ] Criar um e-mail dedicado (ex: agenda@grupolocks.com.br) e conectar no Keplars.
  - Motivo: O OAuth do Hotmail força o nome pessoal do dono da conta no remetente.
  - Solução futura: Conectar a nova conta no Keplars ou verificar o domínio (se o TI liberar o DNS).

## 🎨 Lembretes para Amanhã
- [ ] Fazer o upload do novo logo da empresa (que será usado no sistema e como favicon).
- [ ] Atacar o Flush do debounce de 500ms (proteção contra perda de dados).
- [ ] Configurar o e-mail definitivo no Keplars (se já tiver a conta nova).

## 🚀 Próximos Passos (A definir)

### 🛡️ 1. Segurança e Estabilidade (Curto Prazo)
- [ ] Aplicar o modelo **Pessimistic UI** (salvar sincrono aguardando o Supabase) nas operações críticas:
  - [ ] Excluir Aeronave
  - [ ] Excluir Voo Revisado
  - [ ] Edição manual do Tanque na ficha da Aeronave
- [ ] Limpar quaisquer logs de `[DEBUG]` que tenham sobrado no código.

### 📱 2. Projeto App Mobile (Apple)
- [ ] Definir a stack (Recomendado: React Native com Expo).
- [ ] Criar RPCs no Supabase para centralizar a lógica de negócios (cálculos de custo/combustível).
- [ ] Aprovar o layout visual do App (arquivo `app-preview.html` criado).
- [ ] Configurar o ambiente iOS (Xcode / Apple Developer Program).

### 🔧 3. Manutenção (Longo Prazo)
- [ ] Atualizar o `vendor.min.js` do Supabase a cada 6 meses (versão atual: 2.45.4).
- [ ] Atualizar a documentação do projeto (`README.md`).
