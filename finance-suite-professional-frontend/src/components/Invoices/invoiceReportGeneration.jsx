import React, { useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { sampleData, terms, bankDetails } from "./sampleInvoiceData";
import { ToWords } from "to-words";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const toWords = new ToWords({
  localeCode: "en-IN",
  converterOptions: { currency: true },
});

export default function InvoiceReportGeneration() {
  const [invoiceData, setIncvoiceData] = useState(sampleData);
  const componentRef = useRef(null);

  const nav = useNavigate()

  //   useEffect(() => {
  //     const data = JSON.parse(localStorage.getItem("invoice"));
  //     setIncvoiceData(data);
  //   }, []);
  // console.log(invoiceData)
  

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: "Invoice Report",
  });

  const groupTaxValues = (items = []) => {
    const grouped = { cgst: {}, sgst: {} };

    items.forEach((item) => {
      const hours = parseFloat(item.hours || 1);
      const rate = parseFloat(item.rate || 0);
      const baseAmount = hours * rate;

      const cgstPercent = parseFloat(item.cgst?.cgstPercent || 0);
      const sgstPercent = parseFloat(item.sgst?.sgstPercent || 0);

      const cgstValue = (baseAmount * cgstPercent) / 100;
      const sgstValue = (baseAmount * sgstPercent) / 100;

      grouped.cgst[cgstPercent] = (grouped.cgst[cgstPercent] || 0) + cgstValue;
      grouped.sgst[sgstPercent] = (grouped.sgst[sgstPercent] || 0) + sgstValue;
    });

    return grouped;
  };
  const grouped = groupTaxValues(invoiceData.items);
  const mergedTaxPercents = Object.keys({
    ...grouped.cgst,
    ...grouped.sgst,
  }).filter((p) => parseFloat(p) > 0);

  const formatNumber = (num) =>
    Number(num || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  // console.log(terms)
  const goBackToInvoices = () => {
    nav("/invoices");
  };
  return (
    <div>
      <div
        className="sticky top-[88px]
      w-full sm:w-[90%] md:w-full lg:w-full 
      z-100 rounded-lg bg-white border-g border-gray-300 py-4 -mt-15 shadow-sm"
      >
        <div className="">
          <div className="flex justify-between">
            <div className="px-4 py-2">
              <ArrowLeft
                strokeWidth={1}
                onClick={goBackToInvoices}
                className="text-black cursor-pointer"
              />
            </div>
            <div className="flex flex-wrap justify-end  mr-5 gap-2 ">
              <button 
             onClick={handlePrint}
              
              className="px-4 py-2 cursor-pointer bg-gray-600 text-white rounded-lg hover:bg-gray-700 w-full sm:w-auto">
                🖨️ Print / Downlaod Invoice
              </button>
             
             
              
             
            </div>
          </div>
        </div>
      </div>
    <div className="py-10">
      {/* <button
        type="button"
        onClick={handlePrint}
        className="px-3 py-2 right-0 mt-4 rounded-sm absolute bg-blue-600 text-white"
      >
        Print Generated Invoice
      </button> */}

      <div
        ref={componentRef}
        className="py-1  rounded-none mt-4 mx-auto print-area"
        style={{ width: "210mm", height:"273mm", boxSizing: "border-box" }}
      >
        <div className="border relative border-gray-400">
        <div className="flex justify-between border-b-2 border-gray-300">
          <div className="flex gap-1">
            <div className="w-60 px-4 flex justify-center items-center">
              <img src={invoiceData.company_logo} />
            </div>
            <div>
              <div>
                <p className="text-black font-bold text-lg">
                  {invoiceData?.company_name}
                </p>
                <p className="text-black w-72 text-md">
                  {invoiceData?.company_address}
                </p>
                <p className="text-black w-72 text-md">
                  GSTIN {invoiceData?.gstIN}
                </p>
                <p className="text-black w-72 text-md">
                  {invoiceData?.company_email}
                </p>
              </div>
            </div>
          </div>
          <div className="">
            <p className="text-black font-semibold text-2xl mt-28 mr-2">
              TAX INVOICE
            </p>
          </div>
        </div>
        {/* <hr className=" text-gray-300 text-xl" /> */}
        <div className="flex px-2 w-full border-b-2 border-gray-300">
          <div className="text-black flex w-1/2 pr-4 border-r-2  border-gray-300">
            <div className="w-1/2 pb-2">
              <p className="text-sm">Invoice No</p>
              <p className="text-sm">Invoice Date</p>
              <p className="text-sm">Terms</p>
              <p className="text-sm">Due Date</p>
              <p className="text-sm">P.O.N</p>
            </div>
            <div className="w-1/2">
              <p className="font-bold text-sm">
                : {invoiceData?.invoice_number}
              </p>
              <p className="font-bold text-sm">: {invoiceData?.invoice_date}</p>
              <p className="font-bold text-sm">
                : {invoiceData?.invoice_terms}
              </p>
              <p className="font-bold text-sm">
                : {invoiceData?.invoice_dueDate}
              </p>
              <p className="font-bold text-sm">: {invoiceData?.po_number}</p>
            </div>
          </div>

          <div className="text-black flex w-1/2 pl-4">
            <div className="w-1/2">
              <p className="text-sm">Place Of Supply</p>
            </div>
            <div className="w-1/2">
              <p className="font-bold text-sm">
                : {invoiceData?.place_of_supply}
              </p>
            </div>
          </div>
        </div>

        {/* <hr className=" text-gray-300 text-xl" /> */}
        <div className="flex w-full border-b-2 border-gray-300 ">
          <div className="text-black flex flex-col w-1/2 border-r-2 border-gray-300">
            <div className="bg-gray-200 px-2 border-b-2 border-gray-300 font-bold text-sm">
              Bill To
            </div>
            <div className="w-1/2 pb-2 px-2 py-1">
              <p className="font-bold capitalize text-sm">
                {invoiceData?.billcustomer_name}
              </p>
              <p className="text-sm">{invoiceData?.billcustomer_address}</p>
              <p className="text-sm">GSTIN {invoiceData.billcustomer_gstin}</p>
            </div>
          </div>

          <div className="text-black flex flex-col w-1/2  ">
            <div className="bg-gray-200 px-2 border-b-2 border-gray-300 font-bold text-sm">
              Ship To
            </div>

            <div className="w-1/2 pb-2 px-2 py-1">
              <p className=" capitalize text-sm">
                {invoiceData?.billcustomer_name}
              </p>
              <p className="text-sm">{invoiceData?.billcustomer_address}</p>
              <p className="text-sm">GSTIN {invoiceData.billcustomer_gstin}</p>
            </div>
          </div>
        </div>
        <div className="text-black border-b-2 border-gray-300 px-3 py-2">
          <p className="text-sm">Subject :</p>
          <p className="text-sm">{invoiceData?.subject}</p>
        </div>

        {/* <hr className=" text-gray-300 text-xl" /> */}

        <table className="w-full border border-gray-300 border-b-2 border-collapse text-sm">
          <thead className="bg-gray-100 text-black">
            <tr >
              <th
                rowSpan="2"
                className="border border-gray-300 px-3 text-center"
              >
                Sl No
              </th>
              <th
                rowSpan="2"
                className="border border-gray-300 px-3 text-left"
              >
                Item & Description
              </th>
              <th
                rowSpan="2"
                className="border border-gray-300 px-3 text-center"
              >
                Hour
              </th>
              <th
                rowSpan="2"
                className="border border-gray-300 px-3  text-center"
              >
                Rate
              </th>
              <th
                colSpan="2"
                className="border border-gray-300 px-3 text-center"
              >
                CGST
              </th>
              <th
                colSpan="2"
                className="border border-gray-300 px-3  text-center"
              >
                SGST
              </th>
              <th
                rowSpan="2"
                className="border border-gray-300 px-3  text-center"
              >
                Amount
              </th>
            </tr>
            <tr>
              <th className="border border-gray-300 px-3  text-center">
                %
              </th>
              <th className="border border-gray-300 px-3 text-center">
                Amt
              </th>
              <th className="border border-gray-300 px-3 text-center">
                %
              </th>
              <th className="border border-gray-300 px-3  text-center">
                Amt
              </th>
            </tr>
          </thead>

          <tbody>
            {invoiceData.items?.map((item, index) => (
              <tr
                key={index}
                className="hover:bg-gray-50 transition text-black"
              >
                <td className="border border-gray-300 px-3 text-center">
                  {index + 1}
                </td>
                <td className="border border-gray-300 px-3 ">
                  {item?.description}
                </td>
                <td className="border border-gray-300 px-3 text-center">
                  {item?.hours}
                </td>
                <td className="border border-gray-300 px-3  text-center">
                  {item?.rate}
                </td>

                {/* CGST */}
                <td className="border border-gray-300 px-3  text-center">
                  {item.cgst?.cgstPercent || "0.00"}
                </td>
                <td className="border border-gray-300 px-3  text-right text-gray-700">
                  {item.cgst?.cgstAmount || "0.00"}
                </td>

                {/* SGST */}
                <td className="border border-gray-300 px-3  text-center">
                  {item.sgst?.sgstPercent || "0.00"}
                </td>
                <td className="border border-gray-300 px-3  text-right text-gray-700">
                  {item.sgst?.sgstAmount || "0.00"}
                </td>

                <td className="border border-gray-300 px-3 py-1 text-right font-semibold text-gray-800">
                  {item.itemTotal || "0.00"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between">
          <div className="flex flex-col py-2 px-2">
            <div className="text-black  ">
              <p className="text-sm">Total in words</p>
              <p className="font-bold text-xs">
                {toWords.convert(invoiceData.total)}
              </p>
            </div>
            <div className="text-black text-sm py-2">
              <p>Note:-</p>
              <p>{invoiceData?.notes}</p>
            </div>
            <div className=" text-black text-sm">
              <h3 className="text-sm text-black font-bold">
                {bankDetails.title}
              </h3>

              <div className=" leading-5">
                {bankDetails.fields.map((item, index) => (
                  <div key={index}>
                    <span className="font-bold text-sm">{item.label} :</span>
                    <span className="ml-1 text-sm">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="py-2">
               <div>
        <h3 className="text-sm  text-black mb-1">Terms & Conditions</h3>

        <ol className="list-decimal px-4 text-sm leading-5 text-black">
          {terms?.map((term, i) => (
            <li key={i} >{term}</li>
          ))}
        </ol>
      </div>
            </div>
          </div>
          <div className="w-[500px]">
            <div className="px-4 border  border-gray-300 text-black">
              <h3 className="text-lg font-semibold">Totals Summary</h3>
              <div className="text-sm px-1">
                {/* Sub Total */}
                <div className="flex justify-between py-1  text-sm">
                  <span className="">Sub Total</span>
                  <span>₹ {formatNumber(invoiceData.subTotal)}</span>
                </div>

                {/* Dynamic CGST & SGST */}
                {mergedTaxPercents.map((percent) => (
                  <React.Fragment key={percent}>
                    {grouped.cgst[percent] !== undefined && (
                      <div className="flex justify-between py-1 text-sm">
                        <span className="">CGST ({percent}%)</span>
                        <span>₹ {formatNumber(grouped.cgst[percent])}</span>
                      </div>
                    )}

                    {grouped.sgst[percent] !== undefined && (
                      <div className="flex justify-between py-1 text-sm">
                        <span className="text-sm">SGST ({percent}%)</span>
                        <span>₹ {formatNumber(grouped.sgst[percent])}</span>
                      </div>
                    )}
                  </React.Fragment>
                ))}

                {/* Total */}
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>₹ {formatNumber(invoiceData.total)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Balance Due</span>
                  <span>₹ {formatNumber(invoiceData.total)}</span>
                </div>
              </div>
            </div>
            <div className="px-4 border h-30 flex flex-col border-gray-300 text-black">
              <div className="flex justify-center py-3">
                <p className="text-sm">For FessiT Solutions Private Limited</p>
              </div>
              <div className="flex justify-center py-10">
                <p className="text-sm">Authorized Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
    </div>
  );
}
