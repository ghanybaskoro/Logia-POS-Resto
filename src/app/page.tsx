"use client";
import { useState, useEffect } from "react"; // Tambah useEffect
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleNumClick = (num: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + num);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleLogin = async () => {
    // Validasi sederhana
    if (pin.length < 4) return alert("PIN terlalu pendek");

    setLoading(true);
    // Beri sedikit delay agar UX terasa lebih natural
    setTimeout(async () => {
      const result = await login(pin);
      if (!result.success) {
        alert(result.message);
        setPin("");
        setLoading(false);
      }
      // Jika sukses, redirect ditangani oleh AuthContext, jadi loading biarkan true
    }, 500);
  };

  // --- PERBAIKAN DISINI ---
  // Kita bungkus logic auto-submit dengan useEffect
  useEffect(() => {
    if (pin.length === 6 && !loading) {
      handleLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);
  // -------------------------

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Kiri: Branding */}
        <div className="hidden md:flex md:w-1/2 bg-blue-600 p-8 flex-col justify-between text-white">
          <div>
            <h1 className="text-3xl font-bold">CloudResto.</h1>
            <p className="text-blue-200 mt-2 text-sm">Enterprise Point of Sale</p>
          </div>
          <div className="text-xs opacity-70">&copy; 2024 Logia Initiative</div>
        </div>

        {/* Kanan: Numpad */}
        <div className="w-full md:w-1/2 p-8">
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Masuk Kasir</h2>

          {/* PIN Display */}
          <div className="flex justify-center gap-3 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${i < pin.length ? "bg-blue-600 border-blue-600" : "bg-transparent border-slate-300"}`} />
            ))}
          </div>

          {/* Numpad Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumClick(num.toString())}
                disabled={loading}
                className="h-16 rounded-xl bg-slate-50 text-xl font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition shadow-sm border border-slate-200 disabled:opacity-50">
                {num}
              </button>
            ))}

            <div className="flex items-center justify-center"></div>

            <button
              onClick={() => handleNumClick("0")}
              disabled={loading}
              className="h-16 rounded-xl bg-slate-50 text-xl font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition shadow-sm border border-slate-200 disabled:opacity-50">
              0
            </button>

            <button onClick={handleBackspace} disabled={loading} className="h-16 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 active:scale-95 transition flex items-center justify-center disabled:opacity-50">
              ⌫
            </button>
          </div>

          <p className="text-center text-xs text-slate-400">{loading ? "Sedang memproses..." : "Gunakan PIN 6 digit Anda"}</p>
        </div>
      </div>
    </div>
  );
}
