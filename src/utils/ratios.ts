import type {ChartType} from '../types';

/** Percentage of `part` over `total`; 0 when the total is not positive (avoids NaN / Infinity). */
export const percent = (part: number, total: number): number =>
  total > 0 ? (part / total) * 100 : 0;

export interface EnergyTotals {
  imported: number;
  exported: number;
  solar: number;
  /** Energy charged into the battery(ies) */
  batteryIn: number;
  /** Energy discharged from the battery(ies) */
  batteryOut: number;
}

export interface Slice {
  value: number;
  pct: number;
}

export interface RatioView {
  left: Slice;
  right: Slice;
  center: number;
  /** Values for the two donut arcs */
  chart: [number, number];
  hasData: boolean;
}

/**
 * Splits the energy flows into the values shown by the card.
 *
 * Battery handling: energy that goes into the battery counts as self-consumption (it is not sold),
 * and energy coming out of it counts as self-supplied, not as imported.
 * - solar: the solar energy sold is the grid export (never more than the solar produced);
 *   the rest, including what was stored in the battery, is self-consumed.
 * - consumption: home consumption = imported + solar + battery out - exported - battery in.
 *   The battery is assumed to charge from solar first, then from the grid.
 * Without a battery both formulas reduce to the plain solar / grid ones.
 */
export const computeRatios = (totals: EnergyTotals, chartType: ChartType | undefined): RatioView => {
  const solar = Math.max(0, totals.solar);
  const exported = Math.max(0, totals.exported);
  const imported = Math.max(0, totals.imported);
  const batteryIn = Math.max(0, totals.batteryIn);
  const batteryOut = Math.max(0, totals.batteryOut);

  if (chartType === 'consumption') {
    const solarToBattery = Math.min(batteryIn, solar);
    const gridToBattery = batteryIn - solarToBattery;
    const fromGrid = Math.max(0, imported - gridToBattery);
    const consumption = Math.max(0, imported + solar + batteryOut - exported - batteryIn);
    const fromGridToHome = Math.min(fromGrid, consumption);
    const selfSupplied = consumption - fromGridToHome;

    return {
      left: {value: fromGridToHome, pct: percent(fromGridToHome, consumption)},
      right: {value: selfSupplied, pct: percent(selfSupplied, consumption)},
      center: consumption,
      chart: [selfSupplied, fromGridToHome],
      hasData: consumption > 0,
    };
  }

  const sold = Math.min(exported, solar);
  const selfConsumed = solar - sold;

  return {
    left: {value: selfConsumed, pct: percent(selfConsumed, solar)},
    right: {value: sold, pct: percent(sold, solar)},
    center: solar,
    chart: [sold, selfConsumed],
    hasData: solar > 0,
  };
};
