

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
