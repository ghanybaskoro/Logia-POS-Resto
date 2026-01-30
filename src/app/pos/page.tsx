"use client";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { MenuItem, Category } from "@/types/database";

type CartItem = MenuItem & { qty: number };

type TransactionSnapshot = {
  id: string;
  items: CartItem[];
  subTotal: number;
  tax: number;
  total: number;
  date: string;
  cashierName: string;
  paymentMethod: string;
};

type PaymentMethod = {
  id: string;
  name: string;
};

export default function POSPage() {
  // --- STATE DATA ---
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  // --- STATE UI ---
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Modal States
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");

  const [lastTransaction, setLastTransaction] = useState<TransactionSnapshot | null>(null);

  // Settings
  const [settings, setSettings] = useState({
    name: "CloudResto",
    receipt_header: "Enterprise POS",
    receipt_address: "Alamat Belum Diset",
    receipt_phone: "-",
    receipt_footer: "Terima Kasih",
    tax_rate: 10,
  });

  const RESTAURANT_ID = "eaaefe2f-bd7d-4a4b-a40d-ee775ec44130";

  // 1. Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: menuData } = await supabase.from("menu_items").select(`*, category:categories(id, name)`).eq("restaurant_id", RESTAURANT_ID).eq("is_active", true);
      const { data: catData } = await supabase.from("categories").select("*").eq("restaurant_id", RESTAURANT_ID);
      const { data: storeData } = await supabase.from("restaurants").select("*").eq("id", RESTAURANT_ID).single();
      const { data: payData } = await supabase.from("payment_methods").select("*").eq("restaurant_id", RESTAURANT_ID).eq("is_active", true);

      if (menuData) setMenus(menuData);
      if (catData) setCategories(catData);
      if (storeData) setSettings(storeData);
      if (payData) {
        setPaymentMethods(payData);
        if (payData.length > 0) setSelectedPaymentMethod(payData[0].name);
      }

      setLoading(false);
    };
    fetchData();
  }, []);

  // 2. Filter & Cart Logic
  const filteredMenus = useMemo(() => {
    return menus.filter((menu) => {
      const matchSearch = menu.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = selectedCategory === "ALL" || menu.category_id === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [menus, searchTerm, selectedCategory]);

  const addToCart = (menu: MenuItem) => {
    setCart((prev) => {
      const exist = prev.find((i) => i.id === menu.id);
      if (exist) return prev.map((i) => (i.id === menu.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { ...menu, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(
      (prev) =>
        prev
          .map((item) => {
            if (item.id === id) return { ...item, qty: Math.max(0, item.qty + delta) };
            return item;
          })
          .filter((item) => (item?.qty || 0) > 0) as CartItem[],
    );
  };

  // --- KEUANGAN ---
  const subTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const taxAmount = subTotal * (settings.tax_rate / 100);
  const grandTotal = subTotal + taxAmount;

  // 3. Checkout Flow
  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    setShowPaymentModal(true);
  };

  const handleProcessPayment = async () => {
    if (!selectedPaymentMethod) return alert("Pilih metode pembayaran dulu!");

    setIsCheckingOut(true);
    try {
      // A. Simpan Order
      const { data: order, error } = await supabase
        .from("orders")
        .insert([
          {
            restaurant_id: RESTAURANT_ID,
            total_amount: grandTotal,
            payment_method: selectedPaymentMethod,
            status: "paid",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // B. Simpan Items
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: item.qty,
        price_at_time: item.price,
      }));
      await supabase.from("order_items").insert(orderItems);

      // C. Siapkan Struk
      setLastTransaction({
        id: order.id,
        items: [...cart],
        subTotal: subTotal,
        tax: taxAmount,
        total: grandTotal,
        date: new Date().toLocaleString("id-ID"),
        cashierName: "Admin",
        paymentMethod: selectedPaymentMethod,
      });

      // D. Reset UI
      setShowPaymentModal(false);
      setShowSuccessModal(true);
      setCart([]);
    } catch (err: any) {
      alert("Transaksi Gagal: " + err.message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handlePrint = () => window.print();

  return (
    <>
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          aside,
          nav,
          header {
            display: none !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          #printable-receipt {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            margin: 0;
          }
          @page {
            size: auto;
            margin: 0mm;
          }
          body {
            background: white;
          }
        }
      `}</style>

      {/* UI UTAMA */}
      <div className="flex h-[calc(100vh-4rem)] gap-6 no-print">
        {/* KIRI: MENU */}
        <div className="w-2/3 flex flex-col gap-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-slate-800">Kasir Restoran</h1>
              <input type="text" placeholder="🔍 Cari menu..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg w-64 text-slate-900 bg-slate-50" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button onClick={() => setSelectedCategory("ALL")} className={`px-4 py-2 rounded-full text-sm font-medium ${selectedCategory === "ALL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
                Semua
              </button>
              {categories.map((cat) => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-2 rounded-full text-sm font-medium ${selectedCategory === cat.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 pb-20">
            {loading ? (
              <p className="text-center mt-10">Loading...</p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {filteredMenus.map((menu) => (
                  <div key={menu.id} onClick={() => addToCart(menu)} className="bg-white rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-blue-500 overflow-hidden group">
                    <div className="h-24 bg-slate-100 relative">
                      {menu.image_url ? (
                        <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">🍽️</div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{menu.name}</h3>
                      <p className="text-blue-600 font-bold text-sm">Rp {menu.price.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* KANAN: CART */}
        <div className="w-1/3 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden h-full">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h2 className="font-bold text-lg text-slate-800">Order Saat Ini</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm border-b pb-2">
                <div>
                  <div className="font-bold text-slate-800">{item.name}</div>
                  <div className="text-slate-500">
                    Rp {item.price.toLocaleString()} x {item.qty}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.id, -1)} className="text-red-500 px-2 bg-red-50 rounded">
                    -
                  </button>
                  <span className="font-bold w-4 text-center">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="text-green-600 px-2 bg-green-50 rounded">
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal</span>
                <span>Rp {subTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>Pajak ({settings.tax_rate}%)</span>
                <span>Rp {taxAmount.toLocaleString()}</span>
              </div>
              <div className="border-t border-slate-300 my-2"></div>
              <div className="flex justify-between text-xl font-bold text-slate-900">
                <span>Total</span>
                <span>Rp {grandTotal.toLocaleString()}</span>
              </div>
            </div>
            {/* BUTTON BAYAR MEMBUKA MODAL */}
            <button
              onClick={handleOpenPayment}
              disabled={cart.length === 0}
              className={`w-full py-3 rounded-lg font-bold text-white shadow-lg ${cart.length === 0 ? "bg-slate-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:scale-95 transition-transform"}`}>
              BAYAR
            </button>
          </div>
        </div>
      </div>

      {/* --- MODAL PILIH PEMBAYARAN --- */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Pilih Metode Pembayaran</h2>
              <p className="text-slate-500 text-sm">
                Total Tagihan: <span className="font-bold text-slate-900">Rp {grandTotal.toLocaleString()}</span>
              </p>
            </div>

            <div className="p-6 grid grid-cols-2 gap-3">
              {paymentMethods.map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => setSelectedPaymentMethod(pm.name)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${selectedPaymentMethod === pm.name ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 hover:border-blue-300 text-slate-700"}`}>
                  <div className="font-bold">{pm.name}</div>
                </button>
              ))}
              {paymentMethods.length === 0 && <p className="col-span-2 text-center text-red-500">Belum ada metode pembayaran diset.</p>}
            </div>

            <div className="p-6 bg-slate-50 flex gap-3 justify-end">
              <button onClick={() => setShowPaymentModal(false)} className="px-6 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-200">
                Batal
              </button>
              <button onClick={handleProcessPayment} disabled={isCheckingOut || !selectedPaymentMethod} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50">
                {isCheckingOut ? "Memproses..." : "Proses Bayar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL SUKSES --- */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Pembayaran Sukses!</h2>

            {/* PERBAIKAN: Ditambahkan text-slate-800 agar terlihat */}
            <div className="bg-slate-50 p-3 rounded mb-6 text-sm text-slate-800">
              <p className="flex justify-between">
                <span>Metode:</span> <span className="font-bold">{lastTransaction?.paymentMethod}</span>
              </p>
              <p className="flex justify-between">
                <span>Total:</span> <span className="font-bold">Rp {lastTransaction?.total.toLocaleString()}</span>
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowSuccessModal(false)} className="flex-1 py-2 border rounded-lg text-slate-600 hover:bg-slate-50">
                Tutup
              </button>
              <button onClick={handlePrint} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Cetak Struk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- STRUK CETAK --- */}
      <div id="printable-receipt" className="hidden">
        {lastTransaction && (
          <div className="p-2 font-mono text-xs leading-tight w-[58mm] mx-auto text-black bg-white">
            <div className="text-center mb-4 border-b border-black pb-2 border-dashed">
              <h2 className="text-base font-bold uppercase">{settings.name}</h2>
              <p className="text-[10px]">{settings.receipt_address}</p>
            </div>
            <div className="mb-4">
              <p>No: {lastTransaction.id.slice(0, 8)}</p>
              <p>Tgl: {lastTransaction.date}</p>
              <p>Kasir: {lastTransaction.cashierName}</p>
            </div>
            <div className="mb-2 border-b border-black pb-2 border-dashed">
              {lastTransaction.items.map((item, idx) => (
                <div key={idx} className="flex justify-between mb-1">
                  <div>
                    <div>{item.name}</div>
                    <div className="text-[10px] text-slate-600">
                      {item.qty} x {item.price.toLocaleString()}
                    </div>
                  </div>
                  <div className="font-bold">{(item.qty * item.price).toLocaleString()}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span>Subtotal</span>
              <span>{lastTransaction.subTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs mb-2 border-b border-black pb-2 border-dashed">
              <span>Pajak ({settings.tax_rate}%)</span>
              <span>{lastTransaction.tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-sm mb-4">
              <span>TOTAL</span>
              <span>Rp {lastTransaction.total.toLocaleString()}</span>
            </div>

            {/* INFO METODE BAYAR DI STRUK */}
            <div className="flex justify-between text-xs mb-1">
              <span>Bayar ({lastTransaction.paymentMethod})</span>
              <span>Rp {lastTransaction.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs mb-6">
              <span>Kembali</span>
              <span>Rp 0</span>
            </div>

            <div className="text-center mt-4 border-t border-black pt-2 border-dashed">
              <p>** TERIMA KASIH **</p>
              <p className="text-[10px] mt-1">{settings.receipt_footer}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
