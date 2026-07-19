import { getItem } from '@/data/items';
import type { InventoryItem, MarketOffer } from '@/types';

interface MarketCatalogEntry {
  itemId: string;
  minRealmLevel: number;
  price: number;
}

const marketCatalog: MarketCatalogEntry[] = [
  { itemId: 'spirit-herb', minRealmLevel: 1, price: 3 },
  { itemId: 'spirit-ore', minRealmLevel: 1, price: 4 },
  { itemId: 'talisman-paper', minRealmLevel: 1, price: 3 },
  { itemId: 'array-stone', minRealmLevel: 1, price: 5 },
  { itemId: 'spirit-seed', minRealmLevel: 1, price: 4 },
  { itemId: 'qi-gathering-pill', minRealmLevel: 1, price: 7 },
  { itemId: 'spirit-bait', minRealmLevel: 1, price: 4 },
  { itemId: 'bone-tempering-pill', minRealmLevel: 2, price: 11 },
  { itemId: 'protection-talisman', minRealmLevel: 2, price: 10 },
  { itemId: 'beast-core', minRealmLevel: 2, price: 7 },
  { itemId: 'ancient-scale', minRealmLevel: 3, price: 16 },
  { itemId: 'war-talisman', minRealmLevel: 3, price: 18 },
  { itemId: 'binding-array-plate', minRealmLevel: 4, price: 26 },
  { itemId: 'mystic-spirit-pill', minRealmLevel: 4, price: 22 },
  { itemId: 'purple-crystal-marrow', minRealmLevel: 4, price: 24 },
  { itemId: 'soul-nourishing-pill', minRealmLevel: 4, price: 20 },
  { itemId: 'thunder-beast-core', minRealmLevel: 5, price: 32 },
  { itemId: 'dragon-blood-pill', minRealmLevel: 5, price: 35 },
  { itemId: 'outer-star-sand', minRealmLevel: 7, price: 58 },
  { itemId: 'tribulation-crystal', minRealmLevel: 7, price: 62 },
  { itemId: 'tribulation-pill', minRealmLevel: 7, price: 70 },
  { itemId: 'xuanhuang-marrow', minRealmLevel: 8, price: 90 }
];

export function createMarketOffers(realmLevel: number, randomize = true): MarketOffer[] {
  const available = marketCatalog.filter(entry => entry.minRealmLevel <= Math.max(1, realmLevel));
  const pool = randomize
    ? [...available].sort(() => Math.random() - 0.5)
    : available;

  return pool.slice(0, 6).map((entry, index) => ({
    id: `market-${entry.itemId}-${Date.now()}-${index}`,
    itemId: entry.itemId,
    price: entry.price,
    quantity: realmLevel >= 7 && entry.minRealmLevel <= 3 ? 2 : 1
  }));
}

export function getMarketRefreshCost(realmLevel: number): number {
  return 5 + Math.max(1, realmLevel) * 2;
}

export function getMarketSellPrice(itemId: string): number {
  const catalogPrice = marketCatalog.find(entry => entry.itemId === itemId)?.price;
  if (catalogPrice) return Math.max(1, Math.floor(catalogPrice * 0.45));

  const item = getItem(itemId);
  return item ? getFallbackSellPrice(item) : 0;
}

function getFallbackSellPrice(item: InventoryItem): number {
  const rarityPrice = {
    凡品: 2,
    下品: 4,
    中品: 8,
    上品: 16,
    变异: 20,
    极品: 32,
    神话: 50,
    传说: 70
  }[item.rarity];
  return item.type === '法器' ? rarityPrice * 2 : rarityPrice;
}

export function isMarketOfferValid(offer: MarketOffer, realmLevel: number): boolean {
  const catalog = marketCatalog.find(entry => entry.itemId === offer.itemId);
  return !!catalog
    && catalog.minRealmLevel <= Math.max(1, realmLevel)
    && Number.isFinite(offer.price)
    && offer.price > 0
    && Number.isFinite(offer.quantity)
    && offer.quantity > 0;
}
