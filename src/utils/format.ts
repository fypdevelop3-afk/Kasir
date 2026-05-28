/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Format numbers into Indonesian Rupiah (Rp)
 */
export const formatRupiah = (value: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Format string or date object into pretty Indonesian Date format
 */
export const formatIndoDate = (dateStr: string | Date, includeTime = false): string => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  
  if (includeTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
  }
  
  return d.toLocaleDateString("id-ID", options);
};

/**
 * Safely parse input value to number (useful for inputs)
 */
export const parseInputNumber = (val: string): number => {
  const parsed = parseFloat(val.replace(/[^0-9.-]+/g, ""));
  return isNaN(parsed) ? 0 : parsed;
};
