

## 🚀 Próximos Passos (TODOs para o Futuro)
- [ ] **Monitoramento de Erros:** Adicionar um observador global (`window.onerror`) para capturar erros no navegador do usuário e salvar na tabela de `logs` do Supabase.
- [ ] **Refatoração Front-end (Otimização Mobile):** Substituir o loop `setInterval(verificarERenderizar, 500)` (na aba de Voos Mobile) por um `MutationObserver`.
- [ ] **Otimização de Boot (Cache-First):** Refatorar a inicialização do sistema para ler o `localStorage` e renderizar a tela instantaneamente (Stale-While-Revalidate), enquanto atualiza os dados do Supabase (Users e Agenda) em background, notificando a UI apenas se houver mudanças.


## 📱 Sessão de Melhorias Mobile e Ajustes Desktop (Novembro/2026)

Nesta sessão, o foco foi a modernização da interface mobile e a correção de bugs estruturais, sempre mantendo o isolamento via CSS (`@media (max-width: 850px)`) para não afetar o Desktop.

### 1. Página Início (Mobile)
- **Cards de Voo:** Redesenho estilo "boarding pass". Remoção do ícone de calendário confuso, alinhamento do PAX à direita e badges de aeronave com fundo transparente (cor da aeronave).
- **Cards de Aeronave:** Layout horizontal. Imagem (`125x115px`) à esquerda, status ("Em operação", etc.) logo abaixo da foto.
- **Grade de Horas:** Implementação de uma tabela 2x2 na parte inferior do card da aeronave: `Horas Totais`, `Horas no Ano`, `Disponíveis` e `Venc. CVA`.
- **Card "Atenção" (Alertas):** Integrado à Home mobile, escondido por padrão se não houver alertas. O filtro de 30/60/90 dias foi sincronizado via `localStorage` com o Dashboard Desktop.
- **Botão Dispensar (X):** Reduzido para `16x16px` com fundo cinza claro no mobile.

### 2. Página Agenda (Mobile)
- **Refatoração do `makeCardHtml`:** O código foi reescrito para usar o mesmo visual "boarding pass" da Home. **CRÍTICO:** A nova função não depende de `_esc` ou `_fmtDDMM` (funções que só existem na Home), evitando `ReferenceError` que travava os menus do sistema.
- **Tags de Status:** Inclusão de tags visuais (`EXTRA`, `MANUT.`, `TROCA DE HR`, `BLOQUEADA`) e remoção da tag de "Voo Regular".

### 3. Modal de Revisão de Voo (Mobile)
- **Layout:** Transformado em tela cheia com visual de app nativo (fundo cinza, cards brancos arredondados).
- **Inputs e Botões:** Inputs compactos (altura 34px-36px). Ocultação de campos redundantes ("Total do abastecimento" e "Valor do combustível gasto"). Botões "Cancelar" e "Confirmar" em formato pílula, centralizados.
- **Tanque B4 T/O:** O texto longo "Tanque confirmado na decolagem" virou "Tanque B4 T/O" apenas no mobile (via classes CSS ocultas). O campo de input foi travado em `65px` e o seletor L/LB ganhou regras para não ser esmagado.
- **Regra de Exibição de Combustível:** O preço médio é **sempre** exibido em `R$/L`, mas a quantidade e a ordem de exibição (L ou LB primeiro) respeitam a configuração da aeronave (`tanque_unidade`). A função `calcularValorCombGasto` foi ajustada para formatar números com milhar e ocultar decimais quando inteiros.

### 4. Página Agenda (Desktop)
- **Altura Dinâmica:** A lista de "Próximos Voos" (`.day-list__body`) recebeu altura dinâmica usando `clamp(400px, calc(100vh - 190px), 850px)`. Isso resolveu o problema do "fundo branco infinito" sem quebrar os menus ou a rolagem global da página.
- **Scroll Interno:** O scroll agora ocorre dentro do card de "Próximos Voos", mantendo o calendário fixo.

### ⚠️ Aprendizados e Regras de Ouro Atualizadas
- **NUNCA usar Regex genérico/destrutivo** para substituir funções inteiras. Isso quebrou o arquivo durante a sessão. Usar sempre `start_marker` e `end_marker` com recorte de string (`c[:start] + new + c[end:]`).
- **Isolamento de CSS:** Ao criar regras que usam `display: flex` ou altura (`height`), usar `:not([hidden])` se a página for controlada pelo Router. Caso contrário, a página "flutua" sobre as outras e quebra os cliques do menu.
- **Backups Locais:** A criação de backups `.bak-...` antes de cada alteração grande salvou o projeto de perdas irreversíveis.

## 🛡️ Monitoramento e Segurança (Novembro/2026)
- **Monitoramento Global (`window.onerror`):** O sistema agora possui um "vigia" que captura erros de JavaScript (síncronos e Promises) e envia silenciosamente para a tabela `logs` do Supabase. Há um limite de 5 erros por sessão para proteger o egress.
- **Destaque em Registros:** A tela de "Registros" agora pinta as linhas de erro de JS com fundo vermelho claro (`#fef2f2`), borda vermelha e ícone 🚨, facilitando a identificação visual imediata.
- **Filtro de Pilotos (Novo Voo):** Ao selecionar uma aeronave, a lista de P1/P2 é automaticamente filtrada para exibir apenas os pilotos escalados para aquela aeronave (lendo de `dv.tripulacao.v1`).
- **Disponibilidade Inteligente:** O modal de disponibilidade abre limpo (sem pré-seleção) ao clicar no dia. Permite múltiplos eventos no mesmo dia (ex: Treinamento + Revalidação) e a função `pilotoIndisponivel` agora bloqueia e alerta a agenda caso um piloto esteja em revalidação.

## 🚀 Próximos Passos (Backlog)
- [ ] **Alerta de Erros via E-mail/Telegram:** Configurar um Database Webhook no Supabase para notificar o admin sempre que um novo log do tipo `erro_js` cair na tabela.
- [ ] **Exportação de Dados (Integração):** Desenhar a API (Edge Function) ou formato XLSX para enviar voos executados ao sistema da empresa.

## 🔑 Decisão: Tipo ICAO (ANAC) como chave canônica para Troca de Horas
- **Cadastro obrigatório:** toda aeronave precisa do campo `tipo_icao_anac` (4 caracteres, ex: `B350`, `PC12`, `TBM7`).
- **Nome comercial livre:** o usuário pode cadastrar "TBM Lindo", "King Air do João", etc. O sistema não se importa com o nome — usa o `tipo_icao_anac` para casar modelos.
- **Fonte de verdade:** o usuário consulta o código no portal da ANAC → https://aeronaves.anac.gov.br/aeronaves/ (campo "Tipo ICAO" em Detalhes Técnicos). Adicionar um link "Consultar na ANAC" ao lado do campo no modal de cadastro.
- **Validação:** 4 caracteres alfanuméricos. Bloquear o cadastro se o campo estiver vazio ou com formato inválido.
- **Fonte é a ANAC, não a ICAO global:** em casos como o TBM 960, a ANAC classifica como `TBM7` (não `TBM9`, que é a classificação FAA). Para um sistema brasileiro, ANAC manda.
- **Envelope de transferência (futuro hub):** leva `company_id` + `prefixo` + `tipo_icao_anac` + `nome_comercial`. B vê o nome, mas o sistema casa pelo `tipo_icao_anac`.
- **Válvula de escape (acordos entre empresas):** o botão de vinculação manual (`vinculado_a`) continua existindo. Ex: se A tem `PC12` e B tem `TBM7`, o admin de B pode vincular `PC12 → TBM7` com taxa `1.0`. A partir daí, toda transferência de `PC12` é convertida automaticamente em débito de `TBM7` no lado de B.
- **Caso especial `ZZZZ`:** aeronaves não homologadas/experimentais usam `ZZZZ` na ANAC. O cadastro aceita, mas a transferência automática por ICAO é bloqueada — exige vinculação manual.

## 🗺️ Mapeamento inicial das aeronaves em teste
| Aeronave | Empresa | Modelo Comercial | Tipo ICAO (ANAC) |
|---|---|---|---|
| PS-LKS | Air Locks | King Air 360 | `B350` |
| PS-STA | Air Polato | Pilatus PC-12 | `PC12` |
| (TBM) | Air Polato | TBM 960 | `TBM7` |

## 🔄 Transferência de Horas entre Empresas (Decisão Final - Nov 2026)

**Princípio:** O credor cria o link e envia o envelope. O devedor recebe e aplica. Nada é apagado, sempre estorno.

**Regras:**
- Mesmo ICAO: automático (sem link manual)
- ICAO diferente: credor cria link, envia envelope
- Devedor quer zerar: pede ao credor, que cria e envia
- Apagar crédito/débito: bloqueado, sempre estorno
- Envelope: sempre gerado, sem atalho de compensação
- Aviso "consulte empresa X": etiqueta de boa educação (não funcional)
- Conflito: impossível (só o credor cria)
- Chave canônica: modelo_credito_icao / modelo_debito_icao
- Nome no relatório: usa cadastro local, fallback para nome do envelope

**Envelope contém:** envelope_id, transfer_id, from/to_company, link (modelo_credito_icao, modelo_debito_icao, taxa, minutos), totais por modelo (credito_min, debito_min), snapshot (lista de entradas com id/tipo/minutos/origem/criado_em), hash SHA-256, assinatura HMAC.

**Validação ao receber:** valida assinatura + envelope_id (idempotência) + compara totais (por ICAO). Se bater, aplica. Se divergir: mostra diff + 3 opções (sincronizar com A / rejeitar / cancelar).

**Registro no ledger de B:** opção γ — registra +Xh modelo_debito e -Yh modelo_credito (saldo líquido 0, mas histórico mostra).

**Temporalidade:** vincular = converte saldo + aplica futuras; desvincular = saldo fica, futuras isoladas; vincular→desvincular→revincular = idempotente (só a 1ª conversão efetiva ocorre).

**Fases:**
- 0 (prep): migrar link para ICAO
- 1 (exportar): gerar envelope + salvar no hub (ou local + email)
- 2 (importar): receber + validar + preview + aplicar
- 3 (hub): tabelas hub_envelopes, hub_transfers, hub_audit + Edge Functions

**TODO futuro:** botão de abatimento; hub central; alerta de erro por email via Database Webhook.

## 🏢 Identidade da Empresa (Troca de Horas) — Decisão Final

**Invariantes (regras que o código precisa respeitar sempre):**

- **`id` é imutável.** Uma vez criado, nunca muda. Editar a empresa (nome, CNPJ, contato, logo, modelos) **não reescreve** o `id`.
- **`id` nunca é exibido ao usuário final.** Só em telas técnicas (auditoria, export, debug). Usuário vê `nome`.
- **Créditos, débitos, links e envelopes referenciam o `id`, nunca o `nome`.** Rename (mudança de nome/CNPJ) preserva o `id` e todo o histórico.
- **`id` é único.** Empresas novas usam `crypto.randomUUID()` (com fallback para `Date.now().toString(36) + random`). Empresas antigas (formato `th-e-\d{13}` de timestamp) continuam válidas — não precisam ser migradas porque já são únicas na prática, e migrar quebraria referências em créditos/débitos/links.
- **Snapshot de nome é guardado** em créditos/débitos de transferência para auditoria (vê o nome da época, não o atual). Relatórios mostram o nome atual + tooltip com histórico.

**Edge cases (decisão para o futuro):**
- **Rename:** `id` fica, `nome`/`cnpj` mudam. Registrar em `logs` (`"empresa X renomeada de 'A' para 'B'"`).
- **Merge (AMAGGI compra XYZ):** usar `parent_id` na empresa filha apontando para a mãe. Histórico preservado, operacionalmente são "uma empresa". Não mover créditos/débitos (perde rastreabilidade).
- **Split (AMAGGI se divide em Agro + Logística):** criar duas empresas com `id` novo + `parent_id` apontando para a original. Créditos/débitos antigos ficam na original (agora "mãe").

**Estado atual (auditoria Nov/2026):**
- 2 empresas, 10 lançamentos, 1 link, 5 modelos
- ✅ Sem IDs duplicados
- ✅ Sem lançamentos órfãos
- ✅ Sem links órfãos
- ✅ Todos os modelos têm ICAO
- ⚠️ 2 empresas com formato antigo de ID (`Date.now`) — esperado, não migrar
- ⚠️ 2 empresas sem CNPJ (AMAGGI, Teste) — opcional preencher via UI

**Fix aplicado (Nov/2026):** `id` de empresa nova trocado de `"th-e-" + Date.now()` para `"th-e-" + crypto.randomUUID()`. Backup: `teste-cache.html.bak-fix-company-id` em ambos os projetos.

## 📤 Fase 1 — Envelope de Transferência (Implementada Nov/2026)

### Princípio
O credor cria o link e gera o envelope. O devedor recebe e aplica. Nada é apagado — sempre estorno.

### Regras implementadas
- Mesmo ICAO: automático (sem link manual)
- ICAO diferente: credor cria link via "Aeronaves diferentes"
- Envelope carrega apenas lançamentos pendentes (enviado: false) da empresa selecionada
- Cada lançamento vai em um único envelope (campo envelope_id)
- Código único: TH-YYYY-XXXXXX (ex: TH-2026-VT5YQG)
- Hash SHA-256 calculado no momento da geração

### Estrutura do envelope
- envelope_id, transfer_code, schema_version
- from_company: tenant_id, name, logo
- to_company: empresa_id, name, cnpj, logo
- items: [{ id, tipo, modelo, modelo_icao, minutos }]
- links_aplicados: [{ link_id, modelo_credito_icao, modelo_debito_icao, taxa }]
- totais: { ICAO: { credito_min, debito_min } }
- hash (sha256), signature (TODO), created_at

### Fluxo implementado
1. Admin seleciona empresa no filtro
2. Bolinha indica estado: verde (tudo enviado) / amarela (tem pendente) / cinza (sem empresa ou sem lançamento)
3. Botão Enviar gera envelope com pendentes, abre modal com código + resumo
4. Botão Histórico lista envelopes já gerados (re-download)
5. Botão Receber é stub (Fase 2)
6. Botões/bolinha escondidos quando empresa não tem lançamento

### Alterações no código
- Migração: campo enviado, envelope_id, enviado_em, modelo_icao nos 10 lançamentos existentes
- Novos lançamentos: nascem com esses 4 campos + UUID (não mais Date.now)
- Função gerarEnvelope(empId): filtra pendentes, agrupa por ICAO, calcula hash, salva em dv.trocaHoras.envelopes.v1, marca enviado: true
- Modal injectModalEnvelope(): código + resumo + Copiar + Baixar JSON + Fechar
- abrirHistoricoEnvelopes(empId): lista de envelopes com re-download
- atualizarStatusEnvelope(): calcula bolinha e mostra/esconde botões

### Storage keys novos
- dv.trocaHoras.envelopes.v1 (array de envelopes gerados)
- dv.trocaHoras.v1.bak-pre-migracao-envelope (backup)

### Fase 2 (próxima)
- Receber envelope: modal para colar código/upload JSON
- D3: bloqueio total se envelope.to_company nao for a empresa logada
- Validacao: hash + idempotencia (envelope_id ja aplicado?)
- Preview: mostra itens antes de aplicar
- Aplicar: cria espelhos invertidos (enviado: true, origem: importacao, envelope_origem: TH-2026-XXXX)
- Divergencia: se totais nao batem, mostra lado a lado + 3 opcoes
- Sem envelope de retorno (ack) - recebimento implicito

### Cleanup (futuro)
- Dados de teste criados em 06/11/2026 precisarao ser removidos
- Script: filtrar por criado_em >= data_ancora, backup antes, confirmacao dupla
