'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type RestaurantSettings = {
  name: string
  receipt_header: string
  receipt_address: string
  receipt_phone: string
  receipt_footer: string
  tax_rate: number
}

type StaffProfile = {
  id: string
  full_name: string
  role: string
  pin_code: string
}

type PaymentMethod = {
  id: string
  name: string
  is_active: boolean
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'store' | 'staff' | 'payment'>('store')
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Data State
  const [settings, setSettings] = useState<RestaurantSettings>({
    name: '', receipt_header: '', receipt_address: '', receipt_phone: '', receipt_footer: '', tax_rate: 0
  })
  const [staffList, setStaffList] = useState<StaffProfile[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  
  // Form State
  const [newStaff, setNewStaff] = useState({ full_name: '', role: 'cashier', pin_code: '' })
  const [newPaymentName, setNewPaymentName] = useState('')

  const RESTAURANT_ID = 'eaaefe2f-bd7d-4a4b-a40d-ee775ec44130' 

  // 1. Fetch Data
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    // Ambil Setting Toko
    const { data: store } = await supabase.from('restaurants').select('*').eq('id', RESTAURANT_ID).single()
    if (store) setSettings(store)

    // Ambil Data Staff
    const { data: staff } = await supabase.from('profiles').select('*').eq('restaurant_id', RESTAURANT_ID)
    if (staff) setStaffList(staff)

    // Ambil Metode Pembayaran
    const { data: payments } = await supabase.from('payment_methods').select('*').eq('restaurant_id', RESTAURANT_ID).order('created_at')
    if (payments) setPaymentMethods(payments)

    setLoading(false)
  }

  // --- HANDLERS ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const { error } = await supabase.from('restaurants').update(settings).eq('id', RESTAURANT_ID)
      if (error) throw error
      alert('Pengaturan Toko Berhasil Disimpan!')
    } catch (err: any) { alert('Gagal: ' + err.message) } 
    finally { setIsSaving(false) }
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.from('profiles').insert([{ ...newStaff, restaurant_id: RESTAURANT_ID }])
      if (error) throw error
      alert('Karyawan berhasil ditambahkan'); setNewStaff({ full_name: '', role: 'cashier', pin_code: '' }); fetchData()
    } catch (err: any) { alert('Gagal: ' + err.message) }
  }

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Hapus akses karyawan ini?')) return
    await supabase.from('profiles').delete().eq('id', id); fetchData()
  }

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if(!newPaymentName) return
    try {
      const { error } = await supabase.from('payment_methods').insert([{ restaurant_id: RESTAURANT_ID, name: newPaymentName }])
      if (error) throw error
      setNewPaymentName(''); fetchData()
    } catch (err: any) { alert('Gagal: ' + err.message) }
  }

  const handleDeletePayment = async (id: string) => {
     if (!confirm('Hapus metode pembayaran ini?')) return
     await supabase.from('payment_methods').delete().eq('id', id); fetchData()
  }

  if (loading) return <div className="p-8">Loading Settings...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Pengaturan (Settings)</h1>

        {/* Tabs Navigation */}
        <div className="flex gap-4 border-b border-gray-200 mb-6 overflow-x-auto">
          {['store', 'staff', 'payment'].map((tab) => (
             <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`pb-2 px-4 font-medium capitalize whitespace-nowrap transition ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {tab === 'store' ? '🏪 Toko & Struk' : tab === 'staff' ? '👥 Manajemen User' : '💳 Metode Pembayaran'}
              </button>
          ))}
        </div>

        {/* CONTENT: STORE SETTINGS */}
        {activeTab === 'store' && (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Konfigurasi Struk & Pajak</h2>
            <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Restoran</label>
                <input type="text" value={settings.name} onChange={(e) => setSettings({...settings, name: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                <input type="text" value={settings.receipt_address} onChange={(e) => setSettings({...settings, receipt_address: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">No Telepon</label>
                <input type="text" value={settings.receipt_phone} onChange={(e) => setSettings({...settings, receipt_phone: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Footer Struk</label>
                <input type="text" value={settings.receipt_footer} onChange={(e) => setSettings({...settings, receipt_footer: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900" />
              </div>
              <div className="bg-yellow-50 p-4 rounded border border-yellow-200 col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">Pajak / Tax (%)</label>
                <input type="number" value={settings.tax_rate} onChange={(e) => setSettings({...settings, tax_rate: Number(e.target.value)})} className="w-24 border border-gray-300 rounded px-3 py-2 text-gray-900 font-bold" />
              </div>
              <div className="col-span-2 border-t pt-4 flex justify-end">
                <button type="submit" disabled={isSaving} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-bold">{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
              </div>
            </form>
          </div>
        )}

        {/* CONTENT: STAFF MANAGEMENT */}
        {activeTab === 'staff' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200 h-fit">
              <h3 className="font-bold text-lg mb-4 text-gray-800">Tambah Karyawan</h3>
              <form onSubmit={handleAddStaff} className="space-y-4">
                <input type="text" placeholder="Nama Lengkap" required value={newStaff.full_name} onChange={(e) => setNewStaff({...newStaff, full_name: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900" />
                <input type="text" placeholder="PIN (6 Digit)" required maxLength={6} value={newStaff.pin_code} onChange={(e) => setNewStaff({...newStaff, pin_code: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 font-mono" />
                <select value={newStaff.role} onChange={(e) => setNewStaff({...newStaff, role: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900">
                    <option value="cashier">Kasir</option>
                    <option value="manager">Manager</option>
                </select>
                <button type="submit" className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700">+ Tambah</button>
              </form>
            </div>
            <div className="md:col-span-2 bg-white p-6 rounded-lg shadow border border-gray-200">
              <h3 className="font-bold text-lg mb-4 text-gray-800">Daftar Karyawan</h3>
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-600 uppercase"><tr><th className="p-3">Nama</th><th className="p-3">Role</th><th className="p-3">PIN</th><th className="p-3">Aksi</th></tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {staffList.map((staff) => (
                    <tr key={staff.id} className="hover:bg-gray-50">
                      {/* PERBAIKAN: Menambahkan text-slate-900 & text-slate-600 agar tulisan terlihat */}
                      <td className="p-3 font-medium text-slate-900">{staff.full_name}</td>
                      <td className="p-3 uppercase text-xs text-slate-600">{staff.role}</td>
                      <td className="p-3 font-mono text-slate-600">****{staff.pin_code.slice(-2)}</td>
                      <td className="p-3"><button onClick={() => handleDeleteStaff(staff.id)} className="text-red-600 hover:text-red-800 text-xs font-bold">Hapus</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONTENT: PAYMENT METHODS */}
        {activeTab === 'payment' && (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-white p-6 rounded-lg shadow border border-gray-200 h-fit">
               <h3 className="font-bold text-lg mb-4 text-gray-800">Tambah Metode</h3>
               <form onSubmit={handleAddPayment} className="space-y-4">
                 <input type="text" placeholder="Nama (e.g., QRIS BCA)" required value={newPaymentName} onChange={(e) => setNewPaymentName(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900" />
                 <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700">+ Tambah</button>
               </form>
             </div>
             <div className="md:col-span-2 bg-white p-6 rounded-lg shadow border border-gray-200">
               <h3 className="font-bold text-lg mb-4 text-gray-800">Metode Pembayaran Aktif</h3>
               <ul className="space-y-2">
                 {paymentMethods.map(pm => (
                   <li key={pm.id} className="flex justify-between items-center p-3 border border-gray-100 rounded hover:bg-gray-50">
                     <span className="font-medium text-gray-800">{pm.name}</span>
                     <button onClick={() => handleDeletePayment(pm.id)} className="text-red-500 hover:text-red-700 text-sm">Hapus</button>
                   </li>
                 ))}
                 {paymentMethods.length === 0 && <p className="text-gray-400 text-sm italic">Belum ada metode pembayaran.</p>}
               </ul>
             </div>
           </div>
        )}

      </div>
    </div>
  )
}