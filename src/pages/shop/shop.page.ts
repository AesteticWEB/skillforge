import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AppStore } from '@/app/store/app.store';
import { SHOP_ITEMS, ShopItem, ShopItemCurrency } from '@/shared/config';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';
import { EmptyStateComponent } from '@/shared/ui/empty-state';

type ShopCategory = 'all' | 'computer' | 'software' | 'office' | 'security' | 'luxury';
type NormalizedRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
type SortKey = 'price-asc' | 'price-desc' | 'rarity' | 'unowned';
type LuxurySortKey = 'price-asc' | 'price-desc';
type ShopTab = 'items' | 'luxury';

type ShopItemView = {
  id: string;
  name: string;
  description: string;
  price: number;
  priceText: string;
  rarity: NormalizedRarity;
  rarityLabel: string;
  category: ShopCategory;
  currency: ShopItemCurrency;
  isOwned: boolean;
  canBuy: boolean;
  hasValidPrice: boolean;
  hint: string | null;
  buttonLabel: string;
};

const CATEGORY_LABELS: Record<ShopCategory, string> = {
  all: 'Все',
  computer: 'Компьютеры',
  software: 'Софт',
  office: 'Офис',
  security: 'Безопасность',
  luxury: 'Люкс',
};

const TAB_LABELS: Record<ShopTab, string> = {
  items: 'Предметы',
  luxury: 'Люкс',
};

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'price-asc', label: 'По цене (возр.)' },
  { value: 'price-desc', label: 'По цене (убыв.)' },
  { value: 'rarity', label: 'По редкости' },
  { value: 'unowned', label: 'Сначала не купленные' },
];

const LUXURY_SORT_OPTIONS: Array<{ value: LuxurySortKey; label: string }> = [
  { value: 'price-asc', label: 'По цене (возр.)' },
  { value: 'price-desc', label: 'По цене (убыв.)' },
];

const RARITY_WEIGHT: Record<NormalizedRarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
};

const RARITY_LABELS: Record<NormalizedRarity, string> = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный',
};

@Component({
  selector: 'app-shop-page',
  imports: [CardComponent, ButtonComponent, EmptyStateComponent, NgClass],
  templateUrl: './shop.page.html',
  styleUrl: './shop.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopPage {
  private readonly store = inject(AppStore);
  private readonly numberFormatter = new Intl.NumberFormat('ru-RU');

  protected readonly coins = this.store.coins;
  protected readonly companyCash = this.store.companyCash;
  protected readonly companyUnlocked = this.store.companyUnlocked;
  protected readonly categories: ShopCategory[] = [
    'all',
    'computer',
    'software',
    'office',
    'security',
  ];
  protected readonly tabs: ShopTab[] = ['items', 'luxury'];
  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly luxurySortOptions = LUXURY_SORT_OPTIONS;
  protected readonly selectedCategory = signal<ShopCategory>('all');
  protected readonly sortKey = signal<SortKey>('price-asc');
  protected readonly luxurySortKey = signal<LuxurySortKey>('price-asc');
  protected readonly activeTab = signal<ShopTab>('items');
  protected readonly ownedIds = computed(() => new Set(this.store.inventory().ownedItemIds));

  protected readonly visibleItems = computed<ShopItemView[]>(() => {
    const category = this.selectedCategory();
    const sortKey = this.sortKey();
    const ownedIds = this.ownedIds();
    const coins = this.coins();
    const cash = this.companyCash();
    const companyUnlocked = this.companyUnlocked();

    const prepared = SHOP_ITEMS.filter((item) => this.normalizeCurrency(item) === 'coins').map(
      (item) => this.buildItemView(item, ownedIds, { coins, cash, companyUnlocked }),
    );
    const filtered =
      category === 'all' ? prepared : prepared.filter((item) => item.category === category);

    const sorted = [...filtered];
    sorted.sort((left, right) => this.compareItems(left, right, sortKey));
    return sorted;
  });

  protected readonly luxuryItems = computed<ShopItemView[]>(() => {
    const sortKey = this.luxurySortKey();
    const ownedIds = this.ownedIds();
    const coins = this.coins();
    const cash = this.companyCash();
    const companyUnlocked = this.companyUnlocked();

    const prepared = SHOP_ITEMS.filter((item) => this.normalizeCurrency(item) === 'cash').map(
      (item) => this.buildItemView(item, ownedIds, { coins, cash, companyUnlocked }),
    );
    const sorted = [...prepared];
    sorted.sort((left, right) => this.compareLuxuryItems(left, right, sortKey));
    return sorted;
  });

  protected categoryLabel(category: ShopCategory): string {
    return CATEGORY_LABELS[category] ?? category;
  }

  protected tabLabel(tab: ShopTab): string {
    return TAB_LABELS[tab] ?? tab;
  }

  protected setCategory(category: ShopCategory): void {
    this.selectedCategory.set(category);
  }

  protected setTab(tab: ShopTab): void {
    this.activeTab.set(tab);
  }

  protected setSort(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    const next = target.value as SortKey;
    if (!SORT_OPTIONS.some((option) => option.value === next)) {
      return;
    }
    this.sortKey.set(next);
  }

  protected setLuxurySort(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    const next = target.value as LuxurySortKey;
    if (!LUXURY_SORT_OPTIONS.some((option) => option.value === next)) {
      return;
    }
    this.luxurySortKey.set(next);
  }

  protected resetFilters(): void {
    this.selectedCategory.set('all');
    this.sortKey.set('price-asc');
  }

  protected buyItem(itemId: string): void {
    this.store.buyItem(itemId);
  }

  protected formatAmount(value: number): string {
    if (!Number.isFinite(value)) {
      return '0';
    }
    return this.numberFormatter.format(Math.max(0, Math.floor(value)));
  }

  private normalizeCurrency(item: ShopItem): ShopItemCurrency {
    return item.currency === 'cash' ? 'cash' : 'coins';
  }

  private normalizeRarity(value: ShopItem['rarity']): NormalizedRarity {
    if (value === 'common' || value === 'uncommon' || value === 'rare' || value === 'epic') {
      return value;
    }
    if (value === 'legendary') {
      return 'legendary';
    }
    return 'common';
  }

  private rarityLabel(value: NormalizedRarity): string {
    return RARITY_LABELS[value] ?? RARITY_LABELS.common;
  }

  private resolveCategory(item: ShopItem): ShopCategory {
    switch (item.category) {
      case 'luxury':
        return 'luxury';
      case 'security':
        return 'security';
      case 'ops':
        return 'computer';
      case 'automation':
      case 'learning':
      case 'quality':
        return 'software';
      case 'productivity':
      case 'health':
      case 'career':
      case 'team':
      case 'networking':
        return 'office';
      default:
        return 'office';
    }
  }

  private buildItemView(
    item: ShopItem,
    ownedIds: Set<string>,
    context: {
      coins: number;
      cash: number;
      companyUnlocked: boolean;
    },
  ): ShopItemView {
    const price = typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : 0;
    const hasValidPrice = price > 0;
    const isOwned = ownedIds.has(item.id);
    const currency = this.normalizeCurrency(item);
    const normalizedRarity = this.normalizeRarity(item.rarity);
    const isLocked = currency === 'cash' && !context.companyUnlocked;
    const canAfford = currency === 'cash' ? context.cash >= price : context.coins >= price;
    const canBuy = hasValidPrice && !isOwned && !isLocked && canAfford;
    const hint = !hasValidPrice
      ? 'Недоступно'
      : isOwned
        ? null
        : isLocked
          ? 'Откроется после Senior и сертификата'
          : !canAfford
            ? currency === 'cash'
              ? 'Не хватает кэша'
              : 'Не хватает монет'
            : null;

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      price,
      priceText: this.formatAmount(price),
      rarity: normalizedRarity,
      rarityLabel: this.rarityLabel(normalizedRarity),
      category: this.resolveCategory(item),
      currency,
      isOwned,
      canBuy,
      hasValidPrice,
      hint,
      buttonLabel: !hasValidPrice ? 'Недоступно' : isOwned ? 'Куплено' : 'Купить',
    };
  }

  private compareItems(left: ShopItemView, right: ShopItemView, sortKey: SortKey): number {
    if (sortKey === 'price-asc') {
      return (
        this.sortablePrice(left) - this.sortablePrice(right) || left.name.localeCompare(right.name)
      );
    }
    if (sortKey === 'price-desc') {
      return (
        this.sortablePrice(right) - this.sortablePrice(left) || left.name.localeCompare(right.name)
      );
    }
    if (sortKey === 'rarity') {
      return (
        RARITY_WEIGHT[right.rarity] - RARITY_WEIGHT[left.rarity] ||
        this.sortablePrice(left) - this.sortablePrice(right) ||
        left.name.localeCompare(right.name)
      );
    }
    return (
      Number(left.isOwned) - Number(right.isOwned) ||
      this.sortablePrice(left) - this.sortablePrice(right) ||
      left.name.localeCompare(right.name)
    );
  }

  private compareLuxuryItems(
    left: ShopItemView,
    right: ShopItemView,
    sortKey: LuxurySortKey,
  ): number {
    if (sortKey === 'price-desc') {
      return (
        this.sortablePrice(right) - this.sortablePrice(left) || left.name.localeCompare(right.name)
      );
    }
    return (
      this.sortablePrice(left) - this.sortablePrice(right) || left.name.localeCompare(right.name)
    );
  }

  private sortablePrice(item: ShopItemView): number {
    return item.price > 0 ? item.price : Number.MAX_SAFE_INTEGER;
  }
}
