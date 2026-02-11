'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MenuItem, Ingredient } from '@/types/database'

type RecipeItem = {
  id: string
  ingredient_id: string
  quantity_needed: number
  ingredient: {
    name: string
    uom: string
  }
}

export default function RecipesPage() {
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)

  // State Modal & Pilihan Menu
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null)
  const [showModal, setShowModal] = useState(false)
  
  // State Data Resep
  const [currentRecipes, setCurrentRecipes] = useState<RecipeItem[]>([])
  
  // State Master Resep (Text)
  const [instructions, setInstructions] = useState('')
  const [recipeNotes, setRecipeNotes] = useState('')
  const [isSavingDetails, setIsSavingDetails] = useState(false)

  // Form Tambah Bahan
  const [newIngredientId, setNewIngredientId] = useState('')
  const [newQty, setNewQty] = useState('')

  const RESTAURANT_ID = 'eaaefe2f-bd7d-4a4b-a40d-ee775ec44130' 

  // 1. Fetch Data Awal
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('name')
      
      const { data: ingData } = await supabase
        .from('ingredients')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('name')

      if (menuData) setMenus(menuData)
      if (ingData) setIngredients(ingData)
      
      setLoading(false)
    }
    fetchData()
  }, [])

  // 2. Fetch Detail saat Menu dipilih
  const handleSelectMenu = async (menu: MenuItem) => {
      setSelectedMenu(menu)
      setShowModal(true)
      
      setInstructions(menu.cooking_instructions || '')
      setRecipeNotes(menu.recipe_notes || '')
      setNewIngredientId('')
      setNewQty('')

      const { data } = await supabase
        .from('recipes')
        .select(`id, ingredient_id, quantity_needed, ingredient:ingredients(name, uom)`)
        .eq('menu_item_id', menu.id)
      
      // @ts-ignore
      if (data) setCurrentRecipes(data)
  }

  // --- HANDLER ---
  const handleAddIngredient = async () => {
    if (!newIngredientId || !newQty || !selectedMenu) return alert("Pilih bahan dan jumlahnya")

    try {
      const { error } = await supabase.from('recipes').insert([{
        menu_item_id: selectedMenu.id,
        ingredient_id: newIngredientId,
        quantity_needed: Number(newQty)
      }])

      if (error) throw error
      
      const { data } = await supabase
        .from('recipes')
        .select(`id, ingredient_id, quantity_needed, ingredient:ingredients(name, uom)`)
        .eq('menu_item_id', selectedMenu.id)
      
      // @ts-ignore
      if (data) setCurrentRecipes(data)
      setNewQty('')

    } catch (err: any) {
      alert("Gagal: " + err.message)
    }
  }

  const handleDeleteRecipe = async (id: string) => {
    await supabase.from('recipes').delete().eq('id', id)
    setCurrentRecipes(prev => prev.filter(r => r.id !== id))
  }

  const handleSaveDetails = async () => {
      if(!selectedMenu) return
      setIsSavingDetails(true)
      try {
          const { error } = await supabase
            .from('menu_items')
            .update({
                cooking_instructions: instructions,
                recipe_notes: recipeNotes
            })
            .eq('id', selectedMenu.id)

          if (error) throw error
          
          setMenus(prev => prev.map(m => m.id === selectedMenu.id ? { ...m, cooking_instructions: instructions, recipe_notes: recipeNotes } : m))

          alert("SOP Resep berhasil disimpan!")
      } catch (err: any) {
          alert("Gagal menyimpan: " + err.message)
      } finally {
          setIsSavingDetails(false)
      }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Manajemen Resep (SOP)</h1>
        <p className="text-gray-500 mb-8">Klik pada menu untuk mengatur bahan baku dan cara masak.</p>

        {/* GRID MENU */}
        {loading ? <p>Loading menu...</p> : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {menus.map((menu) => (
                    <div 
                        key={menu.id} 
                        onClick={() => handleSelectMenu(menu)}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group overflow-hidden"
                    >
                        <div className="h-40 bg-gray-100 relative">
                            {menu.image_url ? (
                                <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                            )}
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                                Klik untuk atur
                            </div>
                        </div>
                        <div className="p-4">
                            <h3 className="font-bold text-gray-800 text-lg line-clamp-1">{menu.name}</h3>
                            <p className="text-sm text-blue-600 font-medium mt-1">Rp {menu.price.toLocaleString()}</p>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* MODAL BESAR (Fullscreen-like) */}
        {showModal && selectedMenu && (
            <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-7xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                    
                    {/* Header Modal */}
                    <div className="p-6 bg-white border-b border-gray-100 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-6">
                            {selectedMenu.image_url && (
                                <img src={selectedMenu.image_url} className="w-16 h-16 rounded-xl object-cover border border-gray-200 shadow-sm" alt="Menu" />
                            )}
                            <div>
                                <h2 className="text-3xl font-bold text-gray-800">{selectedMenu.name}</h2>
                                <p className="text-gray-500 text-base">Atur Komposisi & Cara Masak</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                             <button 
                                onClick={handleSaveDetails}
                                disabled={isSavingDetails}
                                className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-700 shadow-lg shadow-orange-200 disabled:opacity-50 text-lg flex items-center gap-2"
                            >
                                💾 {isSavingDetails ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </button>
                            <button 
                                onClick={() => setShowModal(false)}
                                className="w-12 h-12 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-2xl font-bold"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Konten Modal (Grid) */}
                    <div className="flex-1 overflow-hidden grid grid-cols-12 bg-gray-50">
                        
                        {/* KOLOM KIRI: BAHAN BAKU (Lebar: 4/12) */}
                        <div className="col-span-12 lg:col-span-4 p-6 overflow-y-auto border-r border-gray-200 bg-white">
                            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 text-xl">
                                📦 Komposisi Bahan
                            </h3>
                            
                            {/* List Bahan */}
                            <div className="space-y-3 mb-8">
                                {currentRecipes.length === 0 ? (
                                    <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                        <p className="text-gray-400">Belum ada bahan yang diset.</p>
                                    </div>
                                ) : (
                                    currentRecipes.map(r => (
                                        <div key={r.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition">
                                            <div>
                                                <p className="font-bold text-gray-800 text-lg">{r.ingredient.name}</p>
                                                <p className="text-xs text-gray-500">Stok Gudang</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-bold text-lg">
                                                    {r.quantity_needed} {r.ingredient.uom}
                                                </span>
                                                <button onClick={() => handleDeleteRecipe(r.id)} className="text-red-400 hover:text-red-600 p-2">🗑️</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Form Tambah */}
                            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                                <h4 className="font-bold text-blue-800 mb-4 uppercase text-sm tracking-wider">+ Tambah Bahan Baru</h4>
                                <div className="space-y-4">
                                    <select 
                                        value={newIngredientId}
                                        onChange={(e) => setNewIngredientId(e.target.value)}
                                        className="w-full border-2 border-blue-200 rounded-xl px-4 py-3 text-gray-800 bg-white font-medium focus:border-blue-500 outline-none"
                                    >
                                        <option value="">-- Pilih Bahan Baku --</option>
                                        {ingredients.map(ing => (
                                            <option key={ing.id} value={ing.id}>{ing.name} ({ing.uom})</option>
                                        ))}
                                    </select>
                                    
                                    <div className="flex gap-3">
                                        <input 
                                            type="number" 
                                            value={newQty}
                                            onChange={(e) => setNewQty(e.target.value)}
                                            placeholder="Jml"
                                            className="w-24 border-2 border-blue-200 rounded-xl px-4 py-3 text-gray-800 font-bold focus:border-blue-500 outline-none"
                                        />
                                        <button 
                                            onClick={handleAddIngredient}
                                            className="flex-1 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition"
                                        >
                                            Tambah
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* KOLOM KANAN: SOP MASAK (Lebar: 8/12 - LEBIH BESAR) */}
                        <div className="col-span-12 lg:col-span-8 p-8 overflow-y-auto bg-slate-50">
                             <div className="max-w-4xl mx-auto">
                                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-3 text-2xl">
                                    👨‍🍳 Instruksi Masak (SOP)
                                </h3>

                                <div className="space-y-8">
                                    {/* Catatan Bumbu */}
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
                                        <label className="block text-lg font-bold text-gray-800 mb-3">
                                            🌶️ Catatan Bumbu Halus / Marinasi
                                        </label>
                                        <textarea 
                                            value={recipeNotes}
                                            onChange={(e) => setRecipeNotes(e.target.value)}
                                            className="w-full border-2 border-gray-200 rounded-xl p-4 text-gray-800 text-lg focus:border-orange-400 focus:ring-4 focus:ring-orange-100 outline-none transition"
                                            rows={3}
                                            placeholder="Contoh: Bawang merah 5 siung, Bawang putih 3 siung, Cabe rawit 10 buah..."
                                        />
                                    </div>

                                    {/* Langkah Memasak - AREA BESAR */}
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 h-full flex flex-col">
                                        <label className="block text-lg font-bold text-gray-800 mb-3">
                                            🔥 Langkah-Langkah Memasak
                                        </label>
                                        <textarea 
                                            value={instructions}
                                            onChange={(e) => setInstructions(e.target.value)}
                                            className="w-full border-2 border-gray-200 rounded-xl p-6 text-gray-900 text-xl leading-relaxed focus:border-orange-400 focus:ring-4 focus:ring-orange-100 outline-none font-sans min-h-[400px]"
                                            placeholder="1. Panaskan minyak..."
                                        />
                                    </div>
                                </div>

                                <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                                    <span className="text-2xl">💡</span>
                                    <p className="text-yellow-800 text-sm mt-1">
                                        <strong>Tips:</strong> Gunakan bahasa yang sederhana dan poin-poin agar mudah dibaca sekilas oleh koki saat sedang sibuk.
                                    </p>
                                </div>
                             </div>
                        </div>

                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  )
}