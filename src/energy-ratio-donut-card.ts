/* eslint-disable @typescript-eslint/no-explicit-any */
import {CSSResultGroup, html, LitElement, PropertyValues, TemplateResult} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {
  ActionHandlerEvent,
  getLovelace,
  handleAction,
  hasAction,
  HomeAssistant,
  LovelaceCardEditor,
  LovelaceCard
} from 'custom-card-helpers';
import type {EnergyRatioDonutConfig} from './types';
import {actionHandler} from './action-handler-directive';
import {localize} from './localize/localize';
import Chart from 'chart.js/auto';
import {getEnergyDataCollection, EnergyData, EnergyCollection} from './utils/energy';
import {CARD_VERSION} from "./const";
import styles from './styles/energy-ratio-donut-card.css'

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

@customElement('energy-ratio-donut-card')
export class EnergyRatioDonutCard extends LitElement implements LovelaceCard {
  private _energyCollection?: EnergyCollection | null;

  @property({attribute: false}) public hass!: HomeAssistant;
  @state() private _config!: EnergyRatioDonutConfig;
  @state() private _globalPeriod: { start: Date; end: Date } | null = null;
  @state() private _energyData = {
    imported: 0,
    exported: 0,
    solar: 0,
    unit: 'kWh'
  };
  @state() private _chartColors = ['#19ab6d', '#91de41'];
  @state() private _dataLoaded = false;
  @state() private _showErrorState = false;
  @state() private _errorMessage = '';

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editor');
    return document.createElement('energy-ratio-donut-editor');
  }

  public static getStubConfig(): Record<string, unknown> {
    return {};
  }

  public setConfig(config: EnergyRatioDonutConfig): void {
    if (!config) {
      throw new Error(localize('common.invalid_configuration'));
    }
    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }

    this._energyData = {imported: 0, exported: 0, solar: 0, unit: 'kWh'};
    this._chartColors = config.chart_type !== 'consumption'
      ? ['#19ab6d', '#91de41']
      : ['#ff9800', '#ff5722'];

    this._config = {
      name: config.chart_type !== 'consumption' ? localize('CARD.ENERGY_PRODUCTION_TITLE'): localize('CARD.CONSUMPTION_TITLE'),
      collection_key: config.collection_key ? config.collection_key : 'energy',
      ...config,
    };
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

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('resize', this.resizeChartContainer);

    const initEnergyCollection = (attempts = 0) => {
      if (!this.hass) {
        if (attempts < 5) {
          setTimeout(() => initEnergyCollection(attempts + 1), 100);
        } else {
          this._showErrorState = true;
          this._errorMessage = localize('ERROR.NO_ENERGY_DATA');
          this.requestUpdate();
        }
        return;
      }

      if (!this._energyCollection) {
        this._energyCollection = getEnergyDataCollection(this.hass, '_' + this._config.collection_key);
      }

      if (!this._energyCollection) {
        if (attempts < 5) {
          setTimeout(() => initEnergyCollection(attempts + 1), 150);
        } else {
          this._showErrorState = true;
          this._errorMessage = localize('ERROR.NO_ENERGY_DATA');
          this.requestUpdate();
        }
        return;
      }
      this._energyCollection.subscribe((energyData: EnergyData) => {
        this._globalPeriod = {
          start: energyData.start,
          end: energyData.end || new Date(),
        };
        this._updateEnergyDataFromCollection(energyData);
      });
    };
    initEnergyCollection();
  }

  disconnectedCallback(): void {
    window.removeEventListener('resize', this.resizeChartContainer);
    super.disconnectedCallback();
  }

  private async _updateEnergyDataFromCollection(energyData: EnergyData) {
    if (!energyData.prefs) return;

    try {
      const statIds = {
        imported: energyData.prefs.energy_sources
          .filter((s: any) => s.type === 'grid')
          .flatMap((s: any) => s.flow_from?.map((f: any) => f.stat_energy_from) || []),
        exported: energyData.prefs.energy_sources
          .filter((s: any) => s.type === 'grid')
          .flatMap((s: any) => s.flow_to?.map((f: any) => f.stat_energy_to) || []),
        solar: energyData.prefs.energy_sources
          .filter((s: any) => s.type === 'solar')
          .map((s: any) => s.stat_energy_from)
      };

      const calculateSum = (ids: string[]) => {
        return ids.reduce((sum, id) => {
          const changes = energyData.stats[id]?.map((s: any) => s.change).filter((v: any) => v !== null);
          return sum + (changes?.reduce((a: number, b: number) => a + b, 0) || 0);
        }, 0);
      };

      this._energyData = {
        imported: Math.round(calculateSum(statIds.imported) * 100) / 100,
        exported: Math.round(calculateSum(statIds.exported) * 100) / 100,
        solar: Math.round(calculateSum(statIds.solar) * 100) / 100,
        unit: 'kWh'
      };

      this._dataLoaded = true;
      this.requestUpdate();

    } catch (err) {
      console.error("Error updating energy data from collection:", err);
    }
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return changedProps.has('hass') ||
      changedProps.has('_config') ||
      changedProps.has('_energyData') ||
      changedProps.has('_globalPeriod');
  }

  private _formatDate(date: Date): string {
    return date.toLocaleDateString(navigator.language, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  private resizeChartContainer = () => {
    requestAnimationFrame(() => {
      const chartContainer = this.shadowRoot?.getElementById('chart-container');
      if (chartContainer) {
        setTimeout(() => {
          const width = chartContainer.offsetWidth;
          chartContainer.style.height = `${width}px`;
        }, 500);
      }
    });
  };

  private chartInstance: Chart | null = null;

  private _renderChart() {
    if (!this._dataLoaded || !this._energyData || !this.shadowRoot) {
      return;
    }
    if (!this.shadowRoot) {
      return;
    }
    const ctx = this.shadowRoot.getElementById('myChart') as HTMLCanvasElement;
    if (!ctx) {
      return;
    }

    let data: number[];
    if (this._config.chart_type !== 'consumption') {
      data = [
        this._energyData.exported,
        this._energyData.solar - this._energyData.exported
      ];
    } else {
      data = [
        this._energyData.imported,
        this._energyData.solar - this._energyData.exported
      ];
    }

    if (this.chartInstance) {
      this.chartInstance.data.datasets[0].data = data;
      this.chartInstance.data.datasets[0].backgroundColor = this._chartColors;
      this.chartInstance.data.datasets[0].hoverBackgroundColor = this._chartColors;
      this.chartInstance.update();
      return;
    }

    this.chartInstance = new Chart(ctx, {
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

    if (changedProperties.has('_energyData') || changedProperties.has('_dataLoaded')) {
      this._renderChart();
      this.resizeChartContainer();
    }
  }

  protected render(): TemplateResult | void {

    if (!this._config || !this.hass) {
      return html``;
    }

    if (this._showErrorState) {
      return this._showError(this._errorMessage);
    }

    const consumoTotal = (this._energyData.solar - this._energyData.exported) + this._energyData.imported;
    return html`
        <ha-card
                @action=${this._handleAction}
                .actionHandler=${actionHandler({
                    hasHold: hasAction(this._config.hold_action),
                    hasDoubleClick: hasAction(this._config.double_tap_action),
                })}
                tabindex="0">
            <div class="header">
                <div class="name" title="${this._config.name}">${this._config.name}</div>
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
                            ${(this._energyData.solar - this._energyData.exported).toFixed(2)}
                            <span>${this._energyData.unit}</span>
                        </div>
                        <div class="serie-label">
                            ${this._config.chart_type !== 'consumption' ? localize('CARD.AUTOCONSUMPTION') : localize('CARD.SOLAR_CONSUMPTION')}<br/>

                                (${this._config.chart_type !== 'consumption' ?
                                    (this._energyData.solar > 0 ? (((this._energyData.solar - this._energyData.exported) / this._energyData.solar) * 100).toFixed(2)
                                            : '0.00') :
                                    (isNaN((this._energyData.imported / consumoTotal) * 100)?0:(this._energyData.imported / consumoTotal) * 100).toFixed(2)
                            }%)
                        </div>
                    </div>
                    <div class="center-column">
                        <div id="chart-container" class="chart-container">
                            <canvas id="myChart"></canvas>
                            <div class="serie serie-center ${this._energyData.solar === 0 ? ' no-data' : ''}">
                                ${this._config.chart_type !== 'consumption' ?
                                        (this._energyData.solar).toFixed(2) :
                                        ((this._energyData.solar - this._energyData.exported) + this._energyData.imported).toFixed(2)
                                }
                                <span>${(this._energyData.unit)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="right-column">
                        <div class="serie serie-two" style="color: ${this._chartColors[0]}">
                            ${this._config.chart_type !== 'consumption' ?
                                    this._energyData.exported.toFixed(2) :
                                    this._energyData.imported.toFixed(2)}
                            <span>${this._energyData.unit}</span>
                        </div>
                        <div class="serie-label">
                            ${this._config.chart_type !== 'consumption' ? localize('CARD.EXPORTED') : localize('CARD.IMPORTED')}<br/>
                                (${this._config.chart_type !== 'consumption' ?
                                    (isNaN(this._energyData.exported / this._energyData.solar * 100) ?0: this._energyData.exported / this._energyData.solar * 100).toFixed(2) :
                                    (isNaN(((this._energyData.solar - this._energyData.exported) / consumoTotal) * 100)?0:((this._energyData.solar - this._energyData.exported) / consumoTotal) * 100).toFixed(2)
                            }%)
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
