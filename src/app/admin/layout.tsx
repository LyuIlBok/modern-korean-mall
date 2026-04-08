import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectedFrom=/admin");
  }

  // 최고 관리자 화이트리스트 (Email 기반)
  const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'grow930706@gmail.com';
  
  if (user.email === SUPER_ADMIN_EMAIL) {
    return <>{children}</>;
  }

  // DB(profiles) 권한 체크
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, role')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin && profile?.role !== 'admin') {
    console.warn(`[Security Alert] Unauthorized admin access attempt to /admin layout by ${user.email}`);
    redirect("/");
  }

  return <>{children}</>;
}
