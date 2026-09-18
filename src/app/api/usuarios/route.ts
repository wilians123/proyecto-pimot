import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import type { RolUsuarioDB } from "@/types/database";

const ROLES: RolUsuarioDB[] = ["admin", "operativo", "visualizador"];

async function esAdministrador(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
  if (!token) return false;

  const {
    data: { user },
  } = await supabaseAdmin.auth.getUser(token);
  if (!user) return false;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  return profile?.rol === "admin";
}

export async function GET(request: Request) {
  if (!(await esAdministrador(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    users: data.users.map((user) => ({
      id: user.id,
      email: user.email ?? null,
      last_sign_in_at: user.last_sign_in_at ?? null,
    })),
  });
}

export async function POST(request: Request) {
  if (!(await esAdministrador(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = (await request.json()) as {
    email?: string;
    password?: string;
    nombre?: string;
    rol?: RolUsuarioDB;
  };
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const nombre = body.nombre?.trim();
  const rol = body.rol ?? "operativo";

  if (!email || !password || !nombre || !ROLES.includes(rol)) {
    return NextResponse.json(
      { error: "Correo, contraseña, nombre y rol son obligatorios." },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres." },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, rol },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ user: data.user }, { status: 201 });
}

export async function PUT(request: Request) {
  if (!(await esAdministrador(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = (await request.json()) as {
    id?: string;
    email?: string;
    nombre?: string;
    rol?: RolUsuarioDB;
  };
  const id = body.id?.trim();
  const email = body.email?.trim().toLowerCase();
  const nombre = body.nombre?.trim();
  const rol = body.rol;
  if (!id || !email || !nombre || !rol || !ROLES.includes(rol)) {
    return NextResponse.json({ error: "Usuario, correo, nombre y rol son obligatorios." }, { status: 400 });
  }

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
    email,
    user_metadata: { nombre, rol },
  });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ nombre, rol })
    .eq("id", id);
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!(await esAdministrador(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const body = (await request.json()) as { id?: string };
  const id = body.id?.trim();
  if (!id) return NextResponse.json({ error: "El usuario es obligatorio." }, { status: 400 });

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
