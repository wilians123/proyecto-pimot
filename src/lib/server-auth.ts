import { supabaseAdmin } from "@/lib/supabase-server";
import type { Database, RolUsuarioDB } from "@/types/database";

type ProfileAuth = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "rol" | "activo"
>;

export async function getAuthenticatedProfile(
  request: Request,
): Promise<ProfileAuth | null> {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return null;

    const token = authorization.slice("Bearer ".length).trim();
    if (!token) return null;

    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser(token);
    if (!user) return null;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, rol, activo")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.activo) return null;
    return profile;
  } catch {
    return null;
  }
}

export async function hasRole(
  request: Request,
  roles: readonly RolUsuarioDB[],
): Promise<boolean> {
  const profile = await getAuthenticatedProfile(request);
  return profile !== null && roles.includes(profile.rol);
}
