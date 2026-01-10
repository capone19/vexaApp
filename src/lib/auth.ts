// Sistema de autenticación simple con localStorage

export interface User {
  email: string;
  name: string;
  role: string;
  companyName: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

// Usuario demo predefinido
const DEMO_USER: User & { password: string } = {
  email: "contacto@growthpartnersai.cl",
  password: "Growthpartners2025",
  name: "Growth Partners",
  role: "admin",
  companyName: "Growthpartners",
};

// Datos de perfil inicial para el usuario demo
const DEMO_PROFILE = {
  companyName: "Growthpartners",
  email: "contacto@growthpartnersai.cl",
  phone: "+591 7123 4567",
  industry: "Tecnología",
  logo: null,
};

// Verificar si hay sesión activa
export const isAuthenticated = (): boolean => {
  const session = localStorage.getItem("auth_session");
  return session !== null;
};

// Obtener usuario actual
export const getCurrentUser = (): User | null => {
  const session = localStorage.getItem("auth_session");
  if (!session) return null;
  
  try {
    return JSON.parse(session);
  } catch {
    return null;
  }
};

// Iniciar sesión
export const login = (credentials: AuthCredentials): { success: boolean; error?: string } => {
  // Verificar credenciales contra el usuario demo
  if (
    credentials.email.toLowerCase() === DEMO_USER.email.toLowerCase() &&
    credentials.password === DEMO_USER.password
  ) {
    // Guardar sesión
    const user: User = {
      email: DEMO_USER.email,
      name: DEMO_USER.name,
      role: DEMO_USER.role,
      companyName: DEMO_USER.companyName,
    };
    
    localStorage.setItem("auth_session", JSON.stringify(user));
    
    // Si no existe perfil guardado, crear el perfil demo
    if (!localStorage.getItem("company_profile")) {
      localStorage.setItem("company_profile", JSON.stringify(DEMO_PROFILE));
    }
    
    return { success: true };
  }
  
  return { success: false, error: "Credenciales incorrectas" };
};

// Registrar nuevo usuario (en demo, solo funciona con el usuario predefinido)
export const register = (
  name: string,
  email: string,
  password: string
): { success: boolean; error?: string } => {
  // En modo demo, solo permitimos registro si coincide con las credenciales demo
  // En producción, esto se conectaría a un backend real
  
  if (email.toLowerCase() === DEMO_USER.email.toLowerCase()) {
    if (password === DEMO_USER.password) {
      // Crear sesión
      const user: User = {
        email: email,
        name: name || DEMO_USER.name,
        role: "admin",
        companyName: name || DEMO_USER.companyName,
      };
      
      localStorage.setItem("auth_session", JSON.stringify(user));
      
      // Crear perfil
      const profile = {
        ...DEMO_PROFILE,
        companyName: name || DEMO_PROFILE.companyName,
        email: email,
      };
      localStorage.setItem("company_profile", JSON.stringify(profile));
      
      return { success: true };
    }
    return { success: false, error: "Contraseña incorrecta" };
  }
  
  return { success: false, error: "Email no autorizado para el demo" };
};

// Cerrar sesión
export const logout = (): void => {
  localStorage.removeItem("auth_session");
  // No eliminamos company_profile ni otros datos para que persistan
};

// Obtener datos del perfil de empresa
export const getCompanyProfile = () => {
  try {
    const stored = localStorage.getItem("company_profile");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error loading profile:", e);
  }
  return DEMO_PROFILE;
};
