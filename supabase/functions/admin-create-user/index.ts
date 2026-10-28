import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return json({ error: "Missing token" }, 401);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SECRET_KEY")!
  );

  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user) return json({ error: "Invalid token" }, 401);

  const { data: caller, error: callerErr } = await sb
    .from("users").select("perfil, ativo").eq("id", user.id).single();
  if (callerErr || !caller) return json({ error: "Perfil não encontrado" }, 403);
  if (caller.perfil !== "admin") return json({ error: "Só admin pode criar usuários" }, 403);
  if (!caller.ativo) return json({ error: "Usuário admin inativo" }, 403);

  let body;
  try { body = await req.json(); } catch(e) { return json({ error: "JSON inválido" }, 400); }
  const { nome, email, perfil, senha, tambem_e_piloto, tambem_passageiro, tambem_solicitante } = body || {};
  if (!nome || !email || !perfil || !senha) return json({ error: "Faltam campos: nome, email, perfil, senha" }, 400);
  if (!["admin","piloto","gestor","passageiro"].includes(perfil)) return json({ error: "Perfil inválido" }, 400);
  if (senha.length < 6) return json({ error: "Senha deve ter pelo menos 6 caracteres" }, 400);

  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email: String(email).trim().toLowerCase(),
    password: senha,
    email_confirm: true,
  });
  if (createErr) return json({ error: "Auth: " + createErr.message }, 400);

  const { error: profileErr } = await sb.from("users").insert({
    id: created.user.id,
    nome: String(nome).trim(),
    email: String(email).trim().toLowerCase(),
    perfil,
    tambem_e_piloto: tambem_e_piloto === true,
    ativo: true,
    must_change_password: true,
    extras: (() => {
      const e = {};
      if (tambem_passageiro === true) e.tambem_passageiro = true;
      if (tambem_solicitante === true) e.tambem_solicitante = true;
      return e;
    })(),
  });

  if (profileErr) {
    await sb.auth.admin.deleteUser(created.user.id);
    return json({ error: "DB: " + profileErr.message }, 400);
  }

  return json({ ok: true, id: created.user.id });
});

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
