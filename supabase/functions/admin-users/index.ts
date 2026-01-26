// Lovable Cloud Function: admin-users
// TI-only: list/create/update users by using a service role client after validating requester role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bootstrap-token",
};

type AppRole = "secretaria" | "ti" | "coordenacao" | "diretor";

type ActionBody =
  | { action: "list" }
  | {
      action: "create";
      email: string;
      password: string;
      fullName: string;
      role: AppRole;
      unitId: string | null;
    }
  | {
      action: "update";
      userId: string;
      fullName: string | null;
      role: AppRole | null;
      unitId: string | null;
      isActive: boolean;
    }
  | { action: "create_test_users" };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function badRequest(message: string) {
  return json({ error: message }, 400);
}

function unauthorized(message = "Não autorizado") {
  return json({ error: message }, 401);
}

function forbidden(message = "Acesso restrito à TI") {
  return json({ error: message }, 403);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL");
    // Edge runtime expõe a chave anônima como SUPABASE_ANON_KEY.
    // (SUPABASE_PUBLISHABLE_KEY pode existir no frontend, mas não é garantida aqui.)
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!url) {
      return new Response(JSON.stringify({ error: "Missing env: SUPABASE_URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!anonKey) {
      return new Response(JSON.stringify({ error: "Missing env: SUPABASE_ANON_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!serviceKey) {
      return new Response(JSON.stringify({ error: "Missing env: SUPABASE_SERVICE_ROLE_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => null)) as ActionBody | null;
    if (!body || !("action" in body)) return new Response(JSON.stringify({ error: "Corpo inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const authHeader = req.headers.get("Authorization") || "";

    // Bootstrap (somente para criar usuários de teste) - permitido apenas se ainda não existir nenhum usuário TI.
    if (!authHeader) {
      if (body.action !== "create_test_users") return unauthorized();
      const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

      const { count: tiCount, error: tiErr } = await admin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "ti");
      if (tiErr) {
        return new Response(JSON.stringify({ error: tiErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if ((tiCount || 0) > 0) {
        return forbidden("Bootstrap desativado: já existe usuário TI");
      }

      // Reaproveita a lógica existente de criação
      const fixtures: Array<{ email: string; password: string; fullName: string; role: AppRole }> = [
        { email: "ti.teste@exemplo.com", password: "Teste@12345", fullName: "TI Teste", role: "ti" },
        { email: "secretaria.teste@exemplo.com", password: "Teste@12345", fullName: "Secretaria Teste", role: "secretaria" },
        { email: "coordenacao.teste@exemplo.com", password: "Teste@12345", fullName: "Coordenação Teste", role: "coordenacao" },
        { email: "diretor.teste@exemplo.com", password: "Teste@12345", fullName: "Diretor Teste", role: "diretor" },
      ];

      const created: Array<{ email: string; password: string; role: AppRole; userId: string }> = [];

      const { data: existing, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (listErr) return new Response(JSON.stringify({ error: listErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const byEmail = new Map<string, string>();
      for (const u of existing.users) {
        if (u.email) byEmail.set(u.email.toLowerCase(), u.id);
      }

      for (const f of fixtures) {
        let userId = byEmail.get(f.email.toLowerCase());

        if (!userId) {
          const { data: createdUser, error: cErr } = await admin.auth.admin.createUser({
            email: f.email,
            password: f.password,
            email_confirm: true,
            user_metadata: { full_name: f.fullName },
          });
          if (cErr) return new Response(JSON.stringify({ error: cErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          userId = createdUser.user?.id;
          if (userId) byEmail.set(f.email.toLowerCase(), userId);
        }

        if (!userId) continue;

        await admin
          .from("profiles")
          .upsert(
            {
              user_id: userId,
              email: f.email,
              full_name: f.fullName,
              unit_id: null,
              is_active: true,
            },
            { onConflict: "user_id" },
          );

        await admin.from("user_roles").delete().eq("user_id", userId);
        await admin.from("user_roles").insert({ user_id: userId, role: f.role });

        created.push({ email: f.email, password: f.password, role: f.role, userId });
      }

      return new Response(JSON.stringify({ ok: true, created }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAsUser = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabaseAsUser.auth.getUser();
    if (userErr || !user) return unauthorized();

    const { data: isTi, error: roleErr } = await supabaseAsUser.rpc("has_role", {
      _user_id: user.id,
      _role: "ti",
    });
    if (roleErr) return json({ error: roleErr.message }, 500);
    if (!isTi) return forbidden();

    // fluxo normal (TI autenticada)

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    if (body.action === "list") {
      const { data: profiles, error: pErr } = await admin
        .from("profiles")
        .select("user_id, email, full_name, unit_id, is_active, units(name)")
        .order("created_at", { ascending: false });
      if (pErr) return json({ error: pErr.message }, 500);

      const userIds = (profiles || []).map((p) => p.user_id);
      const { data: roles, error: rErr } = await admin
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);
      if (rErr) return json({ error: rErr.message }, 500);

      const roleByUser = new Map<string, AppRole>();
      // Como cada usuário deve ter um perfil principal, escolhemos o de maior rank.
      // Rank (maior -> mais privilégio) vem da função role_rank; para simplicidade,
      // usamos uma ordem fixa compatível com o banco.
      const rank: Record<AppRole, number> = {
        diretor: 1,
        coordenacao: 2,
        secretaria: 3,
        ti: 4,
      };
      for (const r of roles || []) {
        const current = roleByUser.get(r.user_id as string);
        const next = r.role as AppRole;
        if (!current || rank[next] > rank[current]) roleByUser.set(r.user_id as string, next);
      }

      const users = (profiles || []).map((p) => ({
        user_id: p.user_id,
        email: p.email,
        full_name: p.full_name,
        unit_id: p.unit_id,
        unit_name: (p.units as any)?.name ?? null,
        role: roleByUser.get(p.user_id as string) ?? null,
        is_active: p.is_active,
      }));

      return new Response(JSON.stringify({ users }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (body.action === "create") {
      if (!body.email || !body.password || !body.fullName || !body.role) {
        return badRequest("Campos obrigatórios ausentes");
      }

      // Cria usuário de autenticação
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: { full_name: body.fullName },
      });
      if (cErr) return json({ error: cErr.message }, 500);

      const newUserId = created.user?.id;
      if (!newUserId) return json({ error: "Falha ao criar usuário" }, 500);

      // Cria/atualiza profile
      const { error: upErr } = await admin
        .from("profiles")
        .upsert(
          {
            user_id: newUserId,
            email: body.email,
            full_name: body.fullName,
            unit_id: body.unitId,
            is_active: true,
          },
          { onConflict: "user_id" },
        );
      if (upErr) return json({ error: upErr.message }, 500);

      // Garante 1 papel principal: limpa e insere
      await admin.from("user_roles").delete().eq("user_id", newUserId);
      const { error: roleInsErr } = await admin.from("user_roles").insert({
        user_id: newUserId,
        role: body.role,
      });
      if (roleInsErr) return json({ error: roleInsErr.message }, 500);

      return new Response(JSON.stringify({ ok: true, userId: newUserId }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (body.action === "update") {
      if (!body.userId) return badRequest("userId obrigatório");

      const { error: pErr } = await admin
        .from("profiles")
        .update({
          full_name: body.fullName,
          unit_id: body.unitId,
          is_active: body.isActive,
        })
        .eq("user_id", body.userId);
      if (pErr) return json({ error: pErr.message }, 500);

      if (body.role) {
        await admin.from("user_roles").delete().eq("user_id", body.userId);
        const { error: roleErr2 } = await admin.from("user_roles").insert({
          user_id: body.userId,
          role: body.role,
        });
        if (roleErr2) return json({ error: roleErr2.message }, 500);
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (body.action === "create_test_users") {
      const fixtures: Array<{ email: string; password: string; fullName: string; role: AppRole }> = [
        { email: "ti.teste@exemplo.com", password: "Teste@12345", fullName: "TI Teste", role: "ti" },
        { email: "secretaria.teste@exemplo.com", password: "Teste@12345", fullName: "Secretaria Teste", role: "secretaria" },
        { email: "coordenacao.teste@exemplo.com", password: "Teste@12345", fullName: "Coordenação Teste", role: "coordenacao" },
        { email: "diretor.teste@exemplo.com", password: "Teste@12345", fullName: "Diretor Teste", role: "diretor" },
      ];

      const created: Array<{ email: string; password: string; role: AppRole; userId: string }> = [];

      const { data: existing, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (listErr) return json({ error: listErr.message }, 500);
      const byEmail = new Map<string, string>();
      for (const u of existing.users) {
        if (u.email) byEmail.set(u.email.toLowerCase(), u.id);
      }

      for (const f of fixtures) {
        // tenta localizar por email
        let userId = byEmail.get(f.email.toLowerCase());

        if (!userId) {
          const { data: createdUser, error: cErr } = await admin.auth.admin.createUser({
            email: f.email,
            password: f.password,
            email_confirm: true,
            user_metadata: { full_name: f.fullName },
          });
          if (cErr) return json({ error: cErr.message }, 500);
          userId = createdUser.user?.id;
          if (userId) byEmail.set(f.email.toLowerCase(), userId);
        }

        if (!userId) continue;

        await admin
          .from("profiles")
          .upsert(
            {
              user_id: userId,
              email: f.email,
              full_name: f.fullName,
              unit_id: null,
              is_active: true,
            },
            { onConflict: "user_id" },
          );

        await admin.from("user_roles").delete().eq("user_id", userId);
        await admin.from("user_roles").insert({ user_id: userId, role: f.role });

        created.push({ email: f.email, password: f.password, role: f.role, userId });
      }

      return new Response(JSON.stringify({ ok: true, created }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação desconhecida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
