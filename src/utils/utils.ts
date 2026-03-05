import { HassEntity, STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import {
  computeStateDomain,
  isNumericState,
  numberFormatToLocale,
  FrontendLocaleData,
  HomeAssistant,
  LocalizeFunc,
  NumberFormat,
} from "custom-card-helpers";

export const createEntityNotFoundWarning = (
  hass: HomeAssistant,
  entityId: string
): string =>
  hass.config.state !== STATE_NOT_RUNNING
    ? hass.localize(
      "ui.panel.lovelace.warning.entity_not_found",
      "entity",
      entityId || "[empty]"
    )
    : hass.localize("ui.panel.lovelace.warning.starting");

export const createEntityErrorWarning = (
  error: Error,
  entityId: string
): string => `${error} Entity ${entityId || "[empty]"}`

// Función de formato importada y adaptada de custom-card-helpers
// Todos los derechos reservados
// Modificaciones incluyen:
//   - eliminación de formato innecesario de tipo de estado
//   - permitir pasar opciones de formato
export const computeStateDisplay = (
  localize: LocalizeFunc,
  stateObj: HassEntity,
  locale: FrontendLocaleData,
  state?: string,
  options?: Intl.NumberFormatOptions
): string => {
  const compareState = state !== undefined ? state : stateObj.state;

  if (compareState === "unknown" || compareState === "unavailable") {
    return localize(`state.default.${compareState}`);
  }

  // Las entidades con `unit_of_measurement` o `state_class` son valores numéricos y deben usar `formatNumber`
  if (isNumericState(stateObj)) {
    if (stateObj.attributes.device_class === "monetary") {
      try {
        return formatNumber(compareState, locale, {
          ...options,
          style: "currency",
          currency: stateObj.attributes.unit_of_measurement,
        });
      } catch (_err) {
        // volver al valor por defecto
      }
    }
    return `${formatNumber(compareState, locale, options)}${
      stateObj.attributes.unit_of_measurement
        ? " " + stateObj.attributes.unit_of_measurement
        : ""
    }`;
  }

  const domain = computeStateDomain(stateObj);

  // contenido eliminado aquí de la función original

  return (
    // Retorna la traducción de la clase de dispositivo
    (stateObj.attributes.device_class &&
      localize(
        `component.${domain}.state.${stateObj.attributes.device_class}.${compareState}`
      )) ||
    // Retorna la traducción por defecto
    localize(`component.${domain}.state._.${compareState}`) ||
    // ¡No lo sabemos! Retorna el estado sin procesar.
    compareState
  );
};

export const round = (value: number, precision = 2): number =>
  Math.round(value * 10 ** precision) / 10 ** precision;

/**
 * Formats a number based on the specified language with thousands separator(s) and decimal character for better legibility.
 * @param num The number to format
 * @param locale The user-selected language and number format, from `hass.locale`
 * @param options Intl.NumberFormatOptions to use
 */
export const formatNumber = (
  num: string | number,
  localeOptions?: FrontendLocaleData,
  options?: Intl.NumberFormatOptions
): string => {
  const locale = localeOptions
    ? numberFormatToLocale(localeOptions)
    : undefined;

  // Polyfill para Number.isNaN, que es más confiable que el global isNaN()
  Number.isNaN =
    Number.isNaN ||
    function isNaN(input) {
      return typeof input === "number" && isNaN(input);
    };

  if (
    localeOptions?.number_format !== NumberFormat.none &&
    !Number.isNaN(Number(num)) &&
    Intl
  ) {
    try {
      return new Intl.NumberFormat(
        locale,
        getDefaultFormatOptions(num, options)
      ).format(Number(num));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      // No fallar al usar el idioma "TEST"
      // eslint-disable-next-line no-console
      console.error(err);
      return new Intl.NumberFormat(
        undefined,
        getDefaultFormatOptions(num, options)
      ).format(Number(num));
    }
  }
  if (typeof num === "string") {
    return num;
  }
  return `${round(num, options?.maximumFractionDigits).toLocaleString()}${
    options?.style === "currency" ? ` ${options.currency}` : ""
  }`;
};

/**
 * Generates default options for Intl.NumberFormat
 * @param num The number to be formatted
 * @param options The Intl.NumberFormatOptions that should be included in the returned options
 */
const getDefaultFormatOptions = (
  num: string | number,
  options?: Intl.NumberFormatOptions
): Intl.NumberFormatOptions => {
  const defaultOptions: Intl.NumberFormatOptions = {
    maximumFractionDigits: 2,
    ...options,
  };

  if (typeof num !== "string") {
    return defaultOptions;
  }

  // Mantener ceros decimales finales si están presentes en un valor numérico tipo string
  if (
    !options ||
    (!options.minimumFractionDigits && !options.maximumFractionDigits)
  ) {
    const digits = num.indexOf(".") > -1 ? num.split(".")[1].length : 0;
    defaultOptions.minimumFractionDigits = digits;
    defaultOptions.maximumFractionDigits = digits;
  }

  return defaultOptions;
};

export const groupBy = <T>(
  list: T[],
  keySelector: (item: T) => string
): Record<string, T[]> => {
  const result = {};
  for (const item of list) {
    const key = keySelector(item);
    if (key in result) {
      result[key].push(item);
    } else {
      result[key] = [item];
    }
  }
  return result;
};
