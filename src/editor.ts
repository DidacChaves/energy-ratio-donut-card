/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult } from 'lit';
import { HomeAssistant, fireEvent, LovelaceCardEditor } from 'custom-card-helpers';
import { customElement, property, state } from 'lit/decorators.js';

import { EnergyRatioDonutConfig } from './types';
import styles from './styles/editor.css'
import { localize } from './localize/localize';

const DEFAULTS = {
  chart_type: 'solar',
  collection_key: 'energy',
  show_date: false,
};

@customElement('energy-ratio-donut-editor')
export class EnergyRatioDonutCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EnergyRatioDonutConfig;

  @state() private _componentsReady = false;

  public setConfig(config: EnergyRatioDonutConfig): void {
    this._config = config;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._loadComponents();
  }

  /**
   * HA loads `ha-form` (and the selectors) lazily, only when some built-in editor needs them.
   * Opening the editor of a built-in card forces that load.
   */
  private async _loadComponents(): Promise<void> {
    if (!customElements.get('ha-form')) {
      try {
        const helpers = await (window as any).loadCardHelpers();
        const card = await helpers.createCardElement({ type: 'entities', entities: [] });
        await card?.constructor?.getConfigElement?.();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('energy-ratio-donut-card: could not preload HA form components', err);
      }
      await Promise.race([
        customElements.whenDefined('ha-form'),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
    }
    this._componentsReady = true;
  }

  private _schema() {
    const lang = this.hass?.language;
    return [
      {
        name: 'chart_type',
        selector: {
          select: {
            mode: 'dropdown',
            options: [
              { value: 'solar', label: localize('EDITOR.CHART_TYPE_SOLAR', lang) },
              { value: 'consumption', label: localize('EDITOR.CHART_TYPE_CONSUMPTION', lang) },
            ],
          },
        },
      },
      { name: 'name', selector: { text: {} } },
      { name: 'collection_key', selector: { text: {} } },
      { name: 'show_date', selector: { boolean: {} } },
      {
        type: 'expandable',
        title: localize('EDITOR.INTERACTIONS', lang),
        schema: [
          { name: 'tap_action', selector: { ui_action: {} } },
          { name: 'hold_action', selector: { ui_action: {} } },
          { name: 'double_tap_action', selector: { ui_action: {} } },
        ],
      },
    ];
  }

  // `ha-form` also calls this for the expandable group, which has a `title` instead of a `name`
  private _computeLabel = (schema: { name?: string; title?: string }): string =>
    schema.name ? localize(`EDITOR.${schema.name.toUpperCase()}`, this.hass?.language) : schema.title ?? '';

  protected render(): TemplateResult | void {
    if (!this.hass || !this._config || !this._componentsReady) {
      return html``;
    }

    return html`
        <ha-form
                .hass=${this.hass}
                .data=${{ ...DEFAULTS, ...this._config }}
                .schema=${this._schema()}
                .computeLabel=${this._computeLabel}
                @value-changed=${this._valueChanged}
        ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config) return;

    // Empty fields are removed so the card falls back to its defaults
    const config = { ...ev.detail.value } as Record<string, unknown>;
    for (const key of Object.keys(config)) {
      if (config[key] === '' || config[key] === undefined) delete config[key];
    }

    this._config = config as EnergyRatioDonutConfig;
    fireEvent(this, 'config-changed', { config: this._config });
  }

  static get styles() {
    return styles;
  }
}
