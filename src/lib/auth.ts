// Sistema de autenticación con Supabase

import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

// Convertir usuario de Supabase a nuestro formato
const mapSupabaseUser = async (supabaseUser: SupabaseUser): Promise<User> => {
  // Obtener el tenant_id del usuario
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('tenant_id, role')
    .eq('user_id', supabaseUser.id)
    .single();

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'Usuario',
    role: userRole?.role || 'viewer',
    tenantId: userRole?.tenant_id || null,
  };
};

// Verificar si hay sesión activa
export const isAuthenticated = (): boolean => {
  // Esta función es síncrona para compatibilidad, pero la sesión real se verifica async
  // Se usa principalmente para el estado inicial
  return false; // La verificación real se hace con getSession()
};

// Obtener sesión actual (async)
export const getSession = async (): Promise<Session | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

// Obtener usuario actual (async)
export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return mapSupabaseUser(user);
};

// Iniciar sesión
export const login = async (credentials: AuthCredentials): Promise<{ success: boolean; error?: string }> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
};

// Registrar nuevo usuario
export const register = async (
  name: string,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
};

// Cerrar sesión
export const logout = async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('[logout] Error during signOut:', error);
  }
  // Limpiar cualquier dato local para forzar cierre de sesión
  localStorage.removeItem('sb-ymlvklodwwvkfpnrlfsa-auth-token');
};

// Autenticación con Google
export const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
};

// Escuchar cambios de autenticación
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const user = await mapSupabaseUser(session.user);
      callback(user);
    } else {
      callback(null);
    }
  });
};

// Obtener el tenant ID del usuario actual
export const getUserTenantId = async (): Promise<string | null> => {
  const { data, error } = await supabase.rpc('get_user_tenant_id');
  if (error) return null;
  return data;
};
