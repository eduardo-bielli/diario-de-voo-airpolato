
---

## 📧 6. Contraste do Header do E-mail (Edge Function)

- **Arquivo:** `supabase/functions/send-flight-email/index.ts`
- **Onde:** função `montarHTML()`, no header do template (linhas ~387-388)
- **O que muda:** "Roteiro do voo" e "Voo regular" usam `textSegColor` (calculado por `getContrastColor()`) em vez do branco hardcoded
- **Motivo:** Air Polato permite fundos claros no header do email. Sem o fix, texto branco fica ilegível em fundos claros.
- **Air Locks:** NÃO precisa desse fix (usa cores escuras fixas no header).

**Deploy:** esse arquivo é a Edge Function. Toda vez que editar, precisa fazer **deploy manual no Supabase** (Dashboard → Edge Functions → send-flight-email → colar → Deploy), pois o CLI pode dar erro 403/Docker.
