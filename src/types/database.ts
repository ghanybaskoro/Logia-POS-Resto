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

// TAMBAHAN BARU DI BAWAH INI:
export type Category = {
  id: string;
  name: string;
};

// ... type Ingredient dan Category tetap sama ...

// Tambahkan Type Baru untuk Resep yang memuat Info Bahan
export type RecipeWithIngredient = {
  quantity_needed: number;
  ingredient: {
    name: string;
    current_stock: number;
    uom: string;
  };
};

// Update MenuItem agar menyertakan resep
export type MenuItem = {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  price: number;
  is_active: boolean;
  image_url: string | null;
  category?: { name: string }; // Join Category
  recipes?: RecipeWithIngredient[]; // Join Recipes -> Ingredients
};

// ... (kode sebelumnya)

// TAMBAHAN BARU:
export type Recipe = {
  id: string;
  menu_item_id: string;
  ingredient_id: string;
  quantity_needed: number;
  // Untuk join (tampilan):
  ingredient?: Ingredient;
};

// Tambahkan di src/types/database.ts

export type PosSession = {
  id: string;
  restaurant_id: string;
  cashier_id: string;
  start_time: string;
  end_time: string | null;
  starting_cash: number;
  ending_cash: number;
  total_cash_sales: number;
  total_non_cash_sales: number;
  status: 'open' | 'closed';
  note: string | null;
};