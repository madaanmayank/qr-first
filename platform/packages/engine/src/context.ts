import type { MenuIndex, StoreConfig, TaxClassDef } from '@qr-first/contracts';

/**
 * What the engine needs from the outside, passed in so the engine does no I/O.
 * `now` is an ISO UTC instant. Ids come from the caller.
 */
export interface EngineContext {
  config: StoreConfig;
  menu: MenuIndex;
  /** Override the tax class table. Default is built from `config.settings.tax`. */
  taxClasses?: Record<string, TaxClassDef>;
  /**
   * State VAT rate for alcohol, in basis points, from the country profile's state table.
   * Alcohol lines cannot be priced without it, see NOTES.md.
   */
  stateVatRateBp?: number;
  now: string;
}

export type PricingContext = Pick<EngineContext, 'config' | 'menu' | 'taxClasses' | 'stateVatRateBp'>;
