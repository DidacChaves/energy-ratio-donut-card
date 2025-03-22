/* eslint-disable @typescript-eslint/no-explicit-any */
import {css, CSSResultGroup, html, LitElement, PropertyValues, TemplateResult} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {ActionHandlerEvent, getLovelace, handleAction, hasAction, hasConfigOrEntityChanged, HomeAssistant, LovelaceCardEditor,LovelaceCard} from 'custom-card-helpers'; // This is a community maintained npm module with common helper functions/types. https://github.com/custom-cards/custom-card-helpers
import type {BoilerplateCardConfig} from './types';
import {actionHandler} from './action-handler-directive';
import {CARD_VERSION} from './const';
import {localize} from './localize/localize';

/* eslint no-console: 0 */
console.info(
  `%c  BOILERPLATE-CARD \n%c  ${localize('common.version')} ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'boilerplate-card',
  name: 'Boilerplate Card',
  description: 'A template custom card for you to create something awesome',
});

// TODO Name your custom element
@customElement('boilerplate-card')
export class BoilerplateCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editor');
    return document.createElement('boilerplate-card-editor');
  }

  public static getStubConfig(): Record<string, unknown> {
    return {};
  }

  // TODO Add any properities that should cause your element to re-render here
  // https://lit.dev/docs/components/properties/
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private config!: BoilerplateCardConfig;

  // https://lit.dev/docs/components/properties/#accessors-custom
  public setConfig(config: BoilerplateCardConfig): void {
    // TODO Check for required fields and that they are of the proper format
    if (!config) {
      throw new Error(localize('common.invalid_configuration'));
    }

    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }

    this.config = {
      name: 'Boilerplate',
      ...config,
    };
  }

  public async getCardSize(): Promise<number> {
    return 2;
  }

  public getGridOptions(): any {
    return {
      columns: 12,
      rows: 2,
      min_columns: 6,
      min_rows: 2,
    };
  }

  // https://lit.dev/docs/components/lifecycle/#reactive-update-cycle-performing
  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {
      return false;
    }

    return hasConfigOrEntityChanged(this, changedProps, false);
  }

  // https://lit.dev/docs/components/rendering/
  protected render(): TemplateResult | void {
    // TODO Check for stateObj or other necessary things and render a warning if missing
    if (this.config.show_warning) {
      return this._showWarning(localize('common.show_warning'));
    }

    if (this.config.show_error) {
      return this._showError(localize('common.show_error'));
    }

    const {  entity } = this.config;
    const entityState = entity ? this.hass.states[entity] : undefined;
    const stateValue = entityState ? entityState.state : undefined;

    return html`
      <ha-card
        class="with-fixed-footer "
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this.config.hold_action),
          hasDoubleClick: hasAction(this.config.double_tap_action),
        })}
        tabindex="0"
        .label=${`Boilerplate: ${this.config.entity || 'No Entity Defined'}`}
      >
        <div class="header">
          <div class="name" title="${this.config.name}">${this.config.name}</div>
        </div>
        <div class="info">
          <span class="value">${stateValue}</div>
        <div class="footer">
        </div>
      </ha-card>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent): void {
    if (this.hass && this.config && ev.detail.action) {
      handleAction(this, this.hass, this.config, ev.detail.action);
    }
  }

  private _showWarning(warning: string): TemplateResult {
    return html` <hui-warning>${warning}</hui-warning> `;
  }

  private _showError(error: string): TemplateResult {
    const errorCard = document.createElement('hui-error-card');
    errorCard.setConfig({
      type: 'error',
      error,
      origConfig: this.config,
    });

    return html` ${errorCard} `;
  }

  // https://lit.dev/docs/components/styles/
  static get styles(): CSSResultGroup {
    return css`
      .with-fixed-footer {
        justify-content: flex-start;
      }
      ha-card {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        cursor: pointer;
        outline: 0;
      }
      .header {
        display: flex;
        padding: 8px 16px 0;
        justify-content: space-between;
      }
      .name {
        color: var(--secondary-text-color);
        line-height: 40px;
        font-weight: 500;
        font-size: 16px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .info {
        padding: 0px 16px 16px;
        margin-top: -4px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        line-height: 28px;
      }
      .with-fixed-footer .footer {
        position: absolute;
        right: 0;
        left: 0;
        bottom: 0;
      }
    `;
  }
}
