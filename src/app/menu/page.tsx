'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MenuItem, Category } from '@/types/database'

export default function MenuPage() {
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  
  // State Form & Logic Edit
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editId, setEditId] = useState<string | null>(null) // ID menu yang sedang diedit (null = mode tambah)
  
  // State Upload
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    category_id: '',
    is_active: true
  })

  // 🔴 PASTE UUID RESTORAN DISINI
  const RESTAURANT_ID = 'eaaefe2f-bd7d-4a4b-a40d-ee775ec44130' 

  // 1. Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true)
      
      const { data: menuData, error } = await supabase
        .from('menu_items')
        .select(`
          *,
          category:categories(name),
          recipes:recipes(
            quantity_needed,
            ingredient:ingredients(name, current_stock, uom)
          )
        `)
        .eq('restaurant_id', RESTAURANT_ID)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)

      // @ts-ignore
      if (menuData) setMenus(menuData)
      if (catData) setCategories(catData)

    } catch (err: any) {
      alert('Error fetching data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // --- LOGIC PENGECEKAN STOK ---
  const checkStockStatus = (menu: MenuItem) => {
    if (!menu.recipes || menu.recipes.length === 0) {
        return { available: true, message: 'Ready (Tanpa Resep)' }
    }
    for (let r of menu.recipes) {
        if (r.ingredient.current_stock < r.quantity_needed) {
            return { 
                available: false, 
                message: `Kurang: ${r.ingredient.name} (Sisa ${r.ingredient.current_stock} ${r.ingredient.uom})` 
            }
        }
    }
    return { available: true, message: 'Stok Bahan Aman' }
  }

  // --- LOGIC TOGGLE STATUS ---
  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
        setMenus(prev => prev.map(m => m.id === id ? { ...m, is_active: !currentStatus } : m))
        const { error } = await supabase
            .from('menu_items')
            .update({ is_active: !currentStatus })
            .eq('id', id)
        if (error) throw error
    } catch (err: any) {
        alert('Gagal update status: ' + err.message)
        fetchData()
    }
  }

  // --- RESET FORM (Bersihkan state saat tutup form atau mode tambah) ---
  const resetForm = () => {
    setFormData({ name: '', price: 0, category_id: '', is_active: true })
    setImageFile(null)
    setPreviewUrl(null)
    setEditId(null) // Reset ke mode tambah
    setShowForm(false)
  }

  // --- LOGIC HAPUS MENU ---
  const handleDelete = async (id: string, imageUrl: string | null) => {
    if (!confirm("Apakah Anda yakin ingin MENGHAPUS menu ini? Data tidak bisa dikembalikan.")) return;

    try {
        // 1. Hapus gambar dari Storage (Opsional, biar hemat space)
        if (imageUrl) {
            const fileName = imageUrl.split('/').pop() // Ambil nama file dari URL
            if (fileName) {
                await supabase.storage.from('menu-images').remove([fileName])
            }
        }

        // 2. Hapus data dari Database
        const { error } = await supabase.from('menu_items').delete().eq('id', id)
        if (error) throw error

        alert("Menu berhasil dihapus.")
        fetchData()
    } catch (err: any) {
        alert("Gagal menghapus: " + err.message)
    }
  }

  // --- LOGIC EDIT (Persiapan Form) ---
  const handleEditClick = (menu: MenuItem) => {
      setEditId(menu.id) // Set ID yang mau diedit
      setFormData({
          name: menu.name,
          price: menu.price,
          category_id: menu.category_id || '',
          is_active: menu.is_active
      })
      setPreviewUrl(menu.image_url) // Tampilkan gambar lama
      setShowForm(true) // Buka form
      
      // Scroll ke atas agar form terlihat
      window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // --- HANDLE FILE SELECT ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 2 * 1024 * 1024) return alert("Ukuran file terlalu besar! Maksimal 2MB.")
      setImageFile(file)
      setPreviewUrl(URL.createObjectURL(file)) 
    }
  }

  // --- HANDLE SUBMIT (CREATE & UPDATE) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let finalImageUrl = previewUrl // Default pakai URL lama jika mode edit

      // 1. Jika ada file gambar BARU, upload dulu
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('menu-images')
          .upload(filePath, imageFile)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('menu-images')
          .getPublicUrl(filePath)
        
        finalImageUrl = publicUrlData.publicUrl
      }

      // 2. Simpan Data (INSERT atau UPDATE)
      if (editId) {
          // --- MODE UPDATE ---
          const { error } = await supabase
            .from('menu_items')
            .update({
                name: formData.name,
                price: Number(formData.price),
                category_id: formData.category_id,
                image_url: finalImageUrl,
                is_active: formData.is_active
            })
            .eq('id', editId) // Update berdasarkan ID
          
          if (error) throw error
          alert('Menu berhasil diperbarui!')

      } else {
          // --- MODE CREATE ---
          const { error } = await supabase
            .from('menu_items')
            .insert([{
                restaurant_id: RESTAURANT_ID,
                name: formData.name,
                price: Number(formData.price),
                category_id: formData.category_id,
                image_url: finalImageUrl,
                is_active: true
            }])
        
          if (error) throw error
          alert('Menu berhasil dibuat!')
      }
      
      resetForm()
      fetchData() 

    } catch (err: any) {
      alert('Gagal: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Manajemen Menu</h1>
            <p className="text-gray-500 text-sm">Atur menu aktif, edit harga, dan pantau stok.</p>
          </div>
          <button 
            onClick={() => {
                if (showForm) resetForm() // Jika sedang buka form, tutup
                else setShowForm(true) // Jika tutup, buka (mode tambah)
            }}
            className={`px-4 py-2 rounded transition shadow text-white ${showForm ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {showForm ? 'Batal' : '+ Tambah Menu'}
          </button>
        </div>

        {/* FORM INPUT (Mode Tambah & Edit) */}
        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-8 border border-indigo-100 animate-in fade-in slide-in-from-top-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
                {editId ? `Edit Menu: ${formData.name}` : 'Buat Menu Baru'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Menu</label>
                <input 
                  type="text" required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  placeholder="Contoh: Nasi Goreng Spesial"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Harga Jual (Rp)</label>
                <input 
                  type="number" required
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  placeholder="15000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select 
                  required
                  value={formData.category_id}
                  onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                >
                  <option value="">-- Pilih Kategori --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* INPUT GAMBAR UPLOAD */}
              <div className="col-span-2">
                 <label className="block text-sm font-medium text-gray-700 mb-1">Upload Foto Menu</label>
                 <div className="flex items-start gap-4">
                    {/* Preview Image */}
                    <div className="w-24 h-24 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative">
                        {previewUrl ? (
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-gray-400 text-xs text-center">No Image</span>
                        )}
                    </div>
                    
                    <div className="flex-1">
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-indigo-50 file:text-indigo-700
                                hover:file:bg-indigo-100
                                cursor-pointer
                            "
                        />
                        <p className="text-xs text-gray-500 mt-2">Format: JPG, PNG. Maksimal 2MB. {editId && '(Biarkan kosong jika tidak ingin mengubah foto)'}</p>
                    </div>
                 </div>
              </div>

              <div className="col-span-2 flex justify-end mt-4 gap-3">
                <button 
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                    Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 font-medium disabled:opacity-50"
                >
                  {isSubmitting ? 'Memproses...' : (editId ? 'Simpan Perubahan' : 'Simpan Menu Baru')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* LIST MENU CARDS */}
        {loading ? <p className="text-center py-10">Memuat data menu...</p> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menus.map((menu) => {
                    const stockStatus = checkStockStatus(menu)

                    return (
                        <div key={menu.id} className={`bg-white rounded-xl shadow-sm border transition-all hover:shadow-md flex flex-col overflow-hidden group ${menu.is_active ? 'border-gray-200' : 'border-gray-200 opacity-75 bg-gray-50'}`}>
                            
                            {/* Gambar */}
                            <div className="h-40 bg-gray-100 relative overflow-hidden">
                                {menu.image_url ? (
                                    <img src={menu.image_url} alt={menu.name} className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${!menu.is_active && 'grayscale'}`} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">🍽️</div>
                                )}
                                
                                <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm z-10">
                                    {menu.category?.name || 'Umum'}
                                </span>

                                {/* ACTION BUTTONS (Edit & Delete) - Muncul saat hover (Desktop) atau Selalu ada (Mobile) */}
                                <div className="absolute top-2 left-2 flex gap-2">
                                    <button 
                                        onClick={() => handleEditClick(menu)}
                                        className="bg-white/90 p-1.5 rounded-full text-blue-600 hover:bg-blue-600 hover:text-white transition shadow-sm"
                                        title="Edit Menu"
                                    >
                                        ✏️
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(menu.id, menu.image_url)}
                                        className="bg-white/90 p-1.5 rounded-full text-red-600 hover:bg-red-600 hover:text-white transition shadow-sm"
                                        title="Hapus Menu"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>

                            {/* Konten */}
                            <div className="p-4 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-lg font-bold text-gray-800 line-clamp-1" title={menu.name}>{menu.name}</h3>
                                    <p className="text-indigo-600 font-bold">Rp {menu.price.toLocaleString()}</p>
                                </div>
                                
                                <div className={`mt-auto mb-4 px-3 py-2 rounded text-xs font-medium border ${
                                    stockStatus.available 
                                        ? 'bg-green-50 text-green-700 border-green-200' 
                                        : 'bg-red-50 text-red-700 border-red-200'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${stockStatus.available ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        <span>{stockStatus.available ? 'Bahan Tersedia' : 'Bahan Habis!'}</span>
                                    </div>
                                    {!stockStatus.available && (
                                        <p className="mt-1 font-normal opacity-80">{stockStatus.message}</p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    <span className="text-sm text-gray-500 font-medium">Status:</span>
                                    <button 
                                        onClick={() => toggleStatus(menu.id, menu.is_active)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                                            menu.is_active ? 'bg-green-500' : 'bg-gray-300'
                                        }`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                            menu.is_active ? 'translate-x-6' : 'translate-x-1'
                                        }`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
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
  )
}