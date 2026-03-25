import React, { useEffect, useMemo, useRef, useState } from "react";
import { Filter, Search } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { fetchInvoiceData, invoiceSelector } from "../../ReduxApi/invoice";
import { useNavigate } from "react-router-dom";

export default function RecentInvoices() {
  const dispatch = useDispatch();
  const { invoiceData } = useSelector(invoiceSelector);
  const nav = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    dispatch(fetchInvoiceData());
  }, [dispatch]);

  /* Show last 5 invoices by default */
  useEffect(() => {
    if (invoiceData?.length) {
      const lastFive = [...invoiceData].slice(-5).reverse();
      setFilteredInvoices(lastFive);
    }
  }, [invoiceData]);

  /* Search logic */
  const handleSearch = (query) => {
    if (!query) {
      const lastFive = [...invoiceData].slice(-5).reverse();
      setFilteredInvoices(lastFive);
      return;
    }

    const filtered = invoiceData.filter((invoice) => {
      const name = invoice?.company_name?.toLowerCase() || "";
      const inv = invoice?.invoice_number?.toLowerCase() || "";

      return (
        name.includes(query.toLowerCase()) ||
        inv.includes(query.toLowerCase())
      );
    });

    setFilteredInvoices(filtered);
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      handleSearch(value);
    }, 600);
  };

  /* Status Colors */
  const getStatusColor = (status) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800 border-green-200";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Overdue":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  /* GST Calculation */
  const calculateGST = (invoice) => {
    if (invoice?.invoice_type === "domestic") {
      const cgst = Number(invoice?.totalcgst || 0);
      const sgst = Number(invoice?.totalsgst || 0);
      return (cgst + sgst).toFixed(2);
    }

    return Number(invoice?.totaligst || 0).toFixed(2);
  };

  /* Get Safe Invoice ID */
  const getInvoiceId = (invoice) => {
    if (!invoice) return "";

    if (typeof invoice.id === "string") return invoice.id;

    if (invoice._id) {
      if (typeof invoice._id === "string") return invoice._id;
      if (invoice._id?.$oid) return invoice._id.$oid;
    }

    return "";
  };

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Recent Invoices
            </h3>

            <button className="text-indigo-600 hover:text-indigo-700 text-sm cursor-pointer font-medium" onClick={()=>{
              nav(`/invoices`)
            }}>
              View All
            </button>
          </div>

          {/* Search */}
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />

              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2">
              <Filter size={18} />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Invoice ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  GST
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvoices?.map((invoice) => {
                const invoiceId = getInvoiceId(invoice);

                return (
                  <tr
                    key={invoiceId}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {invoice?.invoice_number}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700">
                      {invoice?.company_name}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      ₹ {Number(invoice?.total || 0).toFixed(2)}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      ₹ {calculateGST(invoice)}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {invoice?.invoice_date}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                          invoice?.status
                        )}`}
                      >
                        {invoice?.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() =>
                          nav(`/invoices/editinvoice/${invoiceId}`)
                        }
                        className="text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!filteredInvoices?.length && (
                <tr>
                  <td
                    colSpan="7"
                    className="text-center py-6 text-gray-500 text-sm"
                  >
                    No invoices found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}