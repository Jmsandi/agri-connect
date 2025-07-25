/**
 * Currency utility functions for AgriConnect
 * Using Sierra Leone Leone (SLL) as the primary currency
 */

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-SL', {
    style: 'currency',
    currency: 'SLL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

export const formatPriceWithDecimals = (price: number): string => {
  return new Intl.NumberFormat('en-SL', {
    style: 'currency',
    currency: 'SLL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

// Alternative format without currency symbol for input fields
export const formatNumber = (price: number): string => {
  return new Intl.NumberFormat('en-SL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

// Simple format with Le symbol (common abbreviation for Leone)
export const formatPriceSimple = (price: number): string => {
  return `Le ${price.toLocaleString('en-SL')}`;
};

// Currency constants
export const CURRENCY = {
  code: 'SLL',
  symbol: 'Le',
  name: 'Sierra Leone Leone',
  locale: 'en-SL',
};
