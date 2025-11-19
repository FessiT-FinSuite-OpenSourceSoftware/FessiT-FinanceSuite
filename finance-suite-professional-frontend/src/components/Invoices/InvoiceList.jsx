import React, { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { KeyUri, config } from "../../shared/key";

// 🔑 Helper to safely extract Mongo ObjectId as string
const getInvoiceId = (invoice) => {
  if (!invoice) return "";

  // If backend already sends `id` as a plain string
  if (typeof invoice.id === "string") return invoice.id;

  // Mongo style: _id as string or as { $oid: "..." }
  if (invoice._id) {
    if (typeof invoice._id === "string") return invoice._id;
    if (
      typeof invoice._id === "object" &&
      invoice._id !== null &&
      typeof invoice._id.$oid === "string"
    ) {
      return invoice._id.$oid;
    }
  }

  return "";
};

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔽 controls the Domestic / International dropdown
  const [showInvoiceOptions, setShowInvoiceOptions] = useState(false);

  const nav = useNavigate();
  const itemsPerPage = 5;

  // Fetch invoices from backend on mount
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${KeyUri.BACKENDURI}/invoices`);
        if (!res.ok) {
          throw new Error("Failed to load invoices");
        }

        const data = await res.json();
        setInvoices(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError(err.message || "Something went wrong while loading invoices");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  // Reset to first page whenever filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Overdue":
        return "bg-red-100 text-red-800";
      case "Draft":
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Navigate helpers
  const createDomesticInvoice = () => {
    setShowInvoiceOptions(false);
    nav("/invoices/addInvoice?type=domestic");
  };

  const createInternationalInvoice = () => {
    setShowInvoiceOptions(false);
    nav("/invoices/addInvoice?type=international");
  };

  const onEdit = (id) => {
    nav(`/invoices/editInvoice/${id}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;

    try {
      const res = await fetch(`${KeyUri.BACKENDURI}/invoices/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete invoice");
      }

      // Update local state
      setInvoices((prev) => prev.filter((inv) => getInvoiceId(inv) !== id));
    } catch (err) {
      console.error(err);
      alert(err.message || "Something went wrong while deleting invoice");
    }
  };

  // 🔍 Filtering logic
  const filteredInvoices = invoices.filter((invoice) => {
    const invoiceNumber = (invoice.invoice_number || "").toLowerCase();
    const companyName = (invoice.company_name || "").toLowerCase();
    const customerName = (
      invoice.billcustomer_name ||
      invoice.customer_name ||
      ""
    ).toLowerCase();

    const matchesSearch =
      invoiceNumber.includes(searchTerm.toLowerCase()) ||
      companyName.includes(searchTerm.toLowerCase()) ||
      customerName.includes(searchTerm.toLowerCase());

    const status = invoice.status || "Draft";
    const matchesStatus = statusFilter === "All" || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // 📄 Pagination
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentInvoices = filteredInvoices.slice(startIndex, endIndex);

  // Stats
  const countByStatus = (status) =>
    invoices.filter((i) => (i.status || "Draft") === status).length;

  return (
    <div>
      <div className="max-w-7xl lg:w-full md:w-full ">
        {/* Action Bar */}
        <div className="sticky top-[88px] z-100 rounded-lg bg-white border-g border-gray-300 py-4 -mt-15 shadow-sm mb-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by invoice number, customer, or company..."
                className="w-full ml-2 pl-10 pr-4 py-2 border border-gray-700 rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter + Create Invoice dropdown */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-grey-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="Draft">Draft</option>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>

              {/* Create Invoice dropdown (Domestic / International) */}
              <div className="relative">
                <button
                  onClick={() =>
                    setShowInvoiceOptions((prev) => !prev)
                  }
                  className="flex cursor-pointer items-center mr-2 gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Create Invoice</span>
                </button>

                {showInvoiceOptions && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <button
                      onClick={createDomesticInvoice}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      🏠 Domestic Invoice
                    </button>
                    <button
                      onClick={createInternationalInvoice}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      🌍 International Invoice
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Loading / Error states */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
            <p className="text-gray-600">Loading invoices...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Total Invoices</p>
            <p className="text-2xl font-bold text-gray-900">
              {invoices.length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Paid</p>
            <p className="text-2xl font-bold text-green-600">
              {countByStatus("Paid")}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              {countByStatus("Pending")}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Overdue</p>
            <p className="text-2xl font-bold text-red-600">
              {countByStatus("Overdue")}
            </p>
          </div>
        </div>

        {/* Invoice Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Invoice No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Customer
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentInvoices.length > 0 ? (
                  currentInvoices.map((invoice) => {
                    const id = getInvoiceId(invoice);
                    const customerName =
                      invoice.billcustomer_name ||
                      invoice.customer_name ||
                      "";
                    const invoiceDate =
                      invoice.invoice_date || invoice.date || "";
                    const dueDate =
                      invoice.invoice_dueDate || invoice.due_date || "";

                    return (
                      <tr
                        key={id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td
                          className="px-6 py-4 whitespace-nowrap text-blue-600 font-medium cursor-pointer"
                          onClick={() => onEdit(id)}
                        >
                          {invoice.invoice_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {customerName}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                          {invoiceDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                          {dueDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold">
                          ₹{Number(invoice.total || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                              invoice.status || "Draft"
                            )}`}
                          >
                            {invoice.status || "Draft"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onEdit(id)}
                              className="cursor-pointer text-gray-600 hover:text-green-600 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(id)}
                              className="text-gray-600 cursor-pointer hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      {loading
                        ? "Loading..."
                        : "No invoices found. Try creating one."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredInvoices.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Showing {startIndex + 1} to{" "}
                {Math.min(endIndex, filteredInvoices.length)} of{" "}
                {filteredInvoices.length} results
              </p>
              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, index) => (
                  <button
                    key={index + 1}
                    onClick={() => setCurrentPage(index + 1)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === index + 1
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
