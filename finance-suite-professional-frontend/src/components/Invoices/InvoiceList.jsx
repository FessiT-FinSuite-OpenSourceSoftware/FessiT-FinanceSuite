import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Download,
  Mail,
  Filter,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

// Sample invoice data - replace with your actual data/API call
const sampleInvoices = [
  {
    id: 1,
    invoice_number: "INV-2024-001",
    company_name: "Acme Corporation",
    customer_name: "John Doe",
    invoice_date: "2024-01-15",
    due_date: "2024-02-15",
    total: 15000,
    status: "Paid",
  },
  {
    id: 2,
    invoice_number: "INV-2024-002",
    company_name: "Tech Solutions",
    customer_name: "Jane Smith",
    invoice_date: "2024-01-20",
    due_date: "2024-02-20",
    total: 25000,
    status: "Pending",
  },
  {
    id: 3,
    invoice_number: "INV-2024-003",
    company_name: "Digital Ventures",
    customer_name: "Bob Johnson",
    invoice_date: "2024-01-25",
    due_date: "2024-02-25",
    total: 18500,
    status: "Overdue",
  },
  {
    id: 4,
    invoice_number: "INV-2024-004",
    company_name: "Innovation Labs",
    customer_name: "Alice Williams",
    invoice_date: "2024-02-01",
    due_date: "2024-03-01",
    total: 32000,
    status: "Paid",
  },
  {
    id: 5,
    invoice_number: "INV-2024-005",
    company_name: "Creative Studios",
    customer_name: "Charlie Brown",
    invoice_date: "2024-02-10",
    due_date: "2024-03-10",
    total: 12500,
    status: "Pending",
  },
  {
    id: 6,
    invoice_number: "INV-2024-006",
    company_name: "Global Enterprises",
    customer_name: "David Miller",
    invoice_date: "2024-02-15",
    due_date: "2024-03-15",
    total: 45000,
    status: "Draft",
  },
  {
    id: 7,
    invoice_number: "INV-2024-007",
    company_name: "Smart Solutions",
    customer_name: "Emma Davis",
    invoice_date: "2024-02-20",
    due_date: "2024-03-20",
    total: 28000,
    status: "Pending",
  },
  {
    id: 8,
    invoice_number: "INV-2024-008",
    company_name: "Future Tech",
    customer_name: "Frank Wilson",
    invoice_date: "2024-02-25",
    due_date: "2024-03-25",
    total: 19500,
    status: "Paid",
  },
];

export default function InvoiceList() {
  const [invoices] = useState(sampleInvoices);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const { id } = useParams();
  const nav = useNavigate();
  const itemsPerPage = 5;

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.company_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentInvoices = filteredInvoices.slice(startIndex, endIndex);

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
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const onCreateNew = () => {
    nav("/invoices/addInvoice");
  };

  const onEdit = (id) => {
    nav(`/invoices/editInvoice/${id}`);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      console.log("Delete invoice:", id);
    }
  };

  return (
    <div>
      <div className="max-w-7xl mx-auto">
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

            {/* Filter and Create Button */}
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

              {/* ✅ Create Invoice triggers invoice.jsx */}
              <button
                onClick={onCreateNew}
                className="flex cursor-pointer items-center mr-2 gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Create Invoice</span>
              </button>
            </div>
          </div>
        </div>

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
              {invoices.filter((i) => i.status === "Paid").length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              {invoices.filter((i) => i.status === "Pending").length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Overdue</p>
            <p className="text-2xl font-bold text-red-600">
              {invoices.filter((i) => i.status === "Overdue").length}
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Company
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
                  currentInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td
                        className="px-6 py-4 whitespace-nowrap text-blue-600 font-medium cursor-pointer"
                        onClick={() => onEdit(invoice.id)}
                      >
                        {invoice.invoice_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {invoice.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        {invoice.company_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                        {invoice.invoice_date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                        {invoice.due_date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold">
                        ₹{invoice.total.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            invoice.status
                          )}`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onEdit(invoice.id)}
                            className="cursor-pointer text-gray-600 hover:text-green-600 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(invoice.id)}
                            className="text-gray-600 cursor-pointer hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No invoices found
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
