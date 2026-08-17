// categories.ts
// Default product categories shown in the Price Catalog's Add/Edit Product
// form, seeded so a fresh catalog isn't just an empty picker. Users can
// still type their own via ProductModal's "+ Add new category" option -
// once used on any item, a custom category is folded into this list
// automatically (see mergeCategories() below). No separate category
// management screen is needed since `category` is just a free-text field
// on Item, both on the frontend and in the backend's Item entity.

export const DEFAULT_CATEGORIES: string[] = [
  'Fruits',
  'Vegetables',
  'Refrigerated/Frozen Goods',
  'Condiments/Sauces',
  'Spices',
  'Canned Goods',
  'Noodles',
  'Dairy',
  'Meat',
  'Seafood',
  'Drinks',
  'Snacks',
  'Pets',
  'Personal Care',
  'Medicine',
  'Cleaning',
  'Office/School Supplies',
];

/** Catch-all bucket - always kept last, rather than sorted alphabetically into the middle of the list. */
export const OTHER_CATEGORY = 'Others';

/**
 * Combines the default category list with any custom categories already in
 * use (typed via ProductModal's "+ Add new category" option on some
 * earlier product), so once a custom category exists it shows up as a
 * normal pickable option everywhere categories are listed - not just on
 * the specific item that first introduced it.
 */
export function mergeCategories(usedCategories: string[]): string[] {
  const customOnes = Array.from(new Set(usedCategories))
    .filter((c) => c && c !== OTHER_CATEGORY && !DEFAULT_CATEGORIES.includes(c))
    .sort((a, b) => a.localeCompare(b));
  return [...DEFAULT_CATEGORIES, ...customOnes, OTHER_CATEGORY];
}
