import React from 'react';
import { formatNumber, getCurrencySymbol, formatCurrency } from '../utils/formatNumber';

const CurrencyFormattingDemo = () => {
  const testAmount = 1234567.89;
  const currencies = [
    'INR', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CAD', 'AUD', 'CHF', 'SEK', 
    'NOK', 'DKK', 'RUB', 'BRL', 'MXN', 'SGD', 'HKD', 'NZD', 'KRW', 'TRY',
    'ZAR', 'PLN', 'CZK', 'HUF', 'ILS', 'AED', 'SAR', 'THB', 'MYR', 'IDR',
    'PHP', 'VND', 'TWD', 'PKR', 'BDT', 'LKR', 'NPR'
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Currency Formatting Demo</h2>
      <p className="mb-4 text-gray-600">Test amount: {testAmount.toLocaleString()}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currencies.map(currency => (
          <div key={currency} className="border border-gray-200 rounded-lg p-4">
            <div className="font-semibold text-gray-800 mb-2">{currency}</div>
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-gray-600">Symbol:</span> 
                <span className="ml-2 font-mono">{getCurrencySymbol(currency)}</span>
              </div>
              <div>
                <span className="text-gray-600">Number:</span> 
                <span className="ml-2 font-mono">{formatNumber(testAmount, currency)}</span>
              </div>
              <div>
                <span className="text-gray-600">With Symbol:</span> 
                <span className="ml-2 font-mono font-semibold text-green-600">
                  {formatCurrency(testAmount, currency)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Key Features:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Proper locale-specific number formatting (Indian: 1,23,456.78, European: 1.234.567,89, etc.)</li>
          <li>• Correct currency symbols for 100+ currencies</li>
          <li>• No decimal places for currencies like JPY, KRW, HUF, VND</li>
          <li>• Fallback to English format if locale is not supported</li>
          <li>• Backward compatibility with existing code</li>
        </ul>
      </div>

      <div className="mt-6 p-4 bg-green-50 rounded-lg">
        <h3 className="font-semibold text-green-800 mb-2">Usage Examples:</h3>
        <div className="text-sm text-green-700 space-y-2 font-mono">
          <div>formatNumber(1234.56, 'EUR') → {formatNumber(1234.56, 'EUR')}</div>
          <div>formatCurrency(1234.56, 'EUR') → {formatCurrency(1234.56, 'EUR')}</div>
          <div>getCurrencySymbol('EUR') → {getCurrencySymbol('EUR')}</div>
          <div>formatNumber(1234, 'JPY') → {formatNumber(1234, 'JPY')} (no decimals)</div>
          <div>formatCurrency(1234567.89, 'INR') → {formatCurrency(1234567.89, 'INR')} (Indian format)</div>
        </div>
      </div>
    </div>
  );
};

export default CurrencyFormattingDemo;