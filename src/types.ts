import { ActionConfig, LovelaceCard, LovelaceCardConfig, LovelaceCardEditor } from 'custom-card-helpers';

declare global {
  interface HTMLElementTagNameMap {
    'energy-ratio-donut-editor': LovelaceCardEditor;
    'hui-error-card': LovelaceCard;
  }
}

export interface LovelaceGridOptions {
  columns?: number | "full";
  rows?: number | "auto";
  max_columns?: number;
  min_columns?: number;
  min_rows?: number;
  max_rows?: number;
}

export type ChartType = 'solar' | 'consumption';

export interface EnergyRatioDonutConfig extends LovelaceCardConfig {
  type: string;
  name?: string;
  collection_key?: string;
  chart_type?: ChartType;
  show_date?: boolean;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  grid_options?: LovelaceGridOptions;
}
