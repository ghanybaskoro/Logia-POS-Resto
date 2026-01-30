"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

type UserProfile = {
  id: string;
  full_name: string;
  role: string;
  restaurant_id: string;
};

type AuthContextType = {
  user: UserProfile | null;
  login: (pin: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // 🔴 HARDCODED SUPER ADMIN PIN (Untuk pertama kali install)
  const SUPER_ADMIN_PIN = "123456";
  const RESTAURANT_ID = "eaaefe2f-bd7d-4a4b-a40d-ee775ec44130"; // UUID Restoran Anda

  // Cek apakah user sudah login saat aplikasi dibuka (dari localStorage)
  useEffect(() => {
    const savedUser = localStorage.getItem("pos_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      // Jika belum login dan bukan di halaman login, tendang ke halaman login
      if (pathname !== "/") {
        router.push("/");
      }
    }
  }, [pathname, router]);

  const login = async (pin: string) => {
    // 1. Cek Super Admin (Backdoor)
    if (pin === SUPER_ADMIN_PIN) {
      const superUser = {
        id: "super-admin",
        full_name: "Super Admin",
        role: "owner",
        restaurant_id: RESTAURANT_ID,
      };
      setUser(superUser);
      localStorage.setItem("pos_user", JSON.stringify(superUser));
      router.push("/pos"); // Redirect ke POS setelah sukses
      return { success: true };
    }

    // 2. Cek User Database
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("pin_code", pin).eq("restaurant_id", RESTAURANT_ID).single();

      if (error || !data) {
        return { success: false, message: "PIN Salah / Tidak Ditemukan" };
      }

      // Login Sukses
      const loggedUser = {
        id: data.id,
        full_name: data.full_name,
        role: data.role,
        restaurant_id: data.restaurant_id,
      };
      setUser(loggedUser);
      localStorage.setItem("pos_user", JSON.stringify(loggedUser));
      router.push("/pos");
      return { success: true };
    } catch (err) {
      return { success: false, message: "Terjadi Kesalahan Sistem" };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("pos_user");
    router.push("/");
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
