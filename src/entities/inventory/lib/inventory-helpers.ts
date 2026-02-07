import type { ShopItemId } from '@/shared/config';
import type { Inventory } from '../model/inventory.model';

export const normalizeOwnedItemIds = (ids: unknown): ShopItemId[] => {
  if (!Array.isArray(ids)) {
    return [];
  }
  const unique = new Set<ShopItemId>();
  for (const entry of ids) {
    if (typeof entry === 'string' && entry.trim().length > 0) {
      unique.add(entry as ShopItemId);
    }
  }
  return Array.from(unique);
};

export const ownsItem = (inventory: Inventory, itemId: ShopItemId): boolean => {
  return inventory.ownedItemIds.includes(itemId);
};

export const addItem = (inventory: Inventory, itemId: ShopItemId): Inventory => {
  if (inventory.ownedItemIds.includes(itemId)) {
    return inventory;
  }
  return {
    ...inventory,
    ownedItemIds: [...inventory.ownedItemIds, itemId],
  };
};

export const removeItem = (inventory: Inventory, itemId: ShopItemId): Inventory => {
  if (!inventory.ownedItemIds.includes(itemId)) {
    return inventory;
  }
  return {
    ...inventory,
    ownedItemIds: inventory.ownedItemIds.filter((id) => id !== itemId),
  };
};
