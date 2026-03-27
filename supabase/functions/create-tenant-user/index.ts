import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: string;
  tenantId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callingUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: callerProfile, error: profileError } = await userClient
      .from("profiles")
      .select("tenant_id, role_id")
      .eq("id", callingUser.id)
      .maybeSingle();

    if (profileError || !callerProfile?.tenant_id) {
      return new Response(
        JSON.stringify({ error: "User has no tenant access" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const payload: CreateUserPayload = await req.json();

    if (!payload.email || !payload.password || !payload.firstName || !payload.roleId || !payload.tenantId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, password, firstName, roleId, tenantId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (payload.tenantId !== callerProfile.tenant_id) {
      return new Response(
        JSON.stringify({ error: "Cannot create users in a different tenant" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roleExists, error: roleError } = await adminClient
      .from("roles")
      .select("id, name")
      .eq("id", payload.roleId)
      .eq("tenant_id", payload.tenantId)
      .maybeSingle();

    if (roleError || !roleExists) {
      return new Response(
        JSON.stringify({ error: "Invalid role for this tenant" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: authData, error: createAuthError } = await adminClient.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        first_name: payload.firstName,
        last_name: payload.lastName,
        phone: payload.phone || null,
      },
    });

    if (createAuthError) {
      let errorMessage = createAuthError.message;
      if (createAuthError.message.includes("already been registered")) {
        errorMessage = "Ya existe un usuario con este email";
      }
      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const newUserId = authData.user.id;

    const { error: profileInsertError } = await adminClient
      .from("profiles")
      .insert({
        id: newUserId,
        tenant_id: payload.tenantId,
        email: payload.email,
        first_name: payload.firstName,
        last_name: payload.lastName,
        display_name: `${payload.firstName} ${payload.lastName}`.trim(),
        phone: payload.phone || null,
        role_id: payload.roleId,
        is_owner: false,
        is_partner: false,
        is_admin: false,
        is_delivery: false,
      });

    if (profileInsertError) {
      await adminClient.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: `Failed to create profile: ${profileInsertError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { error: memberInsertError } = await adminClient
      .from("tenant_members")
      .insert({
        tenant_id: payload.tenantId,
        user_id: newUserId,
        role: roleExists.name.toLowerCase(),
        is_active: true,
        invited_by: callingUser.id,
        invited_at: new Date().toISOString(),
        joined_at: new Date().toISOString(),
      });

    if (memberInsertError) {
      console.error("Warning: Failed to create tenant_member:", memberInsertError);
    }

    const { data: createdProfile } = await adminClient
      .from("profiles")
      .select(`
        id,
        email,
        first_name,
        last_name,
        display_name,
        phone,
        role_id,
        tenant_id,
        created_at,
        role:roles(id, name, description)
      `)
      .eq("id", newUserId)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        user: createdProfile,
        message: "Usuario creado exitosamente",
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
