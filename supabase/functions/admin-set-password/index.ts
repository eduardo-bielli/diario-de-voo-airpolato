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

  const { data: caller } = await sb.from("users").select("perfil, ativo").eq("id", user.id).single();
  if (!caller || caller.perfil !== "admin" || !caller.ativo)
    return json({ error: "Só admin pode redefinir senhas" }, 403);

  let body;
  try { body = await req.json(); } catch(e) { return json({ error: "JSON inválido" }, 400); }
  const { userId, novaSenha } = body || {};
  if (!userId || !novaSenha) return json({ error: "userId e novaSenha obrigatórios" }, 400);
  if (novaSenha.length < 6) return json({ error: "Senha deve ter pelo menos 6 caracteres" }, 400);

  /* 1. Atualiza senha no auth.users */
  const { error: updErr } = await sb.auth.admin.updateUserById(userId, { password: novaSenha });
  if (updErr) return json({ error: "Auth: " + updErr.message }, 400);

  /* 2. Marca must_change_password */
  const { error: dbErr } = await sb.from("users").update({ must_change_password: true }).eq("id", userId);
  if (dbErr) return json({ error: "DB: " + dbErr.message }, 400);

  return json({ ok: true });
});

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
