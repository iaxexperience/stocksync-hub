import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  return useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 30_000,
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*, organizations!profiles_active_org_id_fkey(id, name, document)")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      let role = null;
      if (data.active_org_id) {
        const { data: memberData } = await supabase
          .from("organization_members")
          .select("role")
          .eq("organization_id", data.active_org_id)
          .eq("user_id", userData.user.id)
          .maybeSingle();
        if (memberData) {
          role = memberData.role;
        }
      }
      return { ...data, role };
    },
    staleTime: 60_000,
  });
}
