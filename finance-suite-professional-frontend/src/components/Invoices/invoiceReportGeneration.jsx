import React from "react";
import Logo from "../../assets/FessitLogoTrans.png";
import { sampleData, bankDetails, terms } from "./SampleInvoiceData";
import { formatNumber } from "../../utils/formatNumber";

const InvoiceReportGeneration = ({ invoiceData }) => {
  // 🧠 Prefer actual invoiceData, fall back to sampleData
  const baseData =
    invoiceData && Object.keys(invoiceData || {}).length > 0
      ? invoiceData
      : sampleData;

  // Always ensure we have a logo
  const data = {
    company_logo: Logo,
    ...baseData,
  };

  const items = Array.isArray(data.items) ? data.items : [];

  // If totals are not present for some reason, derive simple subtotal
  const computedSubTotal =
    items.reduce(
      (sum, item) => sum + (parseFloat(item.itemTotal) || 0),
      0
    ) || 0;

  const subTotal = data.subTotal || computedSubTotal.toFixed(2);
  const totalcgst = data.totalcgst || "0.00";
  const totalsgst = data.totalsgst || "0.00";
  const total = data.total || (
    computedSubTotal +
    parseFloat(totalcgst || 0) +
    parseFloat(totalsgst || 0)
  ).toFixed(2);

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg p-8 text-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          {data.company_logo && (
            <img
              src={data.company_logo}
              alt="Company Logo"
              className="h-12 object-contain"
            />
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {data.company_name}
            </h1>
            <p className="text-xs text-gray-700 whitespace-pre-line">
              {data.company_address}
            </p>
            <p className="text-xs text-gray-700 mt-1">
              GSTIN: {data.gstIN}
            </p>
            <p className="text-xs text-gray-700">
              Email: {data.company_email} | Ph: {data.company_phone}
            </p>
          </div>
        </div>

        <div className="text-right">
          <h2 className="text-lg font-semibold text-gray-900">TAX INVOICE</h2>
          <p className="text-xs text-gray-700 mt-2">
            Invoice No: <span className="font-medium">{data.invoice_number}</span>
          </p>
          <p className="text-xs text-gray-700">
            Invoice Date: <span className="font-medium">{data.invoice_date}</span>
          </p>
          <p className="text-xs text-gray-700">
            Due Date: <span className="font-medium">{data.invoice_dueDate}</span>
          </p>
          <p className="text-xs text-gray-700">
            Terms: <span className="font-medium">{data.invoice_terms}</span>
          </p>
        </div>
      </div>

      {/* Bill / Ship To + PO / Place of Supply */}
      <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-300 py-4 mb-6">
        <div>
          <h3 className="text-xs font-semibold text-gray-800 mb-1">Bill To</h3>
          <p className="text-sm font-medium text-gray-900">
            {data.billcustomer_name}
          </p>
          <p className="text-xs text-gray-700 whitespace-pre-line">
            {data.billcustomer_address}
          </p>
          <p className="text-xs text-gray-700 mt-1">
            GSTIN: {data.billcustomer_gstin}
          </p>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-gray-800 mb-1">Ship To</h3>
          <p className="text-sm font-medium text-gray-900">
            {data.shipcustomer_name}
          </p>
          <p className="text-xs text-gray-700 whitespace-pre-line">
            {data.shipcustomer_address}
          </p>
          <p className="text-xs text-gray-700 mt-1">
            GSTIN: {data.shipcustomer_gstin}
          </p>
        </div>

        <div className="col-span-2 grid grid-cols-2 mt-3 gap-4">
          <p className="text-xs text-gray-700">
            <span className="font-semibold">PO Number:</span> {data.po_number}
          </p>
          <p className="text-xs text-gray-700">
            <span className="font-semibold">Place of Supply:</span>{" "}
            {data.place_of_supply}
          </p>
        </div>
      </div>

      {/* Subject */}
      {data.subject && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-800 mb-1">Subject</p>
          <p className="text-xs text-gray-800">{data.subject}</p>
        </div>
      )}

      {/* Items Table */}
      <table className="w-full border border-gray-300 border-collapse text-xs mb-4">
        <thead className="bg-gray-100">
          <tr>
            <th className="border border-gray-300 px-2 py-1 text-left w-8">
              Sl
            </th>
            <th className="border border-gray-300 px-2 py-1 text-left">
              Item & Description
            </th>
            <th className="border border-gray-300 px-2 py-1 text-right w-16">
              Hour
            </th>
            <th className="border border-gray-300 px-2 py-1 text-right w-20">
              Rate
            </th>
            <th className="border border-gray-300 px-2 py-1 text-center w-16">
              CGST %
            </th>
            <th className="border border-gray-300 px-2 py-1 text-right w-20">
              CGST Amt
            </th>
            <th className="border border-gray-300 px-2 py-1 text-center w-16">
              SGST %
            </th>
            <th className="border border-gray-300 px-2 py-1 text-right w-20">
              SGST Amt
            </th>
            <th className="border border-gray-300 px-2 py-1 text-right w-24">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? (
            items.map((item, index) => (
              <tr key={index} className="align-top">
                <td className="border border-gray-300 px-2 py-1 text-center">
                  {index + 1}
                </td>
                <td className="border border-gray-300 px-2 py-1">
                  {item.description}
                </td>
                <td className="border border-gray-300 px-2 py-1 text-right">
                  {item.hours}
                </td>
                <td className="border border-gray-300 px-2 py-1 text-right">
                  {formatNumber(item.rate || 0)}
                </td>
                <td className="border border-gray-300 px-2 py-1 text-center">
                  {item?.cgst?.cgstPercent || "0"}
                </td>
                <td className="border border-gray-300 px-2 py-1 text-right">
                  {formatNumber(item?.cgst?.cgstAmount || 0)}
                </td>
                <td className="border border-gray-300 px-2 py-1 text-center">
                  {item?.sgst?.sgstPercent || "0"}
                </td>
                <td className="border border-gray-300 px-2 py-1 text-right">
                  {formatNumber(item?.sgst?.sgstAmount || 0)}
                </td>
                <td className="border border-gray-300 px-2 py-1 text-right font-semibold">
                  {formatNumber(item.itemTotal || 0)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={9}
                className="border border-gray-300 px-2 py-4 text-center text-gray-500"
              >
                No items added
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals + Bank Details */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Bank Details & Terms */}
        <div className="text-xs text-gray-800 space-y-3">
          <div>
            <h3 className="font-semibold mb-1">{bankDetails.title}</h3>
            <div className="border border-gray-300 rounded p-2">
              {bankDetails.fields.map((field) => (
                <p key={field.label}>
                  <span className="font-semibold">{field.label}:</span>{" "}
                  {field.value}
                </p>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Terms & Conditions</h3>
            <ul className="list-disc list-inside space-y-1">
              {terms.map((t, idx) => (
                <li key={idx}>{t}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-2 text-xs text-gray-900">
          <div className="flex justify-between">
            <span>Sub Total</span>
            <span className="font-semibold">
              ₹ {formatNumber(subTotal || 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Total CGST</span>
            <span className="font-semibold">
              ₹ {formatNumber(totalcgst || 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Total SGST</span>
            <span className="font-semibold">
              ₹ {formatNumber(totalsgst || 0)}
            </span>
          </div>
          <div className="flex justify-between border-t border-gray-400 pt-2 mt-1 text-sm">
            <span className="font-bold">Grand Total</span>
            <span className="font-extrabold text-indigo-700">
              ₹ {formatNumber(total || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes & Signature */}
      {data.notes && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-800 mb-1">Notes</h3>
          <p className="text-xs text-gray-700 whitespace-pre-line">
            {data.notes}
          </p>
        </div>
      )}

      <div className="flex justify-end mt-8">
        <div className="text-center">
          <p className="text-xs font-semibold text-gray-700 mb-16">
            For {data.company_name}
          </p>
          <div className="border-t border-gray-400 pt-1">
            <p className="text-xs text-gray-600">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceReportGeneration;
