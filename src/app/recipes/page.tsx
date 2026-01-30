"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MenuItem, Ingredient, Recipe } from "@/types/database";

export default function RecipePage() {
  // Data Master
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // State Seleksi
  const [selectedMenuId, setSelectedMenuId] = useState<string>("");
  const [currentRecipes, setCurrentRecipes] = useState<Recipe[]>([]);

  // State Form
  const [formIngredientId, setFormIngredientId] = useState("");
  const [formQty, setFormQty] = useState(0);
  const [loading, setLoading] = useState(false);

  // 🔴 PASTE UUID RESTORAN DISINI
  const RESTAURANT_ID = "eaaefe2f-bd7d-4a4b-a40d-ee775ec44130";

  // 1. Load Data Awal (Menu & Bahan)
  useEffect(() => {
    const fetchMasterData = async () => {
      const { data: menuData } = await supabase.from("menu_items").select("*").eq("restaurant_id", RESTAURANT_ID).order("name", { ascending: true });

      const { data: ingData } = await supabase.from("ingredients").select("*").eq("restaurant_id", RESTAURANT_ID).order("name", { ascending: true });

      if (menuData) setMenus(menuData);
      if (ingData) setIngredients(ingData);
    };
    fetchMasterData();
  }, []);

  // 2. Load Resep ketika Menu dipilih
  const fetchRecipes = async (menuId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("recipes")
      .select(
        `
        *,
        ingredient:ingredients (name, uom)
      `,
      )
      .eq("menu_item_id", menuId);

    if (data) setCurrentRecipes(data as any); // as any dipakai karena struktur join
    setLoading(false);
  };

  // Handle Ganti Dropdown Menu
  const handleMenuChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const menuId = e.target.value;
    setSelectedMenuId(menuId);
    if (menuId) {
      fetchRecipes(menuId);
    } else {
      setCurrentRecipes([]);
    }
  };

  // Handle Tambah Bahan ke Resep
  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMenuId || !formIngredientId || formQty <= 0) return alert("Data tidak lengkap");

    try {
      const { error } = await supabase.from("recipes").insert([
        {
          menu_item_id: selectedMenuId,
          ingredient_id: formIngredientId,
          quantity_needed: formQty,
        },
      ]);

      if (error) throw error;

      // Refresh list resep
      fetchRecipes(selectedMenuId);
      setFormIngredientId("");
      setFormQty(0);
    } catch (err: any) {
      alert("Gagal: " + err.message);
    }
  };

  // Handle Hapus Bahan
  const handleDelete = async (id: string) => {
    if (!confirm("Hapus bahan ini dari resep?")) return;
    await supabase.from("recipes").delete().eq("id", id);
    fetchRecipes(selectedMenuId);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Manajemen Resep (BOM)</h1>

        {/* STEP 1: PILIH MENU */}
        <div className="bg-white p-6 rounded-lg shadow mb-6 border-l-4 border-blue-500">
          <label className="block text-sm font-bold text-gray-700 mb-2">Pilih Menu yang ingin diatur resepnya:</label>
          <select value={selectedMenuId} onChange={handleMenuChange} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500">
            <option value="">-- Pilih Menu --</option>
            {menus.map((menu) => (
              <option key={menu.id} value={menu.id}>
                {menu.name}
              </option>
            ))}
          </select>
        </div>

        {/* STEP 2: TAMPILAN RESEP */}
        {selectedMenuId && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Kiri: Daftar Bahan Saat Ini */}
            <div className="md:col-span-2 bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Komposisi Resep</h2>

              {loading ? (
                <p>Loading...</p>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-2">Bahan</th>
                      <th className="px-4 py-2">Jumlah</th>
                      <th className="px-4 py-2">Satuan</th>
                      <th className="px-4 py-2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRecipes.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-gray-400">
                          Belum ada bahan di set.
                        </td>
                      </tr>
                    ) : (
                      currentRecipes.map((recipe) => (
                        <tr key={recipe.id} className="border-b">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {/* @ts-ignore */}
                            {recipe.ingredient?.name}
                          </td>
                          <td className="px-4 py-3 text-gray-900">{recipe.quantity_needed}</td>
                          <td className="px-4 py-3 text-gray-500 text-sm">
                            {/* @ts-ignore */}
                            {recipe.ingredient?.uom}
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => handleDelete(recipe.id)} className="text-red-600 hover:text-red-800 text-sm font-bold">
                              Hapus
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Kanan: Form Tambah Bahan */}
            <div className="bg-gray-100 p-6 rounded-lg border border-gray-200 h-fit">
              <h3 className="text-lg font-bold text-gray-700 mb-4">+ Tambah Bahan</h3>
              <form onSubmit={handleAddIngredient}>
                <div className="mb-3">
                  <label className="block text-xs font-bold text-gray-500 mb-1">Bahan Baku</label>
                  <select required value={formIngredientId} onChange={(e) => setFormIngredientId(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-2 text-gray-900 bg-white">
                    <option value="">Pilih Bahan...</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.uom})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-500 mb-1">Takaran (Qty)</label>
                  <input
                    type="number"
                    required
                    step="0.01" // Biar bisa desimal
                    value={formQty}
                    onChange={(e) => setFormQty(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded px-2 py-2 text-gray-900 bg-white"
                    placeholder="0"
                  />
                </div>

                <button type="submit" className="w-full bg-green-600 text-white font-bold py-2 rounded hover:bg-green-700 transition">
                  Tambahkan
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
