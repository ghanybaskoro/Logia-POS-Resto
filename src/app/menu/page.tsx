"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MenuItem, Category } from "@/types/database";

export default function MenuPage() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // State Form
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    category_id: "",
    is_active: true,
    image_url: "",
  });

  // 🔴 PASTE UUID RESTORAN DISINI
  const RESTAURANT_ID = "eaaefe2f-bd7d-4a4b-a40d-ee775ec44130";

  // 1. Fetch Data dengan JOIN yang mendalam (Menu -> Resep -> Bahan)
  const fetchData = async () => {
    try {
      setLoading(true);

      // Query Menu + Kategori + Resep + Info Stok Bahan
      const { data: menuData, error } = await supabase
        .from("menu_items")
        .select(
          `
          *,
          category:categories(name),
          recipes:recipes(
            quantity_needed,
            ingredient:ingredients(name, current_stock, uom)
          )
        `,
        )
        .eq("restaurant_id", RESTAURANT_ID)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Ambil Kategori untuk dropdown
      const { data: catData } = await supabase.from("categories").select("*").eq("restaurant_id", RESTAURANT_ID);

      // @ts-ignore - Supabase types kadang agak rewel dengan nested joins deep
      if (menuData) setMenus(menuData);
      if (catData) setCategories(catData);
    } catch (err: any) {
      alert("Error fetching data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- LOGIC PENGECEKAN STOK ---
  const checkStockStatus = (menu: MenuItem) => {
    // Jika tidak ada resep (misal: jual air mineral botolan yg belum diinput resep), anggap Ready
    if (!menu.recipes || menu.recipes.length === 0) {
      return { available: true, message: "Ready (Tanpa Resep)" };
    }

    // Loop semua bahan di resep
    for (let r of menu.recipes) {
      if (r.ingredient.current_stock < r.quantity_needed) {
        return {
          available: false,
          message: `Kurang: ${r.ingredient.name} (Sisa ${r.ingredient.current_stock} ${r.ingredient.uom})`,
        };
      }
    }

    return { available: true, message: "Stok Bahan Aman" };
  };

  // --- LOGIC TOGGLE ACTIVE/INACTIVE ---
  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      // Update optimistik di UI biar cepat
      setMenus((prev) => prev.map((m) => (m.id === id ? { ...m, is_active: !currentStatus } : m)));

      // Update ke Database
      const { error } = await supabase.from("menu_items").update({ is_active: !currentStatus }).eq("id", id);

      if (error) throw error;
    } catch (err: any) {
      alert("Gagal update status: " + err.message);
      fetchData(); // Revert jika gagal
    }
  };

  // Handle Submit Form Menu Baru
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("menu_items").insert([
        {
          restaurant_id: RESTAURANT_ID,
          name: formData.name,
          price: Number(formData.price),
          category_id: formData.category_id,
          image_url: formData.image_url,
          is_active: true,
        },
      ]);

      if (error) throw error;

      alert("Menu berhasil dibuat!");
      setFormData({ name: "", price: 0, category_id: "", is_active: true, image_url: "" });
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      alert("Gagal: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Manajemen Menu</h1>
            <p className="text-gray-500 text-sm">Atur menu aktif dan pantau ketersediaan bahan.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition shadow">
            {showForm ? "Batal" : "+ Tambah Menu"}
          </button>
        </div>

        {/* FORM INPUT */}
        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-8 border border-indigo-100 animate-in fade-in slide-in-from-top-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Buat Menu Baru</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Menu</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  placeholder="Contoh: Nasi Goreng Spesial"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Harga Jual (Rp)</label>
                <input
                  type="number"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  placeholder="15000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select required value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900">
                  <option value="">-- Pilih Kategori --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Gambar (Opsional)</label>
                <input type="text" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900" placeholder="https://..." />
              </div>

              <div className="col-span-2 flex justify-end mt-4">
                <button type="submit" disabled={isSubmitting} className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 font-medium">
                  {isSubmitting ? "Menyimpan..." : "Simpan Menu"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* LIST MENU CARDS */}
        {loading ? (
          <p className="text-center py-10">Memuat data menu...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menus.map((menu) => {
              // Hitung status stok untuk setiap kartu
              const stockStatus = checkStockStatus(menu);

              return (
                <div key={menu.id} className={`bg-white rounded-xl shadow-sm border transition-all hover:shadow-md flex flex-col overflow-hidden ${menu.is_active ? "border-gray-200" : "border-gray-200 opacity-75 bg-gray-50"}`}>
                  {/* Gambar & Label Kategori */}
                  <div className="h-40 bg-gray-100 relative">
                    {menu.image_url ? (
                      <img src={menu.image_url} alt={menu.name} className={`w-full h-full object-cover ${!menu.is_active && "grayscale"}`} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">🍽️</div>
                    )}
                    <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">{menu.category?.name || "Umum"}</span>
                  </div>

                  {/* Konten Kartu */}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-gray-800 line-clamp-1" title={menu.name}>
                        {menu.name}
                      </h3>
                      <p className="text-indigo-600 font-bold">Rp {menu.price.toLocaleString()}</p>
                    </div>

                    {/* Indikator Stok Bahan */}
                    <div className={`mt-auto mb-4 px-3 py-2 rounded text-xs font-medium border ${stockStatus.available ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${stockStatus.available ? "bg-green-500" : "bg-red-500"}`}></div>
                        <span>{stockStatus.available ? "Bahan Tersedia" : "Bahan Habis!"}</span>
                      </div>
                      {!stockStatus.available && <p className="mt-1 font-normal opacity-80">{stockStatus.message}</p>}
                    </div>

                    {/* Toggle Switch Aktif/Non-Aktif */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <span className="text-sm text-gray-500 font-medium">Status Menu:</span>
                      <button
                        onClick={() => toggleStatus(menu.id, menu.is_active)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${menu.is_active ? "bg-green-500" : "bg-gray-300"}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${menu.is_active ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                    </div>
                    <p className="text-right text-xs text-gray-400 mt-1">{menu.is_active ? "Aktif (Tampil di POS)" : "Non-Aktif (Sembunyi)"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && menus.length === 0 && (
          <div className="text-center py-20 bg-white rounded-lg border border-dashed border-gray-300 mt-6">
            <p className="text-gray-500 text-lg">Belum ada menu.</p>
            <p className="text-gray-400 text-sm">Klik tombol Tambah Menu di atas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
