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
import { useSelector, useDispatch } from "react-redux";
import {
  fetchCustomerData,
  customerSelector,
  deleteCustomer,
} from "../../ReduxApi/customer";

// Sample invoice data - replace with your actual data/API call
const sampleCustomers = [
  {
    id: 1,
    invoice_number: "INV-2024-001",
    company_name: "Acme Corporation",
    customer_name: "John Doe",
    invoice_date: "2024-01-15",
    due_date: "2024-02-15",
    total: 15000,
    status: "Active",
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
    status: "Active",
  },
  {
    id: 4,
    invoice_number: "INV-2024-004",
    company_name: "Innovation Labs",
    customer_name: "Alice Williams",
    invoice_date: "2024-02-01",
    due_date: "2024-03-01",
    total: 32000,
    status: "Active",
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
    status: "Pending",
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
    status: "New",
  },
];

export default function CustomerList() {
  const { customersData } = useSelector(customerSelector);

  // const [customers,setCustomers] = useState(customersData);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAction, setShowAction] = useState(null);
  const [page,setPage] = useState(5)
  const { id } = useParams();
  const dispatch = useDispatch();
  const nav = useNavigate();
  const itemsPerPage = page;

  const filteredCustomers = customersData.filter((item) => {
    const matchesSearch =
      item.gstIN.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.companyName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || item.isActive === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCustomer = filteredCustomers.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    dispatch(fetchCustomerData());
  }, [dispatch]);

  const getStatusColor = (status) => {
    // console.log(status)
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "New":
        return "bg-red-100 text-red-800";
      case "Draft":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const onCreateNew = () => {
    nav("/customers/addCustomer");
  };

  const onEdit = (id) => {
    nav(`/customers/editCustomer/${id}`);
  };

  const onView = (id) => {
    nav(`/customers/cutomer/${id}`);
    console.log(id);
  };
  const handleDelete = (id) => {
    console.log(id);
    dispatch(deleteCustomer(id));
  };
  console.log(customersData);
  const onSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const onShowAction = (id, e) => {
    e.stopPropagation();
    setShowAction((prev) => (prev === id ? null : id));
  };

  const onPageItemSet = (e)=>{
    setPage(e.target.value)
  }

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
                placeholder="Search by customer, or company..."
                className="w-full ml-2 pl-10 pr-4 py-2 border border-gray-700 rounded-lg"
                value={searchTerm}
                onChange={onSearchChange}
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
                  <option value="New">New</option>

                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              {/* ✅ Create Customer triggers invoice.jsx */}
              <button
                onClick={onCreateNew}
                className="flex cursor-pointer items-center mr-2 gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Create Customer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Total Customers</p>
            <p className="text-2xl font-bold text-gray-900">
              {customersData.length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {customersData.filter((i) => i.isActive === "Active").length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              {customersData.filter((i) => i.isActive === "Pending").length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">New Entry</p>
            <p className="text-2xl font-bold text-red-600">
              {customersData.filter((i) => i.isActive === "New").length}
            </p>
          </div>
        </div>

        {/* Customer Table */}
        <div className="bg-white h-72 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    GSTIN
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
                {currentCustomer?.length > 0 ? (
                  currentCustomer?.map((item) => (
                    <tr
                      key={item?._id?.$oid}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td
                        className="px-6 py-4 capitalize whitespace-nowrap text-blue-600 font-medium cursor-pointer"
                        onClick={() => onView(item?._id?.$oid)}
                      >
                        {item?.customerName}
                      </td>
                      <td className="px-6 py-4 capitalize whitespace-nowrap">
                        {item?.companyName}
                      </td>
                      <td className="px-6 py-4 capitalize whitespace-nowrap hidden md:table-cell">
                        {item?.gstIN}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 capitalize text-xs font-semibold rounded-full ${getStatusColor(
                            item?.isActive
                          )}`}
                        >
                          {item?.isActive}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-3 ">
                        
                          <div>
                            <button
                             
                              className="cursor-pointer text-gray-600 hover:text-green-600 transition-colors"
                              title="Edit"
                            >
                              <Edit2
                                className="w-4 h-4"
                                onClick={() => onEdit(item?._id?.$oid)}
                              />
                            </button>
                          </div>
                          <div className="relative">
                            <button
                              
                              onClick={(e) => onShowAction(item?._id?.$oid, e)}
                              className="text-gray-600 cursor-pointer hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            {showAction === item?._id?.$oid && (
                              <div className="absolute right-5 top-1/2 -translate-y-1/2 bg-white shadow-xl border border-gray-200 rounded-lg p-5  z-50">
                                <div className="text-center ">
                                 <div className="">
                                   <p className="text-gray-800 font-sm">
                                     Are you sure you want to delete <span className="font-bold capitalize">{item?.customerName}</span> ?
                                  </p>
                                 </div>
                                  <div className="flex justify-end gap-3 mt-4">
                                    <button
                                      onClick={() => setShowAction(null)}
                                      className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDelete(item._id?.$oid)
                                      }
                                      className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition shadow-sm"
                                    >
                                      Confirm
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
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
                      No customers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}

        </div>
                  {filteredCustomers?.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Showing {startIndex + 1} to{" "}
                {Math.min(endIndex, filteredCustomers?.length)} of{" "}
                {filteredCustomers?.length} results
              </p>
              <div>
                <select
                onChange={onPageItemSet}
                // value={page?page:""}
                className="bg-gray-200 text-sm px-2 py-2 rounded-sm w-44"
                >
                 <option value={page}>All</option>
                 <option value={1}>One</option>
                 <option value={2}>Two</option>
                 <option value={3}>Three</option>
                 



                </select>
              </div>
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
  );
}
