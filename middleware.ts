import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function copyCookiesToResponse(
  source: NextResponse,
  target: NextResponse
) {
  source.cookies.getAll().forEach((c) => {
    target.cookies.set(c.name, c.value, { path: "/" });
  });
}

export async function middleware(request: NextRequest) {
  // Si no hay variables de Supabase configuradas, dejar pasar todo
  // (modo demo / sin base de datos)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!supabaseUrl || !supabaseKey ||
      supabaseUrl.includes("placeholder") ||
      supabaseKey.includes("placeholder")) {
    // Sin Supabase configurado → no redirigir, dejar pasar (modo demo)
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          );
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    const isAuthPage = request.nextUrl.pathname.startsWith("/login") ||
                      request.nextUrl.pathname.startsWith("/register");
    const isPublicPage = request.nextUrl.pathname === "/" ||
                        request.nextUrl.pathname.startsWith("/admin") ||
                        request.nextUrl.pathname.startsWith("/api/");

    // Exponer pathname al layout vía header (para detectar trial expirado)
    supabaseResponse.headers.set("x-pathname", request.nextUrl.pathname);

    if (!user && !isAuthPage && !isPublicPage) {
      const redirectResp = NextResponse.redirect(new URL("/login", request.url));
      copyCookiesToResponse(supabaseResponse, redirectResp);
      return redirectResp;
    }
    if (user && isAuthPage) {
      const redirectResp = NextResponse.redirect(new URL("/dashboard", request.url));
      copyCookiesToResponse(supabaseResponse, redirectResp);
      return redirectResp;
    }
  } catch {
    // Error de conexión a Supabase → dejar pasar sin redirigir
    return NextResponse.next({ request });
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
