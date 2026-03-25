// Currency to locale mapping for proper number formatting
const currencyLocaleMap = {
  // Major World Currencies with their respective locales
  "USD": "en-US",     // US Dollar - 1,234.56
  "EUR": "de-DE",     // Euro - 1.234,56 (German format) or "fr-FR" for 1 234,56 (French)
  "GBP": "en-GB",     // British Pound - 1,234.56
  "JPY": "ja-JP",     // Japanese Yen - 1,234 (no decimals)
  "CNY": "zh-CN",     // Chinese Yuan - 1,234.56
  "INR": "en-IN",     // Indian Rupee - 1,23,456.78 (Indian numbering)
  "CAD": "en-CA",     // Canadian Dollar - 1,234.56
  "AUD": "en-AU",     // Australian Dollar - 1,234.56
  "CHF": "de-CH",     // Swiss Franc - 1'234.56
  "SEK": "sv-SE",     // Swedish Krona - 1 234,56
  "NOK": "nb-NO",     // Norwegian Krone - 1 234,56
  "DKK": "da-DK",     // Danish Krone - 1.234,56
  "RUB": "ru-RU",     // Russian Ruble - 1 234,56
  "BRL": "pt-BR",     // Brazilian Real - 1.234,56
  "MXN": "es-MX",     // Mexican Peso - 1,234.56
  "SGD": "en-SG",     // Singapore Dollar - 1,234.56
  "HKD": "en-HK",     // Hong Kong Dollar - 1,234.56
  "NZD": "en-NZ",     // New Zealand Dollar - 1,234.56
  "KRW": "ko-KR",     // South Korean Won - 1,234 (no decimals)
  "TRY": "tr-TR",     // Turkish Lira - 1.234,56
  "ZAR": "en-ZA",     // South African Rand - 1,234.56
  "PLN": "pl-PL",     // Polish Zloty - 1 234,56
  "CZK": "cs-CZ",     // Czech Koruna - 1 234,56
  "HUF": "hu-HU",     // Hungarian Forint - 1 234 (no decimals)
  "ILS": "he-IL",     // Israeli Shekel - 1,234.56
  "AED": "en-AE",     // UAE Dirham - 1,234.56 (English format)
  "SAR": "en-SA",     // Saudi Riyal - 1,234.56 (English format)
  "QAR": "en-QA",     // Qatari Riyal
  "KWD": "en-KW",     // Kuwaiti Dinar
  "BHD": "en-BH",     // Bahraini Dinar
  "OMR": "en-OM",     // Omani Rial
  "EGP": "en-EG",     // Egyptian Pound
  "THB": "th-TH",     // Thai Baht - 1,234.56
  "MYR": "en-MY",     // Malaysian Ringgit - 1,234.56
  "IDR": "id-ID",     // Indonesian Rupiah - 1.234,56
  "PHP": "en-PH",     // Philippine Peso - 1,234.56
  "VND": "vi-VN",     // Vietnamese Dong - 1.234,56
  "TWD": "zh-TW",     // Taiwan Dollar - 1,234.56
  "BGN": "bg-BG",     // Bulgarian Lev - 1 234,56
  "RON": "ro-RO",     // Romanian Leu - 1.234,56
  "HRK": "hr-HR",     // Croatian Kuna - 1.234,56
  "RSD": "sr-RS",     // Serbian Dinar - 1.234,56
  "UAH": "uk-UA",     // Ukrainian Hryvnia - 1 234,56
  "PKR": "en-PK",     // Pakistani Rupee - 1,234.56
  "BDT": "en-BD",     // Bangladeshi Taka - 1,234.56
  "LKR": "en-LK",     // Sri Lankan Rupee - 1,234.56
  "NPR": "en-NP",     // Nepalese Rupee - 1,234.56
  "IRR": "en-IR",     // Iranian Rial - 1,234.56
  "IQD": "en-IQ",     // Iraqi Dinar
  "JOD": "en-JO",     // Jordanian Dinar
  "LBP": "en-LB",     // Lebanese Pound
  "MAD": "en-MA",     // Moroccan Dirham
  "TND": "en-TN",     // Tunisian Dinar
  "DZD": "en-DZ",     // Algerian Dinar
  "KES": "en-KE",     // Kenyan Shilling - 1,234.56
  "UGX": "en-UG",     // Ugandan Shilling - 1,234
  "TZS": "en-TZ",     // Tanzanian Shilling - 1,234.56
  "GHS": "en-GH",     // Ghanaian Cedi - 1,234.56
  "NGN": "en-NG",     // Nigerian Naira - 1,234.56
  "CLP": "es-CL",     // Chilean Peso - 1.234,56
  "ARS": "es-AR",     // Argentine Peso - 1.234,56
  "UYU": "es-UY",     // Uruguayan Peso - 1.234,56
  "PEN": "es-PE",     // Peruvian Sol - 1,234.56
  "COP": "es-CO",     // Colombian Peso - 1.234,56
  "GTQ": "es-GT",     // Guatemalan Quetzal - 1,234.56
  "CRC": "es-CR",     // Costa Rican Colón - 1.234,56
  "DOP": "es-DO",     // Dominican Peso - 1,234.56
};

// Currency symbols mapping
const currencySymbols = {
  "USD": "$",     // US Dollar
  "EUR": "€",     // Euro
  "GBP": "£",     // British Pound
  "JPY": "¥",     // Japanese Yen
  "CNY": "¥",     // Chinese Yuan
  "INR": "₹",     // Indian Rupee
  "CAD": "C$",    // Canadian Dollar
  "AUD": "A$",    // Australian Dollar
  "CHF": "CHF",   // Swiss Franc
  "SEK": "kr",    // Swedish Krona
  "NOK": "kr",    // Norwegian Krone
  "DKK": "kr",    // Danish Krone
  "RUB": "₽",     // Russian Ruble
  "BRL": "R$",    // Brazilian Real
  "MXN": "$",     // Mexican Peso
  "SGD": "S$",    // Singapore Dollar
  "HKD": "HK$",   // Hong Kong Dollar
  "NZD": "NZ$",   // New Zealand Dollar
  "KRW": "₩",     // South Korean Won
  "TRY": "₺",     // Turkish Lira
  "ZAR": "R",     // South African Rand
  "PLN": "zł",    // Polish Zloty
  "CZK": "Kč",    // Czech Koruna
  "HUF": "Ft",    // Hungarian Forint
  "ILS": "₪",     // Israeli Shekel
  "AED": "د.إ",   // UAE Dirham
  "SAR": "﷼",     // Saudi Riyal
  "QAR": "﷼",     // Qatari Riyal
  "KWD": "د.ك",   // Kuwaiti Dinar
  "BHD": ".د.ب",  // Bahraini Dinar
  "OMR": "﷼",     // Omani Rial
  "EGP": "£",     // Egyptian Pound
  "THB": "฿",     // Thai Baht
  "MYR": "RM",    // Malaysian Ringgit
  "IDR": "Rp",    // Indonesian Rupiah
  "PHP": "₱",     // Philippine Peso
  "VND": "₫",     // Vietnamese Dong
  "TWD": "NT$",   // Taiwan Dollar
  "BGN": "лв",    // Bulgarian Lev
  "RON": "lei",   // Romanian Leu
  "HRK": "kn",    // Croatian Kuna
  "RSD": "дин",   // Serbian Dinar
  "UAH": "₴",     // Ukrainian Hryvnia
  "PKR": "₨",     // Pakistani Rupee
  "BDT": "৳",     // Bangladeshi Taka
  "LKR": "₨",     // Sri Lankan Rupee
  "NPR": "₨",     // Nepalese Rupee
  "IRR": "﷼",     // Iranian Rial
  "IQD": "ع.د",   // Iraqi Dinar
  "JOD": "د.ا",   // Jordanian Dinar
  "LBP": "£",     // Lebanese Pound
  "MAD": "د.م.",  // Moroccan Dirham
  "TND": "د.ت",   // Tunisian Dinar
  "DZD": "د.ج",   // Algerian Dinar
  "KES": "KSh",   // Kenyan Shilling
  "UGX": "USh",   // Ugandan Shilling
  "TZS": "TSh",   // Tanzanian Shilling
  "GHS": "₵",     // Ghanaian Cedi
  "NGN": "₦",     // Nigerian Naira
  "CLP": "$",     // Chilean Peso
  "ARS": "$",     // Argentine Peso
  "UYU": "$U",    // Uruguayan Peso
  "PEN": "S/",    // Peruvian Sol
  "COP": "$",     // Colombian Peso
  "GTQ": "Q",     // Guatemalan Quetzal
  "CRC": "₡",     // Costa Rican Colón
  "DOP": "RD$",   // Dominican Peso
};

// Currencies that don't use decimal places
const noDecimalCurrencies = ['JPY', 'KRW', 'HUF', 'UGX', 'VND', 'CLP', 'IDR'];

/**
 * Format number according to currency and locale
 * @param {number|string} num - The number to format
 * @param {string} currency - Currency code (e.g., 'USD', 'EUR', 'INR')
 * @param {boolean} showSymbol - Whether to show currency symbol
 * @returns {string} Formatted number
 */
export const formatNumber = (num, currency = 'INR', showSymbol = false) => {
  if (isNaN(num) || num === null || num === undefined) {
    const defaultFormat = noDecimalCurrencies.includes(currency) ? "0" : "0.00";
    return showSymbol ? `${getCurrencySymbol(currency)} ${defaultFormat}` : defaultFormat;
  }

  const numValue = parseFloat(num);
  const locale = currencyLocaleMap[currency] || 'en-IN'; // Default to Indian format
  const useDecimals = !noDecimalCurrencies.includes(currency);

  const options = {
    minimumFractionDigits: useDecimals ? 2 : 0,
    maximumFractionDigits: useDecimals ? 2 : 0,
  };

  try {
    const formatted = new Intl.NumberFormat(locale, options).format(numValue);
    return showSymbol ? `${getCurrencySymbol(currency)} ${formatted}` : formatted;
  } catch (error) {
    // Fallback to en-US format if locale is not supported
    const fallbackFormatted = new Intl.NumberFormat('en-US', options).format(numValue);
    return showSymbol ? `${getCurrencySymbol(currency)} ${fallbackFormatted}` : fallbackFormatted;
  }
};

/**
 * Get currency symbol for a given currency code
 * @param {string} currencyType - Currency code (e.g., 'USD', 'EUR', 'INR')
 * @returns {string} Currency symbol
 */
export const getCurrencySymbol = (currencyType) => {
  if (!currencyType || currencyType === "") {
    return "₹"; // Default to INR
  }
  return currencySymbols[currencyType.toUpperCase()] || "₹";
};

/**
 * Format currency with symbol and proper locale formatting
 * @param {number|string} amount - The amount to format
 * @param {string} currency - Currency code (e.g., 'USD', 'EUR', 'INR')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'INR') => {
  return formatNumber(amount, currency, true);
};

/**
 * Legacy function for backward compatibility
 * @param {number|string} num - The number to format
 * @returns {string} Formatted number in Indian format
 */
export const formatNumberLegacy = (num) => {
  return formatNumber(num, 'INR', false);
};

// Export the legacy function as default for backward compatibility
export default formatNumber;