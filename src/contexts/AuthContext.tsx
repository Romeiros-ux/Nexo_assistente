 import { createContext, useContext, useEffect, useState, ReactNode } from "react";
 import { User } from "@supabase/supabase-js";
 import { supabase } from "@/integrations/supabase/client";
 import { UserContext, AppRole } from "@/types/auth";
 
 interface AuthContextType {
   user: User | null;
   userContext: UserContext | null;
   loading: boolean;
   signIn: (email: string, password: string) => Promise<void>;
   signUp: (email: string, password: string, fullName: string) => Promise<void>;
   signOut: () => Promise<void>;
 }
 
 const AuthContext = createContext<AuthContextType | undefined>(undefined);
 
 export function AuthProvider({ children }: { children: ReactNode }) {
   const [user, setUser] = useState<User | null>(null);
   const [userContext, setUserContext] = useState<UserContext | null>(null);
   const [loading, setLoading] = useState(true);
 
   const fetchUserContext = async (userId: string): Promise<UserContext | null> => {
     try {
       // Fetch profile
       const { data: profile } = await supabase
         .from("profiles")
         .select("*, units(name)")
         .eq("user_id", userId)
         .single();
 
       if (!profile) return null;
 
       // Fetch primary role
       const { data: roles } = await supabase
         .from("user_roles")
         .select("role")
         .eq("user_id", userId)
         .order("role", { ascending: false })
         .limit(1);
 
       const role = roles?.[0]?.role as AppRole | null;
 
       // Compute permissions
       const canUploadDocuments = role === "ti";
       const canViewAllUnits = role === "ti" || role === "secretaria" || role === "coordenacao";
       const canAccessAuditLogs = role === "ti";
 
       return {
         userId,
         email: profile.email,
         fullName: profile.full_name,
         role,
         unitId: profile.unit_id,
         unitName: (profile.units as any)?.name || null,
         isActive: profile.is_active,
         canUploadDocuments,
         canViewAllUnits,
         canAccessAuditLogs,
       };
     } catch (error) {
       console.error("Error fetching user context:", error);
       return null;
     }
   };
 
   useEffect(() => {
     // Initial session
     supabase.auth.getSession().then(({ data: { session } }) => {
       setUser(session?.user ?? null);
       if (session?.user) {
         fetchUserContext(session.user.id).then(setUserContext);
       }
       setLoading(false);
     });
 
     // Auth state listener
     const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
       setUser(session?.user ?? null);
       if (session?.user) {
         fetchUserContext(session.user.id).then(setUserContext);
       } else {
         setUserContext(null);
       }
     });
 
     return () => subscription.unsubscribe();
   }, []);
 
   const signIn = async (email: string, password: string) => {
     const { error } = await supabase.auth.signInWithPassword({ email, password });
     if (error) throw error;
   };
 
   const signUp = async (email: string, password: string, fullName: string) => {
     const { error } = await supabase.auth.signUp({
       email,
       password,
       options: {
         data: { full_name: fullName },
       },
     });
     if (error) throw error;
   };
 
   const signOut = async () => {
     const { error } = await supabase.auth.signOut();
     if (error) throw error;
   };
 
   return (
     <AuthContext.Provider value={{ user, userContext, loading, signIn, signUp, signOut }}>
       {children}
     </AuthContext.Provider>
   );
 }
 
 export const useAuth = () => {
   const context = useContext(AuthContext);
   if (!context) throw new Error("useAuth must be used within AuthProvider");
   return context;
 };