import { addItem, normalizeOwnedItemIds, ownsItem, removeItem } from '@/entities/inventory';
import type { Inventory } from '@/entities/inventory';

const createInventory = (ownedItemIds: string[]): Inventory => ({
  ownedItemIds,
});

describe('inventory helpers', () => {
  it('normalizes owned item ids by removing duplicates', () => {
    const result = normalizeOwnedItemIds(['shop-a', 'shop-b', 'shop-a', '', 3]);

    expect(result).toEqual(['shop-a', 'shop-b']);
  });

  it('checks ownership', () => {
    const inventory = createInventory(['shop-a']);

    expect(ownsItem(inventory, 'shop-a')).toBe(true);
    expect(ownsItem(inventory, 'shop-b')).toBe(false);
  });

  it('adds items without duplicates', () => {
    const inventory = createInventory(['shop-a']);

    const result = addItem(inventory, 'shop-a');
    const updated = addItem(inventory, 'shop-b');

    expect(result).toBe(inventory);
    expect(updated.ownedItemIds).toEqual(['shop-a', 'shop-b']);
  });

  it('removes items when present', () => {
    const inventory = createInventory(['shop-a', 'shop-b']);

    const result = removeItem(inventory, 'shop-a');
    const unchanged = removeItem(inventory, 'shop-c');

    expect(result.ownedItemIds).toEqual(['shop-b']);
    expect(unchanged).toBe(inventory);
  });
});