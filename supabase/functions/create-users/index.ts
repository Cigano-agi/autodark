import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const users = [
    { email: "gustavo@autodark.com", password: "AutoDark@2026", full_name: "Gustavo Petinarti" },
    { email: "guilherme@autodark.com", password: "AutoDark@2026", full_name: "Guilherme Petinarti" },
    { email: "dev@autodark.com", password: "DevTeam@2026", full_name: "Dev Team" },
  ];

  const results = [];
  for (const user of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.full_name },
    });
    results.push({ email: user.email, id: data?.user?.id, error: error?.message });
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
