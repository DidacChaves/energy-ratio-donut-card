/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult } from 'lit';
import { HomeAssistant, fireEvent, LovelaceCardEditor } from 'custom-card-helpers';

import {EnergyRatioDonutConfig} from './types';
import { customElement, property, state } from 'lit/decorators.js';
import styles from './styles/editor.css'
import {localize} from './localize/localize';

@customElement('energy-ratio-donut-editor')
export class EnergyRatioDonutCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EnergyRatioDonutConfig;

  @state() private _helpers?: any;

  private _initialized = false;

  public setConfig(config: EnergyRatioDonutConfig): void {
    this._config = config;
    this.loadCardHelpers();
  }

  protected shouldUpdate(): boolean {
    if (!this._initialized) {
      this._initialize();
    }

    return true;
  }

  get _chartType(): string {
    return this._config?.chart_type || 'solar';
  }

  get _name(): string {
    return this._config?.name || '';
  }

  get _collection_key(): string {
    return this._config?.collection_key || '';
  }

  get _area(): string {
    return this._config?.area || '';
  }

  get _show_date(): boolean {
    return this._config?.show_date || false;
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._helpers) {
      return html``;
    }

    return html`
        <ha-selector
                .hass=${this.hass}
                .selector=${{
                    select: {
                        options: [
                            {value: 'solar', label: localize('EDITOR.CHART_TYPE_SOLAR')},
                            {value: 'consumption', label: localize('EDITOR.CHART_TYPE_CONSUMPTION')}
                        ]
                    }
                }}
                .value=${this._chartType}
                .configValue=${'chart_type'}
                name="chart_type"
                @value-changed=${this._valueChanged}
        ></ha-selector>
        <ha-textfield
                label=${localize('EDITOR.COLLECTION_KEY')}
                .value=${this._collection_key}
                .configValue=${'collection_key'}
                @input=${this._valueChanged}>
        </ha-textfield>
        <ha-area-picker
                .curValue=${this._area}
                no-add
                .hass=${this.hass}
                .value=${this._area}
                .configValue=${'area'}
                label=${localize('EDITOR.AREA')}
                @value-changed=${this._valueChanged}
        >
        </ha-area-picker>
        <ha-textfield
                label=${localize('EDITOR.NAME')}
                .value=${this._name}
                .configValue=${'name'}
                @input=${this._valueChanged}>
        </ha-textfield>
        <ha-formfield .label=${localize('EDITOR.SHOW_DATE')}>
            <ha-switch
                    .checked=${this._show_date}
                    .configValue=${'show_date'}
                    @change=${this._valueChanged}
            ></ha-switch>
        </ha-formfield>
    `;
  }

  private _initialize(): void {
    if (this.hass === undefined) return;
    if (this._config === undefined) return;
    if (this._helpers === undefined) return;
    this._initialized = true;
  }

  private async loadCardHelpers(): Promise<void> {
    this._helpers = await (window as any).loadCardHelpers();
  }


  private _valueChanged(ev): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target;

    let value = ev.detail?.value || target.value;
    if (!target.configValue) {
      return;
    }

    if (value === this[`_${target.configValue}`]) {
      value = ''; // Forzar el valor a null
    }

    if (target.configValue) {
      if (value === '') {
        const tmpConfig = {...this._config};
        delete tmpConfig[target.configValue];
        this._config = tmpConfig;
      } else {
        this._config = {
          ...this._config,
          [target.configValue]: target.checked !== undefined ? target.checked : value,
        };
      }
    }
    fireEvent(this, 'config-changed', {config: this._config});
  }

  static get styles() {
    return styles;
  }
}
