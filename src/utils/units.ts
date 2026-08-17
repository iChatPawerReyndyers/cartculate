// units.ts
// Shared unit options for product forms (Price Catalog's Add/Edit Product
// modal, and the Cart tab's "new product" form). Unit is now a required
// field picked from this dropdown rather than free text, so values stay
// consistent across the catalog instead of accumulating near-duplicates
// like "kg" / "Kg" / "kilogram".

export const UNIT_OPTIONS: string[] = ['kg', 'g', 'L', 'mL', 'pack', 'pc', 'box', 'bottle', 'can', 'roll'];
