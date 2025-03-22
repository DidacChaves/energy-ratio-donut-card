/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css } from 'lit';
import { HomeAssistant, fireEvent, LovelaceCardEditor } from 'custom-card-helpers';

import {BoilerplateCardConfig} from './types';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('boilerplate-card-editor')
export class BoilerplateCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: BoilerplateCardConfig;

  @state() private _helpers?: any;

  private _initialized = false;

  public setConfig(config: BoilerplateCardConfig): void {
    this._config = config;
    this.loadCardHelpers();
  }

  protected shouldUpdate(): boolean {
    if (!this._initialized) {
      this._initialize();
    }

    return true;
  }

  get _name(): string {
    return this._config?.name || '';
  }

  get _entity(): string {
    return this._config?.entity || '';
  }

  get _area(): string {
    return this._config?.area || '';
  }

  get _show_warning(): boolean {
    return this._config?.show_warning || false;
  }

  get _show_error(): boolean {
    return this._config?.show_error || false;
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._helpers) {
      return html``;
    }

    // You can restrict on domain type
    const entities = Object.keys(this.hass.states);

    return html`
      <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: entities }}
          .value=${this._entity}
          .configValue=${'entity'}
          name="entity"
          @value-changed=${this._valueChanged}
      ></ha-selector>
      <ha-area-picker
        .curValue=${this._area}
        no-add
        .hass=${this.hass}
        .value=${this._area}
        .configValue=${'area'}
        label="Area to display"
        @value-changed=${this._valueChanged}
      >
      </ha-area-picker>
      <ha-form-grid>
        <ha-form-col>
          <ha-textfield
            label="Name (Optional)"
            .value=${this._name}
            .configValue=${'name'}
            @input=${this._valueChanged}></ha-textfield>
        </ha-form-col>
        <ha-form-col>
          <ha-formfield .label=${`Toggle warning`}>
            <ha-switch
                .checked=${this._show_warning}
                .configValue=${'show_warning'}
                @change=${this._valueChanged}
            ></ha-switch>
          </ha-formfield>
          <ha-formfield .label= ${`Toggle error`}>
            <ha-switch
                .checked=${this._show_error}
                .configValue=${'show_error'}
                @change=${this._valueChanged}
            ></ha-switch>
          </ha-formfield>
        </ha-form-col>
      </ha-form-grid>
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
        const tmpConfig = { ...this._config };
        delete tmpConfig[target.configValue];
        this._config = tmpConfig;
      } else {
        this._config = {
          ...this._config,
          [target.configValue]: target.checked !== undefined ? target.checked : value,
        };
      }
    }
    fireEvent(this, 'config-changed', { config: this._config });
  }

  static get styles() {
    return [
      css`
        ha-form-grid {
          grid-template-columns: repeat(var(--form-grid-column-count, auto-fit), minmax(var(--form-grid-min-width, 200px), 1fr));
          gap: 24px 8px;
          display: grid !important;
        }
        ha-selector,
        ha-area-picker,
        ha-formfield {
          margin-bottom: 24px;
          display: block;
        }
        mwc-formfield {
          padding-bottom: 8px;
        }
        mwc-switch {
          --mdc-theme-secondary: var(--switch-checked-color);
        }
      `,
    ];
  }
}
