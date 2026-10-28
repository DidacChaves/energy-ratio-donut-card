/* eslint-disable @typescript-eslint/no-explicit-any */
import {CSSResultGroup, html, LitElement, PropertyValues, TemplateResult} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {
  ActionHandlerEvent,
  handleAction,
  hasAction,
  HomeAssistant,
  LovelaceCardEditor,
  LovelaceCard
} from 'custom-card-helpers';
import type {EnergyRatioDonutConfig} from './types';
import {actionHandler} from './action-handler-directive';
import {localize} from './localize/localize';
import {ArcElement, Chart, DoughnutController} from 'chart.js';
import {getEnergyDataCollection, EnergyData, EnergyCollection} from './utils/energy';
import {round} from './utils/utils';
import {computeRatios} from './utils/ratios';
import {CARD_VERSION} from "./const";
import styles from './styles/energy-ratio-donut-card.css'

Chart.register(DoughnutController, ArcElement);

/* eslint no-console: 0 */
console.info(
  `%c ENERGY-RATIO-DONUT-CARD %c ${CARD_VERSION} `,
  'color: white; font-weight: 800; background: #19ab6d',
  'color: #19ab6d; font-weight: 800; background: white',
);

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'energy-ratio-donut-card',
  name: 'Energy Ratio Donut',
  description: 'Interactive donut chart showing energy distribution between solar/grid sources. Displays self-consumption ratios or import/export patterns with configurable colors and real-time kWh data from Home Assistant energy dashboard.',
  preview: true
});

const COLLECTION_RETRIES = 5;
const COLLECTION_RETRY_MS = 150;

const SOLAR_COLORS = ['#19ab6d', '#91de41'];
// For 'consumption', dark orange is self-consumption, light orange is imported
const CONSUMPTION_COLORS = ['#ff9800', '#ff5722'];

@customElement('energy-ratio-donut-card')
export class EnergyRatioDonutCard extends LitElement implements LovelaceCard {
  private _energyCollection?: EnergyCollection | null;
  private _unsubscribe?: () => void;
  private _retryTimer?: number;
  private chartInstance: Chart | null = null;

  @property({attribute: false}) public hass!: HomeAssistant;
  @state() private _config!: EnergyRatioDonutConfig;
  @state() private _globalPeriod: { start: Date; end: Date } | null = null;
  @state() private _energyData = {
    imported: 0,
    exported: 0,
    solar: 0,
    batteryIn: 0,
    batteryOut: 0,
    unit: 'kWh'
  };
  @state() private _dataLoaded = false;
  @state() private _showErrorState = false;
  @state() private _errorMessage = '';

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editor');
    return document.createElement('energy-ratio-donut-editor');
  }

  public static getStubConfig(): Record<string, unknown> {
    return {chart_type: 'solar'};
  }

  public setConfig(config: EnergyRatioDonutConfig): void {
    if (!config) {
      throw new Error(localize('COMMON.INVALID_CONFIGURATION', this.hass?.language));
    }

    const previousKey = this._config?.collection_key;
    this._config = {
      ...config,
      collection_key: config.collection_key || 'energy',
    };

    // The editor sends a new config on every change: only resubscribe if the collection changed
    if (this.isConnected && previousKey !== this._config.collection_key) {
      this._trySubscribe();
    }
  }

  public async getCardSize(): Promise<number> {
    return 2;
  }

  public getGridOptions(): any {
    return {
      columns: 12,
      rows: 'auto',
      min_columns: 12,
      min_rows: 3,
    };
  }

  private get _isConsumption(): boolean {
    return this._config?.chart_type === 'consumption';
  }

  private get _chartColors(): string[] {
    return this._isConsumption ? CONSUMPTION_COLORS : SOLAR_COLORS;
  }

  private get _title(): string {
    return this._config.name
      || localize(this._isConsumption ? 'CARD.CONSUMPTION_TITLE' : 'CARD.ENERGY_PRODUCTION_TITLE', this.hass?.language);
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._trySubscribe();
  }

  disconnectedCallback(): void {
    this._clearRetry();
    this._unsubscribeCollection();
    this.chartInstance?.destroy();
    this.chartInstance = null;
    super.disconnectedCallback();
  }

  private _clearRetry(): void {
    if (this._retryTimer !== undefined) {
      window.clearTimeout(this._retryTimer);
      this._retryTimer = undefined;
    }
  }

  private _unsubscribeCollection(): void {
    this._unsubscribe?.();
    this._unsubscribe = undefined;
    this._energyCollection = null;
  }

  /**
   * HA creates the energy collection when an `energy-date-selection` card (or the energy panel) is loaded,
   * so it may not exist yet: retry a few times before showing the error.
   */
  private _trySubscribe(attempt = 0): void {
    this._clearRetry();
    if (!this.isConnected || !this._config) return;

    const collection = this.hass
      ? getEnergyDataCollection(this.hass, '_' + this._config.collection_key)
      : null;

    if (!collection) {
      if (attempt < COLLECTION_RETRIES) {
        this._retryTimer = window.setTimeout(() => this._trySubscribe(attempt + 1), COLLECTION_RETRY_MS);
      } else {
        this._showErrorState = true;
        this._errorMessage = localize('ERROR.NO_ENERGY_DATA', this.hass?.language);
      }
      return;
    }

    this._showErrorState = false;
    if (collection === this._energyCollection && this._unsubscribe) return;

    this._unsubscribeCollection();
    this._energyCollection = collection;
    this._unsubscribe = collection.subscribe((energyData: EnergyData) => {
      this._globalPeriod = {
        start: energyData.start,
        end: energyData.end || new Date(),
      };
      this._updateEnergyDataFromCollection(energyData);
    });
  }

  private _updateEnergyDataFromCollection(energyData: EnergyData): void {
    if (!energyData.prefs) return;

    try {
      // Sets avoid counting the same statistic twice if a source is declared in both formats
      const importedIds = new Set<string>();
      const exportedIds = new Set<string>();
      const solarIds = new Set<string>();
      const batteryInIds = new Set<string>();
      const batteryOutIds = new Set<string>();

      for (const source of energyData.prefs.energy_sources) {
        if (source.type === 'grid') {
          // Current format: flow_from / flow_to arrays
          for (const flow of (source as any).flow_from ?? []) {
            if (flow.stat_energy_from) importedIds.add(flow.stat_energy_from);
          }
          for (const flow of (source as any).flow_to ?? []) {
            if (flow.stat_energy_to) exportedIds.add(flow.stat_energy_to);
          }
          // Legacy format: fields directly on the source
          if ((source as any).stat_energy_from) importedIds.add((source as any).stat_energy_from);
          if ((source as any).stat_energy_to) exportedIds.add((source as any).stat_energy_to);
        }
        if (source.type === 'solar' && source.stat_energy_from) {
          solarIds.add(source.stat_energy_from);
        }
        if (source.type === 'battery') {
          if (source.stat_energy_to) batteryInIds.add(source.stat_energy_to);
          if (source.stat_energy_from) batteryOutIds.add(source.stat_energy_from);
        }
      }

      const calculateSum = (ids: Set<string>): number => {
        let total = 0;
        for (const id of ids) {
          for (const stat of energyData.stats[id] ?? []) {
            if (stat.change !== null && stat.change !== undefined) total += stat.change;
          }
        }
        return round(total);
      };

      this._energyData = {
        imported: calculateSum(importedIds),
        exported: calculateSum(exportedIds),
        solar: calculateSum(solarIds),
        batteryIn: calculateSum(batteryInIds),
        batteryOut: calculateSum(batteryOutIds),
        unit: 'kWh'
      };
      this._dataLoaded = true;
    } catch (err) {
      console.error("Error updating energy data from collection:", err);
    }
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    // hass changes with every state update in HA; only the first one matters here
    if (changedProps.size === 1 && changedProps.has('hass')) {
      return changedProps.get('hass') === undefined;
    }
    return true;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    // Retry once per hass update after an error, in case the collection has appeared since
    if (this._showErrorState && changedProps.has('hass')) {
      this._trySubscribe(COLLECTION_RETRIES);
    }
  }

  private _formatDate(date: Date): string {
    return date.toLocaleDateString(navigator.language, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  /** Values shown by the card, always non-negative and with safe percentages. */
  private _computeView() {
    const view = computeRatios(this._energyData, this._config?.chart_type);
    return this._isConsumption
      ? {...view, leftLabel: 'CARD.IMPORTED', rightLabel: 'CARD.SOLAR_CONSUMPTION'}
      : {...view, leftLabel: 'CARD.AUTOCONSUMPTION', rightLabel: 'CARD.EXPORTED'};
  }

  private _renderChart() {
    const canvas = this.shadowRoot?.getElementById('myChart') as HTMLCanvasElement | null;

    // The canvas disappears while the error card is shown and is new when it comes back
    if (this.chartInstance && this.chartInstance.canvas !== canvas) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
    if (!this._dataLoaded || !canvas) {
      return;
    }

    const data = this._computeView().chart;

    if (this.chartInstance) {
      const dataset = this.chartInstance.data.datasets[0];
      dataset.data = data;
      dataset.backgroundColor = this._chartColors;
      dataset.hoverBackgroundColor = this._chartColors;
      this.chartInstance.update();
      return;
    }

    this.chartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        datasets: [{
          borderColor: 'transparent',
          offset: 2,
          hoverOffset: 2,
          borderAlign: 'center',
          borderRadius: 999,
          data: data,
          backgroundColor: this._chartColors,
          hoverBackgroundColor: this._chartColors,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {display: false},
          tooltip: {animation: false, enabled: false}
        },
        cutout: '85%',
      },
    });
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    if (
      changedProperties.has('_energyData') ||
      changedProperties.has('_dataLoaded') ||
      changedProperties.has('_config') ||
      changedProperties.has('_showErrorState')
    ) {
      this._renderChart();
    }
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }

    if (this._showErrorState) {
      return this._showError(this._errorMessage);
    }

    const lang = this.hass.language;
    const view = this._computeView();
    const unit = this._energyData.unit;

    return html`
        <ha-card
                @action=${this._handleAction}
                .actionHandler=${actionHandler({
                    hasHold: hasAction(this._config.hold_action),
                    hasDoubleClick: hasAction(this._config.double_tap_action),
                })}
                tabindex="0">
            <div class="header">
                <div class="name" title="${this._title}">${this._title}</div>
                ${this._globalPeriod && this._config.show_date ? html`
                    <div class="period-info">
                        ${this._formatDate(this._globalPeriod.start)} - ${this._formatDate(this._globalPeriod.end)}
                    </div>
                ` : ''}
            </div>
            <div class="content">
                <div class="background">
                    <div class="left-column">
                        <div class="serie serie-one" style="color: ${this._chartColors[1]}">
                            ${view.left.value.toFixed(2)}
                            <span>${unit}</span>
                        </div>
                        <div class="serie-label">
                            ${localize(view.leftLabel, lang)}<br/>
                            (${view.left.pct.toFixed(2)}%)
                        </div>
                    </div>
                    <div class="center-column">
                        <div id="chart-container" class="chart-container">
                            <canvas id="myChart"></canvas>
                            <div class="serie serie-center ${view.hasData ? '' : 'no-data'}">
                                ${view.center.toFixed(2)}
                                <span>${unit}</span>
                            </div>
                        </div>
                    </div>
                    <div class="right-column">
                        <div class="serie serie-two" style="color: ${this._chartColors[0]}">
                            ${view.right.value.toFixed(2)}
                            <span>${unit}</span>
                        </div>
                        <div class="serie-label">
                            ${localize(view.rightLabel, lang)}<br/>
                            (${view.right.pct.toFixed(2)}%)
                        </div>
                    </div>
                </div>
            </div>
        </ha-card>
    `;
  }

  private _showError(error: string): TemplateResult {
    const errorCard = document.createElement('hui-error-card');
    errorCard.setConfig({
      type: 'error',
      error,
      origConfig: this._config,
    });

    return html` ${errorCard} `;
  }

  private _handleAction(ev: ActionHandlerEvent): void {
    if (this.hass && this._config && ev.detail.action) {
      handleAction(this, this.hass, this._config, ev.detail.action);
    }
  }

  // https://lit.dev/docs/components/styles/
  static get styles(): CSSResultGroup {
    return styles;
  }
}
