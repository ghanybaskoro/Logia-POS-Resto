'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { RESTAURANT_ID } from '@/lib/config'
import * as XLSX from 'xlsx' 

// --- TYPES ---
type Order = {
  id: string
  total_amount: number
  payment_method: string
  created_at: string
  status: string
  cashier_id: string
  cashier?: { full_name: string } | null
}

type OrderItemDetail = {
  id: string
  menu_item_id: string
  quantity: number
  price_at_time: number
  menu_item: { name: string; image_url: string | null }
}

type PosSession = {
  id: string
  start_time: string
  end_time: string | null
  starting_cash: number
  ending_cash: number
  total_cash_sales: number
  total_non_cash_sales: number
  status: string
  cashier_id: string
  cashier?: { full_name: string } | null
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'sales' | 'audit'>('sales')
  const [loading, setLoading] = useState(true)

  // FILTER TANGGAL (Default: Hari Ini)
  const [startDateInput, setStartDateInput] = useState(new Date().toISOString().split('T')[0])
  const [endDateInput, setEndDateInput] = useState(new Date().toISOString().split('T')[0])

  // Data Utama
  const [orders, setOrders] = useState<Order[]>([])
  const [sessions, setSessions] = useState<PosSession[]>([])

  // Table Features
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  
  // --- PERUBAHAN DISINI: UBAH KE 20 ---
  const itemsPerPage = 20 

  // Modal Detail
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItemDetail[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  // --- LOGIKA TOMBOL PRESET (SHORTCUT) ---
  const applyPreset = (type: 'today' | 'week' | 'month') => {
      const now = new Date()
      const start = new Date(now)
      const end = new Date(now) 

      if (type === 'today') {
          // start = now
      } else if (type === 'week') {
          start.setDate(now.getDate() - 7)
      } else if (type === 'month') {
          start.setDate(1) 
      }

      setStartDateInput(start.toISOString().split('T')[0])
      setEndDateInput(end.toISOString().split('T')[0])
  }

  // --- FETCH DATA ---
  useEffect(() => {
    fetchData()
  }, [startDateInput, endDateInput])

  const fetchData = async () => {
    setLoading(true)
    
    const startIso = new Date(`${startDateInput}T00:00:00`).toISOString()
    const endIso = new Date(`${endDateInput}T23:59:59`).toISOString()

    // 1. Ambil Orders
    const { data: orderData } = await supabase
      .from('orders')
      .select('*, cashier:profiles(full_name)') 
      .eq('restaurant_id', RESTAURANT_ID)
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: false })

    // 2. Ambil Sesi Shift
    const { data: sessionData } = await supabase
      .from('pos_sessions')
      .select('*, cashier:profiles(full_name)')
      .eq('restaurant_id', RESTAURANT_ID)
      .gte('start_time', startIso)
      .lte('start_time', endIso)
      .order('start_time', { ascending: false })

    // @ts-ignore
    if (orderData) setOrders(orderData)
    // @ts-ignore
    if (sessionData) setSessions(sessionData)
    setLoading(false)
  }

  // --- FILTER SEARCH ---
  const filteredOrders = orders.filter((o) => {
      const term = searchTerm.toLowerCase()
      const matchName = o.cashier?.full_name?.toLowerCase().includes(term) || false
      const matchId = o.id.toLowerCase().includes(term)
      const matchMethod = o.payment_method?.toLowerCase().includes(term)
      return matchId || matchMethod || matchName
  })

  // --- KALKULASI DARI DATA TERFILTER ---
  const totalOmset = filteredOrders.reduce((sum, o) => sum + o.total_amount, 0)
  const totalTransaksi = filteredOrders.length
  const avgBasket = totalTransaksi > 0 ? totalOmset / totalTransaksi : 0

  // --- PAGINATION ---
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const displayedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  useEffect(() => setCurrentPage(1), [searchTerm, startDateInput])

  // --- LOGIC LAINNYA ---
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()
    const salesData = filteredOrders.map(o => ({
        "ID": o.id, "Waktu": new Date(o.created_at).toLocaleString('id-ID'),
        "PIC": o.cashier?.full_name || '-', "Metode": o.payment_method,
        "Total": o.total_amount
    }))
    const wsSales = XLSX.utils.json_to_sheet(salesData)
    XLSX.utils.book_append_sheet(wb, wsSales, "Penjualan")
    XLSX.writeFile(wb, `Laporan_${startDateInput}.xlsx`)
  }

  const handleViewDetail = async (order: Order) => {
      setSelectedOrder(order); setShowDetailModal(true); setLoadingDetails(true); setOrderItems([])
      const { data } = await supabase.from('order_items').select(`id, quantity, price_at_time, menu_item:menu_items (name, image_url)`).eq('order_id', order.id)
      // @ts-ignore
      if (data) setOrderItems(data)
      setLoadingDetails(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER & FILTER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Laporan Keuangan</h1>
                <p className="text-slate-500 text-sm">Analisa performa penjualan & audit.</p>
            </div>
            
            <div className="flex flex-col gap-2 items-end w-full lg:w-auto">
                <div className="flex gap-2">
                    <button onClick={() => applyPreset('today')} className="px-3 py-1 bg-slate-100 hover:bg-blue-50 text-slate-600 text-xs font-bold rounded border border-slate-200 transition">Hari Ini</button>
                    <button onClick={() => applyPreset('week')} className="px-3 py-1 bg-slate-100 hover:bg-blue-50 text-slate-600 text-xs font-bold rounded border border-slate-200 transition">7 Hari</button>
                    <button onClick={() => applyPreset('month')} className="px-3 py-1 bg-slate-100 hover:bg-blue-50 text-slate-600 text-xs font-bold rounded border border-slate-200 transition">Bulan Ini</button>
                </div>
                <div className="flex items-center gap-2">
                    <input 
                        type="date" 
                        value={startDateInput}
                        onChange={(e) => setStartDateInput(e.target.value)}
                        className="border border-slate-300 bg-white rounded px-3 py-2 text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <span className="text-slate-400 font-bold">-</span>
                    <input 
                        type="date" 
                        value={endDateInput}
                        onChange={(e) => setEndDateInput(e.target.value)}
                        className="border border-slate-300 bg-white rounded px-3 py-2 text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button onClick={handleExportExcel} className="ml-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-bold shadow transition">📥</button>
                </div>
            </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Omset</p>
                <h3 className="text-3xl font-bold text-slate-800">Rp {totalOmset.toLocaleString()}</h3>
                <p className="text-xs text-green-600 mt-2 font-medium bg-green-50 inline-block px-2 py-1 rounded">Berdasarkan {totalTransaksi} transaksi</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Transaksi</p>
                <h3 className="text-3xl font-bold text-slate-800">{totalTransaksi}</h3>
                <p className="text-xs text-blue-600 mt-2 font-medium bg-blue-50 inline-block px-2 py-1 rounded">Struk Terbayar</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Rata-Rata Keranjang</p>
                <h3 className="text-3xl font-bold text-slate-800">Rp {Math.round(avgBasket).toLocaleString()}</h3>
                <p className="text-xs text-orange-600 mt-2 font-medium bg-orange-50 inline-block px-2 py-1 rounded">Per Pelanggan</p>
            </div>
        </div>

        {/* TABS & CONTENT */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200">
                <button onClick={() => setActiveTab('sales')} className={`flex-1 py-4 text-sm font-bold border-b-2 transition ${activeTab === 'sales' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>📊 Penjualan</button>
                <button onClick={() => setActiveTab('audit')} className={`flex-1 py-4 text-sm font-bold border-b-2 transition ${activeTab === 'audit' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>🛡️ Audit Shift</button>
            </div>

            {activeTab === 'sales' && (
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800">Rincian Transaksi</h3>
                        <input 
                            type="text" 
                            placeholder="🔍 Cari PIC / Metode / ID..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="px-4 py-2 border border-slate-300 bg-white text-slate-800 placeholder-slate-400 rounded-lg text-sm w-64 focus:border-blue-500 outline-none shadow-sm" 
                        />
                    </div>

                    {/* TABLE */}
                    <div className="overflow-x-auto rounded-lg border border-slate-200 mb-6">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs border-b border-slate-200">
                                <tr>
                                    <th className="p-3">Waktu</th>
                                    <th className="p-3">ID</th>
                                    <th className="p-3">PIC</th>
                                    <th className="p-3">Metode</th>
                                    <th className="p-3 text-right">Total</th>
                                    <th className="p-3 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {displayedOrders.map((o) => (
                                    <tr key={o.id} className="hover:bg-slate-50">
                                        <td className="p-3 text-slate-700 whitespace-nowrap">{new Date(o.created_at).toLocaleString('id-ID')}</td>
                                        <td className="p-3 font-mono text-xs text-slate-500">{o.id.slice(0,6)}...</td>
                                        <td className="p-3 font-medium text-slate-800">{o.cashier?.full_name || 'Admin'}</td>
                                        <td className="p-3">
                                            <span className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded text-xs font-bold shadow-sm">
                                                {o.payment_method}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right font-bold text-slate-800">Rp {o.total_amount.toLocaleString()}</td>
                                        <td className="p-3 text-center"><button onClick={() => handleViewDetail(o)} className="text-blue-600 hover:text-blue-800 text-xs font-bold hover:underline">Lihat</button></td>
                                    </tr>
                                ))}
                                {displayedOrders.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500 italic">Tidak ada data untuk periode ini.</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION */}
                    <div className="flex justify-center gap-2">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                            disabled={currentPage === 1} 
                            className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 disabled:opacity-50 disabled:bg-slate-50 shadow-sm transition"
                        >
                            « Prev
                        </button>
                        <span className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                            Hal {currentPage} / {totalPages || 1}
                        </span>
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                            disabled={currentPage === totalPages || totalPages === 0} 
                            className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 disabled:opacity-50 disabled:bg-slate-50 shadow-sm transition"
                        >
                            Next »
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'audit' && (
                <div className="p-6">
                    <h3 className="font-bold text-slate-800 mb-4">Riwayat Sesi Shift</h3>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                         <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs border-b border-slate-200">
                                <tr>
                                    <th className="p-3">PIC</th>
                                    <th className="p-3">Buka</th>
                                    <th className="p-3">Tutup</th>
                                    <th className="p-3 text-right">Modal</th>
                                    <th className="p-3 text-right">Tunai (Sys)</th>
                                    <th className="p-3 text-right">Setoran</th>
                                    <th className="p-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sessions.map((s) => (
                                    <tr key={s.id} className="hover:bg-slate-50">
                                        <td className="p-3 font-medium text-slate-800">{s.cashier?.full_name || 'Admin'}</td>
                                        <td className="p-3 text-slate-600">{new Date(s.start_time).toLocaleString('id-ID')}</td>
                                        <td className="p-3 text-slate-600">{s.end_time ? new Date(s.end_time).toLocaleString('id-ID') : '-'}</td>
                                        <td className="p-3 text-right text-slate-500">Rp {s.starting_cash.toLocaleString()}</td>
                                        <td className="p-3 text-right text-green-600 font-bold">+ Rp {s.total_cash_sales.toLocaleString()}</td>
                                        <td className="p-3 text-right font-bold text-slate-800">{s.status === 'closed' ? `Rp ${s.ending_cash.toLocaleString()}` : '-'}</td>
                                        <td className="p-3 text-center"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${s.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{s.status === 'open' ? 'Aktif' : 'Selesai'}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>

        {/* MODAL DETAIL */}
        {showDetailModal && selectedOrder && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Detail Transaksi</h3>
                        <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
                    </div>
                    <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
                        {loadingDetails ? <p className="text-center text-slate-400">Loading...</p> : orderItems.map((item) => (
                            <div key={item.id} className="flex justify-between items-center border-b border-slate-50 pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                                        {item.menu_item?.image_url ? <img src={item.menu_item.image_url} className="w-full h-full object-cover"/> : <div className="flex items-center justify-center h-full text-xs text-slate-400">🍽️</div>}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-slate-800 line-clamp-1">{item.menu_item?.name}</p>
                                        <p className="text-xs text-slate-500">{item.quantity} x Rp {item.price_at_time.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="font-bold text-sm text-slate-800">Rp {(item.quantity * item.price_at_time).toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between">
                        <span className="font-bold text-slate-500">Total</span>
                        <span className="text-xl font-bold text-blue-600">Rp {selectedOrder.total_amount.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  )
}