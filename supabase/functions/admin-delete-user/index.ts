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
    return json({ error: "Só admin pode excluir usuários" }, 403);

  let body;
  try { body = await req.json(); } catch(e) { return json({ error: "JSON inválido" }, 400); }
  const { userId } = body || {};
  if (!userId) return json({ error: "userId obrigatório" }, 400);

  /* Não deixa o admin excluir a si mesmo */
  if (userId === user.id) return json({ error: "Você não pode excluir a própria conta" }, 400);

  /* Remove do auth.users (o public.users sai por CASCADE) */
  const { error: delErr } = await sb.auth.admin.deleteUser(userId);
  if (delErr) return json({ error: delErr.message }, 400);

  return json({ ok: true });
});

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
