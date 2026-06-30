import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // This is only needed if you're setting cookies in server components
          // For now, we'll just ignore it
        },
        remove(name: string, options: CookieOptions) {
          // This is only needed if you're removing cookies in server components
          // For now, we'll just ignore it
        },
      },
    },
  );
};
