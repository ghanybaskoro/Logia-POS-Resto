'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext' // Import Auth

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth() // Ambil fungsi logout

  // JIKA DI HALAMAN LOGIN ('/'), SEMBUNYIKAN SIDEBAR
  if (pathname === '/') return null

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { name: 'Kasir (POS)', href: '/pos', icon: '🛒' },
    { name: 'Laporan', href: '/reports', icon: '📈' }, 
    { name: 'Daftar Menu', href: '/menu', icon: '🍔' },
    { name: 'Resep (BOM)', href: '/recipes', icon: '📜' },
    { name: 'Gudang (Inventory)', href: '/inventory', icon: '📦' },
    { name: 'Pengaturan', href: '/settings', icon: '⚙️' },
  ]

  const handleLogout = () => {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
      logout()
    }
  }

  return (
    <aside className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 overflow-y-auto flex flex-col shadow-xl z-50">
      {/* Header Logo */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold tracking-wider text-blue-400">CloudResto<span className="text-white">.</span></h1>
        <p className="text-xs text-slate-400 mt-1">Enterprise POS System</p>
      </div>
      
      {/* Menu Navigasi */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Profil User & Logout */}
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center font-bold text-sm uppercase shadow-lg border-2 border-slate-700">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 overflow-hidden">
              <p className="text-sm font-bold truncate text-white">{user?.full_name || 'Guest'}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{user?.role || 'Unknown'}</p>
            </div>
          </div>
          
          {/* Tombol Logout Merah */}
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white py-2 rounded-lg text-xs font-bold transition-all duration-200"
          >
            <span>🚪</span> Keluar / Logout
          </button>
        </div>
      </div>
    </aside>
  )
}