

## 🚀 Próximos Passos (TODOs para o Futuro)
- [ ] **Monitoramento de Erros:** Adicionar um observador global (`window.onerror`) para capturar erros no navegador do usuário e salvar na tabela de `logs` do Supabase.
- [ ] **Refatoração Front-end (Otimização Mobile):** Substituir o loop `setInterval(verificarERenderizar, 500)` (na aba de Voos Mobile) por um `MutationObserver`.
- [ ] **Otimização de Boot (Cache-First):** Refatorar a inicialização do sistema para ler o `localStorage` e renderizar a tela instantaneamente (Stale-While-Revalidate), enquanto atualiza os dados do Supabase (Users e Agenda) em background, notificando a UI apenas se houver mudanças.
