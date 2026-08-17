import { apiRequest, withMockFallback } from './httpClient';
import { mockCartRows } from '../data/mockCartData';
import { dbCompleteCheckout } from '../data/mockDb';
import { CartRow } from '../types';

// Raw shape returned by the backend: numeric fields arrive as
// numbers-or-strings depending on how the JSON library serializes
// BigDecimal, so we normalize with Number() below.
interface CartRowResponse {
  id: string;
  itemId: string;
  itemName: string;
  category: string;
  /** e.g. "kg", "pack", "pc" - feeds Feature 1's Pricing Format rule. */
  unit: string | null;
  storeId: string;
  storeName: string;
  price: number | string;
  quantity: number | string;
  sourceRecipeId: string | null;
  sourceRecipeName: string | null;
  overridePantryQty: number | string;
  overrideReason: string | null;
  isCheckedCheckout: boolean;
}

/** GET /api/users/{userId}/cart */
export async function fetchCart(userId: number): Promise<CartRow[]> {
  return withMockFallback(async () => {
    const rows = await apiRequest<CartRowResponse[]>(`/api/users/${userId}/cart`);
    return rows.map((row) => ({
      ...row,
      price: Number(row.price),
      quantity: Number(row.quantity),
      overridePantryQty: Number(row.overridePantryQty),
    }));
  }, mockCartRows);
}

/** PATCH /api/users/{userId}/cart/adjust - a single +1/-1 tap. */
export async function adjustCartItem(
  userId: number,
  itemId: string,
  storeId: string,
  delta: number
): Promise<void> {
  return withMockFallback(
    () =>
      apiRequest<void>(
        `/api/users/${userId}/cart/adjust`,
        {
          method: 'PATCH',
          body: JSON.stringify({ itemId: Number(itemId), storeId: Number(storeId), delta }),
        },
        /* expectJson */ false
      ),
    undefined // no-op in mock mode - the UI's optimistic update already reflects the change
  );
}

/** PATCH /api/users/{userId}/cart/items/{cartItemId}/pantry-override - the pantry-stock '-' button. */
export async function setPantryOverride(
  userId: number,
  cartItemId: string,
  overridePantryQty: number,
  overrideReason: string | null
): Promise<CartRow> {
  return withMockFallback(
    async () => {
      const row = await apiRequest<CartRowResponse>(
        `/api/users/${userId}/cart/items/${cartItemId}/pantry-override`,
        {
          method: 'PATCH',
          body: JSON.stringify({ overridePantryQty, overrideReason }),
        }
      );
      return { ...row, price: Number(row.price), quantity: Number(row.quantity), overridePantryQty: Number(row.overridePantryQty) };
    },
    () => {
      const existing = mockCartRows.find((r) => r.id === cartItemId) ?? mockCartRows[0];
      return { ...existing, overridePantryQty, overrideReason };
    }
  );
}

/** PATCH /api/users/{userId}/cart/items/{cartItemId}/checkout-status - checkbox during "Start Grocery". */
export async function setCheckoutStatus(
  userId: number,
  cartItemId: string,
  checked: boolean
): Promise<CartRow> {
  return withMockFallback(
    async () => {
      const row = await apiRequest<CartRowResponse>(
        `/api/users/${userId}/cart/items/${cartItemId}/checkout-status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ checked }),
        }
      );
      return { ...row, price: Number(row.price), quantity: Number(row.quantity), overridePantryQty: Number(row.overridePantryQty) };
    },
    () => {
      const existing = mockCartRows.find((r) => r.id === cartItemId) ?? mockCartRows[0];
      return { ...existing, isCheckedCheckout: checked };
    }
  );
}

/** POST /api/users/{userId}/cart/master-reset - clears all checkbox state, ending a grocery trip. */
export async function masterResetCheckout(userId: number): Promise<void> {
  return withMockFallback(
    () =>
      apiRequest<void>(
        `/api/users/${userId}/cart/master-reset`,
        { method: 'POST' },
        /* expectJson */ false
      ),
    undefined
  );
}

/**
 * POST /api/users/{userId}/cart/complete-checkout - called after a "Done
 * Checkout" reconciliation is confirmed. `boughtItems` carries how much of
 * each checked item was ACTUALLY bought (defaults to the full needed
 * amount, but can be less - see ReconciliationModal's "Qty bought"
 * stepper); the backend reduces each row by that amount rather than always
 * zeroing it out, so an unbought remainder stays in the cart.
 */
export async function completeCheckout(
  userId: number,
  storeId: string,
  boughtItems: { itemId: string; quantityBought: number }[]
): Promise<void> {
  return withMockFallback(
    () =>
      apiRequest<void>(
        `/api/users/${userId}/cart/complete-checkout`,
        {
          method: 'POST',
          body: JSON.stringify({
            storeId: Number(storeId),
            boughtItems: boughtItems.map((b) => ({ itemId: Number(b.itemId), quantityBought: b.quantityBought })),
          }),
        },
        /* expectJson */ false
      ),
    () => {
      dbCompleteCheckout(
        storeId,
        boughtItems.map((b) => ({ itemId: b.itemId, quantityBought: b.quantityBought }))
      );
      return undefined;
    }
  );
}
