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


// TODO Add your configuration elements here for type-checking
export interface EnergyRatioDonutConfig extends LovelaceCardConfig {
  type: string;
  name?: string;
  show_warning?: boolean;
  show_error?: boolean;
  test_gui?: boolean;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  view_layout?: never;
  collection_key?: string;
  grid_options?: LovelaceGridOptions;
  chart_type?: string;
  show_date?: boolean;
}
