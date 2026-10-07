import { balance, cafeLevels, warehouseLevels, staffBalance } from './config.js';
import { phase4Balance } from './phase4Config.js';
// CLASS_MATCH references the approved data without changing any values.
export const classMatchBalance = { cafes: cafeLevels, warehouses: warehouseLevels, staff: staffBalance, menuMultipliers: balance.menuMultipliers, menuUpgradeMultipliers: balance.menuUpgradeCostMultipliers, special: phase4Balance, initial: { cafeLevel: 1, money: 0, warehouseLevel: 1 } };
// Independent v1 growth costs. Shared capacity, art, menus and service mechanics.
const growthExpansion = [0, 7000, 35000, 120000, 350000, 1000000];
export const cafeGrowthBalance = { cafes: cafeLevels.map((c, i) => ({ ...structuredClone(c), expansionCost: growthExpansion[i] })), warehouses: warehouseLevels.map(w => ({ ...w, cost: w.cost * 2 })), staff: { ...structuredClone(staffBalance), hireCosts: staffBalance.hireCosts.map(n => n * 2), upgradeCosts: staffBalance.upgradeCosts.map(n => n * 2) }, menuMultipliers: [...balance.menuMultipliers], menuUpgradeMultipliers: balance.menuUpgradeCostMultipliers.map(n => n * 2), special: { ...structuredClone(phase4Balance), itemPriceMultipliers: [1, 2, 4, 7, 11, 16] }, initial: { cafeLevel: 1, money: 0, warehouseLevel: 1 } };
