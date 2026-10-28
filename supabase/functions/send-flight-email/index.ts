/* ============================================================
   send-flight-email — Envia roteiro do voo pros envolvidos
   ------------------------------------------------------------
   - Passageiros/solicitante: nome da localidade
   - Pilotos: rota completa em ICAO + bloco de passageiros
   - Logo enviada como CID attachment (compatível com Gmail/Outlook)
   - Cores: mesma cor1/cor2 do relatório PDF
   ============================================================ */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  if (!token) return json({ error: "Missing token" }, 401);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SECRET_KEY")!
  );
  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user) return json({ error: "Invalid token" }, 401);

  /* ==== Config de e-mail: banco (SendPulse) com fallback pra env vars (Resend) ==== */
  const KEPLARS_KEY = Deno.env.get("KEPLARS_API_KEY");
  const FROM_EMAIL = "eduardonb1982@hotmail.com";
  const FROM_NAME  = "Agenda Grupo Locks";
  if (!KEPLARS_KEY) return json({ error: "KEPLARS_API_KEY não configurada" }, 500);

  let body;
  try { body = await req.json(); } catch(e) { return json({ error: "JSON inválido" }, 400); }
  const { tipo = "novo", empresa = {}, voo = {}, destinatarios = [], mudancas = [] } = body || {};
  if (!voo || !Array.isArray(destinatarios) || !destinatarios.length) {
    return json({ error: "Faltam dados (voo ou destinatarios)" }, 400);
  }

  /* ==== Logo: data URL inline (Keplars) ==== */
  if (empresa.logo_b64 && empresa.logo_mime) {
    empresa._logo_src = "data:" + empresa.logo_mime + ";base64," + empresa.logo_b64;
  }

  let enviados = 0, falhas = 0, primeiroErro = null;
  for (const dest of destinatarios) {
    if (!dest.email || !dest.email.includes("@")) { falhas++; continue; }
    try {
      const html = montarHTML({ tipo, empresa, voo, mudancas, dest });
      const assunto = montarAssunto({ voo, dest });
      const htmlPessoal = html.replace(/__NOME_DEST__/g, escHtml(dest.nome || ""));

      let ok = false, errMsg = null;
      const res = await enviarViaKeplars(KEPLARS_KEY, {
        from_name: FROM_NAME,
        from_email: FROM_EMAIL,
        to_email: dest.email,
        to_name: dest.nome || "",
        subject: assunto,
        html: htmlPessoal
      });
      ok = res.ok;
      errMsg = res.err;

      if (ok) enviados++;
      else {
        falhas++;
        if (!primeiroErro) primeiroErro = errMsg;
      }
    } catch(e) {
      falhas++;
      if (!primeiroErro) primeiroErro = String(e.message || e);
    }
  }

  try {
    const { data: perfil } = await sb.from("users").select("nome, email").eq("id", user.id).single();
    await sb.from("logs").insert({
      user_id: user.id,
      user_nome: perfil?.nome || null,
      user_email: perfil?.email || null,
      tipo: "email",
      acao: tipo === "atualizacao" ? "enviar_atualizacao" : "enviar_roteiro",
      alvo: (voo.trechos?.[0]?.origem || "?") + "→" + (voo.trechos?.[voo.trechos.length-1]?.destino || "?") + " (" + (voo.aeronave_tail || "—") + ")",
      detalhe: { enviados, falhas, total: destinatarios.length, primeiroErro }
    });
  } catch(e) { console.warn("[send-flight-email] log falhou:", e.message); }

  return json({ ok: enviados > 0, enviados, falhas, erro: primeiroErro });
});

/* ============ HELPERS ============ */

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function escHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

function fmtData(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return d + "/" + m + "/" + y;
}

function isPiloto(dest) { return dest?.tipo === "piloto"; }
function isSolicitante(dest) { return dest?.tipo === "solicitante"; }

/* Calcula hora de pouso: hora + duracao. Retorna "HH:MM" ou null. */
function computeETA(hora, duracao) {
  if (!hora || !duracao || duracao === "00:00") return null;
  const [h,m] = hora.split(":").map(Number);
  const [dh,dm] = duracao.split(":").map(Number);
  if (isNaN(h) || isNaN(m) || isNaN(dh) || isNaN(dm)) return null;
  const totalMin = h*60 + m + dh*60 + dm;
  const eh = Math.floor(totalMin/60) % 24;
  const em = totalMin % 60;
  return String(eh).padStart(2,"0")+":"+String(em).padStart(2,"0");
}

/* Delta de fuso entre origem e destino (minutos). Null se sem dados. */
function deltaFusoMin(origemLocal, destinoLocal) {
  if (origemLocal?.utc_offset == null || destinoLocal?.utc_offset == null) return null;
  return (destinoLocal.utc_offset - origemLocal.utc_offset) * 60;
}

/* Formata delta em string curta: "+1h", "-2h", "+30min", "" (se 0/null) */
function fmtDeltaFuso(deltaMin) {
  if (deltaMin == null || deltaMin === 0) return "";
  const sinal = deltaMin > 0 ? "+" : "−";
  const absMin = Math.abs(deltaMin);
  const h = Math.floor(absMin / 60);
  const m = absMin % 60;
  if (h && m) return sinal + h + "h" + String(m).padStart(2,"0");
  if (h) return sinal + h + "h";
  return sinal + m + "min";
}

/* Pouso em hora local do destino, aplicando delta de fuso */
function computePousoLocal(t) {
  const etaOrigem = computeETA(t.hora, t.duracao);
  if (!etaOrigem) return { hora: "—", delta: "" };
  const delta = deltaFusoMin(t.origem_local, t.destino_local);
  if (!delta) return { hora: etaOrigem, delta: "" };
  const [h,m] = etaOrigem.split(":").map(Number);
  let totalMin = h*60 + m + delta;
  /* Normaliza pra 0-1439 */
  totalMin = ((totalMin % 1440) + 1440) % 1440;
  const eh = Math.floor(totalMin/60);
  const em = totalMin % 60;
  const etaDestino = String(eh).padStart(2,"0")+":"+String(em).padStart(2,"0");
  return { hora: etaDestino, delta: fmtDeltaFuso(delta) };
}

/* Passageiro vê só os trechos onde ele está em passageiros_ids.
   Piloto / solicitante veem tudo. */
function trechosParaDestinatario(voo, dest) {
  const todos = (voo.trechos || []).slice().sort((a,b) => (a.data+a.hora).localeCompare(b.data+b.hora));
  /* Só passageiro PURO filtra. Solicitante/piloto que também é passageiro vê tudo. */
  if (dest?.tipo === "passageiro" && dest?.passageiro_id) {
    const filtrados = todos.filter(t => {
      const ids = Array.isArray(t.passageiros_ids) ? t.passageiros_ids : [];
      return ids.some(id => String(id) === String(dest.passageiro_id));
    });
    if (filtrados.length > 0) return filtrados;
  }
  return todos;
}

function rotaCompletaICAO(trechos) {
  if (!trechos?.length) return "?";
  const seq = [];
  trechos.forEach((t, i) => {
    if (i === 0) seq.push(t.origem || "?");
    seq.push(t.destino || "?");
  });
  return seq.join(" → ");
}

function montarAssunto({ voo, dest }) {
  const trs = trechosParaDestinatario(voo, dest);
  const t0 = trs[0] || {};
  const data = t0.data ? fmtData(t0.data) : "—";

  if (isPiloto(dest)) {
    return `Voo agendado · ${rotaCompletaICAO(trs)} · ${data}`;
  }
  const nomeOrig = t0.origem_local?.nome || t0.origem_local?.cidade || t0.origem || "?";
  const ufOrig   = t0.origem_local?.uf || "";
  const nomeDest = t0.destino_local?.nome || t0.destino_local?.cidade || t0.destino || "?";
  const ufDest   = t0.destino_local?.uf || "";
  const rota = nomeOrig + (ufOrig ? " (" + ufOrig + ")" : "") + " → " + nomeDest + (ufDest ? " (" + ufDest + ")" : "");
  if (isSolicitante(dest)) {
    return `Você acaba de criar o voo ${rota}`;
  }
  return `Você foi adicionado ao voo ${rota}`;
}

function labelLocalHTML(local, icao, paraPiloto) {
  if (paraPiloto) {
    return `<div style="font-size:22px;font-weight:800;color:#111827;font-family:ui-monospace,monospace">${escHtml(icao || "?")}</div>`;
  }
  const nome = (local?.nome || "").trim();
  const cid  = (local?.cidade || "").trim();
  const uf   = (local?.uf || "").trim().toUpperCase();
  if (!nome && !cid) {
    return `<div style="font-size:20px;font-weight:800;color:#111827;font-family:ui-monospace,monospace">${escHtml(icao || "?")}</div>`;
  }
  const principal = nome || cid;
  let sub = "";
  if (nome && cid) sub = cid + (uf ? " · " + uf : "");
  else if (nome && uf) sub = uf;
  else if (cid && uf && cid !== principal) sub = uf;
  if (nome && cid && nome.toUpperCase() === cid.toUpperCase()) sub = uf;
  return `<div style="font-size:15px;font-weight:800;color:#111827;line-height:1.25">${escHtml(principal)}</div>`
       + (sub ? `<div style="font-size:11px;color:#9ca3af;margin-top:3px;font-weight:600">${escHtml(sub)}</div>` : "");
}

function saudacao(dest) {
  if (isPiloto(dest)) {
    return 'Olá, comandante <b>__NOME_DEST__</b>! Você está escalado para o voo abaixo.';
  }
  if (isSolicitante(dest)) {
    return 'Olá, <b>__NOME_DEST__</b>! Você acaba de criar o voo abaixo.';
  }
  return 'Olá, <b>__NOME_DEST__</b>! Você foi adicionado ao voo abaixo.';
}

/* Escurece um hex (ex: "#1e293b" → "#0f1a24"). factor 0 = preto, 1 = original */
function escurecer(hex, factor) {
  if (!hex || !hex.startsWith("#")) return hex;
  const h = hex.replace("#", "");
  const r = Math.round((parseInt(h.slice(0,2), 16) || 0) * factor);
  const g = Math.round((parseInt(h.slice(2,4), 16) || 0) * factor);
  const b = Math.round((parseInt(h.slice(4,6), 16) || 0) * factor);
  const toHex = (n) => n.toString(16).padStart(2, "0");
  return "#" + toHex(r) + toHex(g) + toHex(b);
}

/* Converte hex em rgba (pra sombras/overlays) */
function hexToRgba(hex, alpha) {
  const h = (hex || "#000000").replace("#", "");
  const r = parseInt(h.slice(0,2), 16) || 0;
  const g = parseInt(h.slice(2,4), 16) || 0;
  const b = parseInt(h.slice(4,6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ============ Keplars helper ============ */

async function enviarViaKeplars(apiKey, { from_name, from_email, to_email, to_name, subject, html }) {
  try {
    // Remove a tag <img src="cid:logo"> (Keplars nao suporta CID inline nesta API)
    const cleanHtml = html.replace(/<img[^>]*src="cid:logo"[^>]*>/gi, '');
    
    const r = await fetch("https://api.keplars.com/api/v1/send-email/instant", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from_email,
        from_name: from_name,
        to: [to_email],
        subject: subject,
        body: cleanHtml,   // <-- Campo correto exigido pelo Keplars
        is_html: true      // <-- Flag indicando que o body é HTML
      }),
    });
    const txt = await r.text();
    if (!r.ok) {
      return { ok: false, err: "Keplars " + r.status + ": " + txt.slice(0, 200) };
    }
    return { ok: true };
  } catch(e) {
    return { ok: false, err: String(e.message || e) };
  }
}



function montarHTML({ tipo, empresa, voo, mudancas, dest }) {
  const cor1 = empresa.cor1 || "#1e293b";
  const cor2 = empresa.cor2 || "#38a8ff";
  /* Cor do header: 45% mais escura que a cor primária — destaca a logo */
  const cor1Header = escurecer(cor1, 0.55);
  const nomeEmp = empresa.nome || "Air Locks";
  const paraPiloto = isPiloto(dest);
  const logoSrc = empresa._logo_src || (empresa.logo_b64 && empresa.logo_mime ? "cid:logo" : null);

  const trechos = trechosParaDestinatario(voo, dest);
  const t0 = trechos[0] || {};
  const data = t0.data ? fmtData(t0.data) : "—";
  const tipoVoo = voo.tipo || "Voo regular";

  const bannerAlt = (tipo === "atualizacao")
    ? `<tr><td style="padding:0 32px"><div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:8px;margin:20px 0">
        <div style="font-weight:800;color:#92400e;font-size:14px;margin-bottom:6px">⚠ Este voo sofreu alterações</div>
        ${Array.isArray(mudancas) && mudancas.length ? '<ul style="margin:6px 0 0 20px;padding:0;font-size:13px">' + mudancas.map(m => '<li style="margin:4px 0;color:#92400e">' + escHtml(m) + '</li>').join("") + '</ul>' : ''}
      </div></td></tr>`
    : "";

  const trechosRows = trechos.map((t, i) => {
    const labelO = paraPiloto ? t.origem : (t.origem_local?.nome || t.origem_local?.cidade || t.origem);
    const labelD = paraPiloto ? t.destino : (t.destino_local?.nome || t.destino_local?.cidade || t.destino);
    const pouso = computePousoLocal(t);
    /* Marca trechos onde o destinatário é passageiro */
    const idsPax = Array.isArray(t.passageiros_ids) ? t.passageiros_ids : [];
    const souPaxNeste = dest?.passageiro_id && idsPax.some(id => String(id) === String(dest.passageiro_id));
    const bgLinha = souPaxNeste
      ? hexToRgba(cor2, .10)
      : (i % 2 === 0 ? "#ffffff" : "#f9fafb");
    const marcaPax = souPaxNeste
      ? ` <span style="font-size:10px;color:${cor2};font-weight:800;letter-spacing:.04em">· VOCÊ EMBARCA</span>`
      : "";
    const badgeFuso = pouso.delta
      ? ` <span style="color:#9ca3af;font-weight:600;font-size:11px;margin-left:4px">${escHtml(pouso.delta)}</span>`
      : "";
    return `
      <tr style="background:${bgLinha}">
        <td style="padding:11px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;color:${cor2};font-weight:800;text-align:center;font-family:ui-monospace,monospace">T${i+1}</td>
        <td style="padding:11px 10px;border-bottom:1px solid #e5e7eb;font-size:13px">
          <b style="color:#111827">${escHtml(labelO)}</b>
          <span style="color:#9ca3af"> → </span>
          <b style="color:#111827">${escHtml(labelD)}</b>
          ${marcaPax}
          ${!paraPiloto ? `<div style="font-size:10px;color:#9ca3af;margin-top:2px;font-family:ui-monospace,monospace">${escHtml(t.origem||"")} → ${escHtml(t.destino||"")}</div>` : ""}
        </td>
        <td style="padding:11px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151;text-align:center;white-space:nowrap">${escHtml(fmtData(t.data))}</td>
        <td style="padding:11px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151;text-align:center;white-space:nowrap">${escHtml(t.hora || "—")}</td>
        <td style="padding:11px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151;text-align:left;white-space:nowrap">${escHtml(pouso.hora)}${badgeFuso}</td>
      </tr>`;
  }).join("");

  /* Header da marca: logo (CID) ou fallback visual */
  const marcaHTML = logoSrc
    ? `<img src="${escHtml(logoSrc)}" alt="${escHtml(nomeEmp)}" style="max-height:64px;max-width:200px;display:block;border:0;outline:none" />`
    : `<div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:.02em">${escHtml(nomeEmp)}</div>`;

  const paxBlock = paraPiloto && voo._passageiros_nomes?.length
    ? `<tr><td style="padding:16px 32px 0">
        <div style="font-size:11px;color:${cor1};text-transform:uppercase;letter-spacing:.08em;font-weight:800;margin-bottom:6px">Passageiros</div>
        <div style="background:#f9fafb;border-radius:8px;padding:12px 16px;font-size:13px;color:#374151;border-left:3px solid ${cor2}">${voo._passageiros_nomes.map(escHtml).join(" · ")}</div>
      </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px ${hexToRgba(cor1Header, .15)}">

        <!-- HEADER (mais escuro pra destacar a logo) -->
        <tr><td style="background:${cor1Header};padding:26px 32px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle">${marcaHTML}</td>
              <td style="text-align:right;vertical-align:middle">
                <div style="color:rgba(255,255,255,.65);font-size:10px;text-transform:uppercase;letter-spacing:.14em;font-weight:800">Roteiro do voo</div>
                <div style="color:#fff;font-size:14px;font-weight:700;margin-top:5px">${escHtml(tipoVoo)}</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- FAIXA COR2 -->
        <tr><td style="height:4px;background:${cor2};line-height:4px;font-size:0">&nbsp;</td></tr>

        <!-- SAUDAÇÃO -->
        <tr><td style="padding:26px 32px 6px">
          <div style="font-size:15px;color:#111827;line-height:1.55">${saudacao(dest)}</div>
        </td></tr>

        ${bannerAlt}

        <!-- BLOCO ROTA -->
        <tr><td style="padding:18px 32px 8px">
          ${paraPiloto
            ? `<div style="background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;padding:20px;text-align:center">
                 <div style="font-size:10px;color:${cor1};text-transform:uppercase;letter-spacing:.12em;font-weight:800;margin-bottom:10px">Rota completa</div>
                 <div style="font-size:15px;font-weight:800;color:#111827;font-family:ui-monospace,monospace;line-height:1.9;word-break:break-word">${escHtml(rotaCompletaICAO(trechos))}</div>
               </div>`
            : `<div style="background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;padding:6px 0 14px">
                 ${trechos.length > 1 ? `<div style="text-align:center;font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.12em;font-weight:800;padding:12px 0 0">Primeiro trecho</div>` : ""}
                 <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                   <tr>
                     <td style="padding:14px 20px;text-align:center;vertical-align:middle;width:40%">
                       <div style="font-size:10px;color:${cor1};text-transform:uppercase;letter-spacing:.12em;font-weight:800">Origem</div>
                       <div style="margin-top:8px">${labelLocalHTML(t0.origem_local, t0.origem, false)}</div>
                     </td>
                     <td style="text-align:center;vertical-align:middle;width:20%;font-size:24px;color:${cor2};font-weight:800">→</td>
                     <td style="padding:14px 20px;text-align:center;vertical-align:middle;width:40%">
                       <div style="font-size:10px;color:${cor1};text-transform:uppercase;letter-spacing:.12em;font-weight:800">Destino</div>
                       <div style="margin-top:8px">${labelLocalHTML(t0.destino_local, t0.destino, false)}</div>
                     </td>
                   </tr>
                 </table>
               </div>`}
        </td></tr>

        ${(dest?.passageiro_id && dest?.tipo !== "passageiro") ? `
        <tr><td style="padding:14px 32px 0">
          <div style="background:${hexToRgba(cor2, .08)};border-left:3px solid ${cor2};border-radius:8px;padding:12px 16px;font-size:13px;color:#374151;line-height:1.5">
            ℹ️ Você também está <b>como passageiro</b> neste voo. Os trechos onde você embarca estão marcados com <b style="color:${cor2}">VOCÊ EMBARCA</b> na tabela abaixo.
          </div>
        </td></tr>` : ""}

        <!-- INFO GERAL -->
        <tr><td style="padding:14px 32px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-left:3px solid ${cor2};padding-left:14px">
            <tr><td style="padding:5px 0;color:#6b7280;width:38%">Data</td><td style="padding:5px 0;color:#111827;font-weight:600">${escHtml(data)}</td></tr>
            <tr><td style="padding:5px 0;color:#6b7280">Aeronave</td><td style="padding:5px 0;color:#111827;font-weight:600;font-family:ui-monospace,monospace">${escHtml(voo.aeronave_tail || "—")}</td></tr>
            ${voo._p1_nome ? `<tr><td style="padding:5px 0;color:#6b7280">Comandante (P1)</td><td style="padding:5px 0;color:#111827;font-weight:600">${escHtml(voo._p1_nome)}</td></tr>` : ""}
            ${voo._p2_nome ? `<tr><td style="padding:5px 0;color:#6b7280">Copiloto (P2)</td><td style="padding:5px 0;color:#111827;font-weight:600">${escHtml(voo._p2_nome)}</td></tr>` : ""}
            ${voo._sol_nome && !isSolicitante(dest) ? `<tr><td style="padding:5px 0;color:#6b7280">Solicitante</td><td style="padding:5px 0;color:#111827;font-weight:600">${escHtml(voo._sol_nome)}</td></tr>` : ""}
          </table>
        </td></tr>

        <!-- TRECHOS -->
        <tr><td style="padding:8px 32px 0">
          <div style="font-size:11px;color:${cor1};text-transform:uppercase;letter-spacing:.10em;font-weight:800;margin-bottom:10px">Trechos do voo</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
            <thead>
              <tr style="background:${cor1}">
                <th style="padding:11px 10px;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:800">#</th>
                <th style="padding:11px 10px;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:800;text-align:left">Rota</th>
                <th style="padding:11px 10px;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:800">Data</th>
                <th style="padding:11px 10px;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:800">Hora</th>
                <th style="padding:11px 10px;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:800">Pouso</th>
              </tr>
            </thead>
            <tbody>${trechosRows}</tbody>
          </table>
        </td></tr>

        ${paxBlock}

        ${voo.observacoes ? `
        <tr><td style="padding:20px 32px 0">
          <div style="font-size:11px;color:${cor1};text-transform:uppercase;letter-spacing:.10em;font-weight:800;margin-bottom:6px">Observações</div>
          <div style="background:#f9fafb;border-radius:8px;padding:12px 16px;font-size:13px;color:#374151;line-height:1.55;border-left:3px solid ${cor2}">${escHtml(voo.observacoes)}</div>
        </td></tr>` : ""}

        <!-- FOOTER -->
        <tr><td style="padding:32px 32px 28px;text-align:center">
          <div style="height:3px;background:${cor2};width:40px;margin:0 auto 18px;border-radius:2px"></div>
          <div style="font-size:11px;color:#9ca3af;line-height:1.7">
            Email enviado automaticamente.<br>
            Dúvidas? Entre em contato com o administrador.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}
