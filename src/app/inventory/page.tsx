"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Ingredient } from "@/types/database";

export default function InventoryPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    uom: "kg",
    current_stock: 0,
    minimum_stock_alert: 5,
  });

  // 🔴 PASTIKAN UUID RESTORAN ANDA BENAR DI SINI
  const RESTAURANT_ID = "eaaefe2f-bd7d-4a4b-a40d-ee775ec44130";

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("ingredients").select("*").eq("restaurant_id", RESTAURANT_ID).order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setIngredients(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("ingredients").insert([
        {
          restaurant_id: RESTAURANT_ID,
          name: formData.name,
          sku: formData.sku,
          uom: formData.uom,
          current_stock: Number(formData.current_stock),
          minimum_stock_alert: Number(formData.minimum_stock_alert),
        },
      ]);

      if (error) throw error;

      setFormData({ name: "", sku: "", uom: "kg", current_stock: 0, minimum_stock_alert: 5 });
      setShowForm(false);
      fetchIngredients();
      alert("Bahan berhasil ditambahkan!");
    } catch (err: any) {
      alert("Gagal menyimpan: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Gudang Bahan Baku</h1>
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition shadow-sm">
            {showForm ? "Batal" : "+ Tambah Bahan"}
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-blue-100">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Input Bahan Baru</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Bahan</label>
                {/* PERBAIKAN: text-gray-900 ditambahkan */}
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Contoh: Telur Ayam"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU / Kode</label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  placeholder="Contoh: ING-002"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Satuan (UOM)</label>
                <select name="uom" value={formData.uom} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="kg">Kilogram (kg)</option>
                  <option value="gr">Gram (gr)</option>
                  <option value="ltr">Liter (ltr)</option>
                  <option value="ml">Mililiter (ml)</option>
                  <option value="pcs">Pcs / Butir</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stok Awal</label>
                <input
                  type="number"
                  name="current_stock"
                  value={formData.current_stock}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Peringatan Minimum</label>
                <input
                  type="number"
                  name="minimum_stock_alert"
                  value={formData.minimum_stock_alert}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div className="col-span-2 flex justify-end mt-2">
                <button type="submit" disabled={isSubmitting} className={`px-6 py-2 rounded text-white font-medium ${isSubmitting ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}>
                  {isSubmitting ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabel Data */}
        {loading && <p className="text-gray-500 text-center py-10">Sedang memuat data...</p>}
        {error && <p className="text-red-500 bg-red-50 p-3 rounded">Error: {error}</p>}

        {!loading && !error && (
          <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
            <table className="w-full text-left">
              <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3">Nama Bahan</th>
                  <th className="px-6 py-3 text-center">Stok</th>
                  <th className="px-6 py-3">Satuan</th>
                  <th className="px-6 py-3 text-right">Odoo ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ingredients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                      Belum ada data bahan baku.
                    </td>
                  </tr>
                ) : (
                  ingredients.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{item.sku || "-"}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${item.current_stock <= item.minimum_stock_alert ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>{item.current_stock}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">{item.uom}</td>
                      <td className="px-6 py-4 text-right text-xs font-mono text-gray-400">{item.odoo_product_id ? `#${item.odoo_product_id}` : "Not Linked"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
