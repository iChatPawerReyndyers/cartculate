// units.ts
// Common unit examples shown as placeholder hint text on the free-text
// Unit field (Price Catalog's Add/Edit Product modal, the Cart tab's "new
// product" form, and each recipe ingredient row). Not an enforced list -
// unit is now free text, capped at 5 characters, so custom units like
// "sachet" -> "sacht" or store-specific abbreviations aren't locked out.

export const UNIT_OPTIONS: string[] = ['kg', 'g', 'L', 'mL', 'pack', 'pc', 'box', 'bottle', 'can', 'roll'];

export const UNIT_MAX_LENGTH = 5;
