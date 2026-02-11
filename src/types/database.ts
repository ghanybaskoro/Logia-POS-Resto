export type Category = {
  id: string;
  created_at: string;
  name: string;
  restaurant_id: string;
};

export type Ingredient = {
  id: string;
  restaurant_id: string;
  name: string;
  sku: string | null;
  uom: string;
  current_stock: number;
  minimum_stock_alert: number;
  cost_per_unit: number | null;
  odoo_product_id: number | null;
};

export type RecipeWithIngredient = {
  id: string; // Tambahkan id jika perlu
  ingredient_id: string;
  quantity_needed: number;
  ingredient: {
    name: string;
    current_stock: number;
    uom: string;
  };
};

// --- INI DEFINISI MENUITEM YANG BENAR (HANYA SATU) ---
export type MenuItem = {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  price: number;
  is_active: boolean;
  image_url: string | null;
  
  // Kolom baru untuk Resep
  cooking_instructions?: string | null;
  recipe_notes?: string | null;

  // Relasi (Joins)
  category?: { name: string }; 
  recipes?: RecipeWithIngredient[]; 
};

export type Recipe = {
  id: string;
  menu_item_id: string;
  ingredient_id: string;
  quantity_needed: number;
  ingredient?: Ingredient;
};

export type PosSession = {
  id: string;
  restaurant_id: string;
  cashier_id: string | null;
  start_time: string;
  end_time: string | null;
  starting_cash: number;
  ending_cash: number;
  total_cash_sales: number;
  total_non_cash_sales: number;
  status: string; // Bisa 'open' | 'closed'
  note?: string | null;
  
  // Tambahan untuk Laporan (agar tidak error jika dipanggil)
  cashier?: {
    full_name: string;
  } | null;
};