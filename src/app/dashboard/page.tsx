'use client'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const { user } = useAuth()
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 11) setGreeting('Selamat Pagi')
    else if (hour < 15) setGreeting('Selamat Siang')
    else if (hour < 18) setGreeting('Selamat Sore')
    else setGreeting('Selamat Malam')
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Sambutan */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-800">{greeting}, {user?.full_name?.split(' ')[0]}! 👋</h1>
          <p className="text-slate-500 mt-2 text-lg">Apa yang ingin Anda lakukan hari ini?</p>
        </div>

        {/* Grid Menu Utama */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* OPSI 1: MASUK KASIR (POS) */}
          <Link href="/pos" className="group">
            <div className="bg-white border-2 border-blue-100 hover:border-blue-500 rounded-3xl p-8 shadow-sm hover:shadow-2xl transition-all duration-300 h-full flex flex-col items-center text-center cursor-pointer relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-blue-500"></div>
               <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-5xl mb-6 group-hover:scale-110 transition-transform">
                 🛒
               </div>
               <h2 className="text-2xl font-bold text-slate-800 mb-2">Buka Kasir (POS)</h2>
               <p className="text-slate-500">Mulai operasional penjualan, buka shift, dan terima transaksi pelanggan.</p>
               <span className="mt-8 px-6 py-2 bg-blue-600 text-white rounded-full font-bold group-hover:bg-blue-700 transition">Masuk Sekarang &rarr;</span>
            </div>
          </Link>

          {/* OPSI 2: MANAJEMEN TOKO (BACK OFFICE) */}
          <div className="grid grid-cols-1 gap-6">
             {/* Kartu Inventory */}
             <Link href="/inventory" className="group">
                <div className="bg-white border border-slate-200 hover:border-slate-400 rounded-2xl p-6 shadow-sm hover:shadow-lg transition flex items-center gap-6">
                    <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center text-3xl">📦</div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 group-hover:text-orange-600 transition">Cek Stok Gudang</h3>
                        <p className="text-slate-400 text-sm">Kelola bahan baku & stok masuk.</p>
                    </div>
                </div>
             </Link>

             {/* Kartu Menu */}
             <Link href="/menu" className="group">
                <div className="bg-white border border-slate-200 hover:border-slate-400 rounded-2xl p-6 shadow-sm hover:shadow-lg transition flex items-center gap-6">
                    <div className="w-16 h-16 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center text-3xl">🍔</div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 group-hover:text-purple-600 transition">Atur Daftar Menu</h3>
                        <p className="text-slate-400 text-sm">Tambah menu baru, edit harga, foto.</p>
                    </div>
                </div>
             </Link>

             {/* Kartu Resep */}
             <Link href="/recipes" className="group">
                <div className="bg-white border border-slate-200 hover:border-slate-400 rounded-2xl p-6 shadow-sm hover:shadow-lg transition flex items-center gap-6">
                    <div className="w-16 h-16 bg-green-50 text-green-500 rounded-xl flex items-center justify-center text-3xl">📜</div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 group-hover:text-green-600 transition">Racik Resep</h3>
                        <p className="text-slate-400 text-sm">Hubungkan menu dengan bahan baku.</p>
                    </div>
                </div>
             </Link>
          </div>

        </div>
      </div>
    </div>
  )
}