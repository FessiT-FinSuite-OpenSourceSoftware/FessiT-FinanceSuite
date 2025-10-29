import React, { useState } from "react";

const initialInvoiceData = {
  company_name: "",
  gstIN: "",
  company_address: "",
  company_phone: "",
  company_email: "",
  invoice_number: "",
  invoice_date: "",
  invoice_dueDate: "",
  invoice_terms: "Due on receipt",
  po_number: "",
  place_of_supply: "",
  billcustomer_name:"",
  billcustomer_address:"",
  billcustomer_gstin:"",
  shipcustomer_name:"",
  shipcustomer_address:"",
  shipcustomer_gstin:"",
  subject:"",
  notes:"",
  subTotal:"",
  cgst:"",
  sgst:"",
  total:"",

};
export default function Inoice() {
  
  const [invoiceData, setInvoiceData] = useState(initialInvoiceData);
  // const [inputErrors, setInputErrors] = useState({});


  const handleChange = (e) => {
    const { name, value } = e.target;
    setInvoiceData({ ...invoiceData, [name]: value });
  };
  
  const invoiceDataSubmit = (e)=>{
    e.preventDefault()
    
    console.log(invoiceData)
    localStorage.setItem("invoiceTesting",JSON.stringify(invoiceData))
    
    setInvoiceData(initialInvoiceData)
  }

  return (
    <div>
      <div 
      // className="sticky top-20 z-10"
      >
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Invoice Generator</h1>
        <div className="flex space-x-2">
          <button 
        
          className="px-4 py-2 cursor-pointer bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          onClick={invoiceDataSubmit}
          >
            💾 Save
          </button>
          <button className=" cursor-pointer px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            ⬇️ Download
          </button>
          <button className="cursor-pointer px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
            🖨️ Print
          </button>
          <button className="cursor-pointer px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            ✉️ Email
          </button>
        </div>
      </div>
      </div>
      <div>
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* <!-- Company Details --> */}
          {/* <form> */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
            Company Details
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.company_name}
                name="company_name"
                placeholder="Enter company name"
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                GSTIN
              </label>
              <input
                type="text"
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.gstIN}
                name="gstIN"
                placeholder="Enter GSTIN"
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Address
              </label>
              <textarea
                placeholder="Enter company address"
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 h-20 placeholder:text-gray-400"
                name="company_address"
                value={invoiceData.company_address}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="text"
                placeholder="Enter phone number"
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.company_phone}
                name="company_phone"
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="Enter email"
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.company_email}
                name="company_email"
                onChange={handleChange}
              />
            </div>
          </div>

          {/* <!-- Invoice Details --> */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-gray-300">
            Invoice Details
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Invoice No
              </label>
              <input
                type="text"
                placeholder="Enter invoice number"
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.invoice_number}
                name="invoice_number"
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                placeholder="dd-mm-yyyy"
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.invoice_date}
                name="invoice_date"
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                placeholder="dd-mm-yyyy"
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.invoice_dueDate}
                name="invoice_dueDate"
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Terms
              </label>
              <input
                type="text"
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.invoice_terms}
                name="invoice_terms"
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                P.O. No
              </label>
              <input
                type="text"
                placeholder="Enter P.O.NO"
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.po_number}
                name="po_number"
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Place of Supply
              </label>
              <input
                type="text"
                placeholder="Enter place of supply"
               className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.place_of_supply}
                name="place_of_supply"
                onChange={handleChange}
              />
            </div>
          </div>

          {/* <!-- Bill To / Ship To --> */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-gray-300">
            Customer Details
          </h2>
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2 text-sm">
                Bill To
              </h3>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                placeholder="Enter customer name"
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.billcustomer_name}
                name="billcustomer_name"
                onChange={handleChange}

              />
              <label className="block text-xs font-semibold text-gray-600 mt-2 mb-1">
                Address
              </label>
              <textarea  type="text"
                placeholder="Enter address"
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400 h-20"
                value={invoiceData.billcustomer_address}
                name="billcustomer_address"
                onChange={handleChange}
                />
              <label className="block text-xs font-semibold text-gray-600 mt-2 mb-1">
                GSTIN
              </label>
              <input
                type="text"
                placeholder="Enter GSTIN"
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.billcustomer_gstin}
                name="billcustomer_gstin"
                onChange={handleChange}
              />
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2 text-sm">
                Ship To
              </h3>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                placeholder="Enter customer name"
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.shipcustomer_name}
                name="shipcustomer_name"
                onChange={handleChange}
              />
              <label className="block text-xs font-semibold text-gray-600 mt-2 mb-1">
                Address
              </label>
              <textarea 
              type="text"
                placeholder="Enter address"
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400 h-20"
                value={invoiceData.shipcustomer_address}
                name="shipcustomer_address"
                onChange={handleChange}
              />
              <label className="block text-xs font-semibold text-gray-600 mt-2 mb-1">
                GSTIN
              </label>
              <input
                type="text"
                placeholder="Enter GSTIN"
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.shipcustomer_gstin}
                name="shipcustomer_gstin"
                onChange={handleChange}
              />
            </div>
          </div>

          {/* <!-- Subject --> */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              placeholder="Enter subject"
              className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
              value={invoiceData.subject}
              name="subject"
              onChange={handleChange}
            />
          </div>

          {/* <!-- Items Table --> */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-gray-300">
            Items
          </h2>
          <table className="w-full border-collapse border border-gray-300 text-sm mb-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-3 py-2">Sl No</th>
                <th className="border border-gray-300 px-3 py-2">
                  Description
                </th>
                <th className="border border-gray-300 px-3 py-2">Hours</th>
                <th className="border border-gray-300 px-3 py-2">Rate</th>
                <th className="border border-gray-300 px-3 py-2">CGST %</th>
                <th className="border border-gray-300 px-3 py-2">SGST %</th>
              </tr>
            </thead>
            {/* <tbody>
              <tr>
                <td className="border border-gray-300 px-3 py-2 text-center">
                  1
                </td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="text"
                    className="border border-gray-300 rounded px-2 py-1 w-full"
                    value="Check Connectivity {Web Server}"
                  />
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center">
                  <input
                    type="number"
                    className="border border-gray-300 rounded px-2 py-1 w-20 text-right"
                    value="9.00"
                  />
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  <input
                    type="number"
                    className="border border-gray-300 rounded px-2 py-1 w-24 text-right"
                    value="2118.64"
                  />
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center">
                  <input
                    type="number"
                    className="border border-gray-300 rounded px-2 py-1 w-16 text-center"
                    value="9"
                  />
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center">
                  <input
                    type="number"
                    className="border border-gray-300 rounded px-2 py-1 w-16 text-center"
                    value="9"
                  />
                </td>
              </tr>
            </tbody> */}
          </table>

          {/* <!-- Totals --> */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-gray-300">
            Totals
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div></div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">Sub Total</span>
                <input
                  type="text"
                  className="border border-gray-300 rounded px-2 py-1 w-32 text-right"
                  value={invoiceData.subTotal}
                  name="total"
                  disabled

                />
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">CGST (9%)</span>
                <input
                  type="text"
                  className="border border-gray-300 rounded px-2 py-1 w-32 text-right"
                  value={invoiceData.cgst}
                  name="total"
                  disabled

                />
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">SGST (9%)</span>
                <input
                  type="text"
                  className="border border-gray-300 rounded px-2 py-1 w-32 text-right"
                  value={invoiceData.sgst}
                  name="total"
                  disabled

                />
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-gray-400 pt-2">
                <span>Total</span>
                <input
                  type="text"
                  
                  className="border border-gray-300 rounded px-2 py-1 w-32 
             text-right font-bold text-indigo-700"
                  value={invoiceData.total}
                  name="total"
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Notes
            </label>
            <textarea 
                type="text"
                placeholder="Enter note"
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400 h-20"
                value={invoiceData.notes}
                name="notes"
                onChange={handleChange}
            />
          </div>

          {/* Signature */}
          <div className="flex justify-end mt-8">
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700 mb-16">
                For FessiT Solutions Private Limited
              </p>
              <div className="border-t border-gray-400 pt-2 ">
                <p className="text-sm text-gray-600">Authorized Signature</p>
              </div>
            </div>
          </div>
        {/* </form> */}
        </div>
      </div>
      
    </div>
  );
}
