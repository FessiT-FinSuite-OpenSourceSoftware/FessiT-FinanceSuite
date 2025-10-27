import React, { useCallback, useRef, useState } from "react";
import { Filter, Search } from "lucide-react";


 const recentInvoices = [
    {
      id: "INV-2024-001",
      client: "Acme Corp Pvt Ltd",
      amount: 85000,
      status: "Paid",
      date: "15 Oct 2024",
      gst: 15300,
    },
    {
      id: "INV-2024-002",
      client: "TechStart Solutions",
      amount: 125000,
      status: "Pending",
      date: "18 Oct 2024",
      gst: 22500,
    },
    {
      id: "INV-2024-003",
      client: "Global Imports Ltd",
      amount: 65000,
      status: "Overdue",
      date: "10 Oct 2024",
      gst: 11700,
    },
    {
      id: "INV-2024-004",
      client: "Metro Enterprises",
      amount: 95000,
      status: "Paid",
      date: "20 Oct 2024",
      gst: 17100,
    },
  ];


export default function RecentInvoices() {
  const [filteredInvoices, setFilteredInvoices] = useState(recentInvoices);
  const [searchTerm, setSearchTerm] = useState("");
  const debounceTimer = useRef(null)
 

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

 const handleSearch =useCallback((query)=>{
  // console.log("first")
   const filtered = recentInvoices?.filter((invoice) => invoice?.client.toLowerCase().includes(query.toLowerCase())
  // || invoice?.status.toLowerCase().includes(query.toLowerCase())
  );
   setFilteredInvoices(filtered);
   
 },[])

  const handleChange = (e) => {
    setSearchTerm(e.target.value);
    if(debounceTimer.current){
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => 
      handleSearch(e.target.value), 1000);
    
    }
  
  

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Recent Invoices
            </h3>
            <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
              View All
            </button>
          </div>
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search invoices..."
                onChange={handleChange}
                value={searchTerm}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2">
              <Filter size={18} />
              <span>Filter</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GST
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvoices?.map((invoice) => (
                <tr
                  key={invoice?.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invoice?.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {invoice?.client}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    ₹{invoice?.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    ₹{invoice?.gst.toLocaleString("en-IN")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {invoice?.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                        invoice?.status
                      )}`}
                    >
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-indigo-600 hover:text-indigo-800 font-medium">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
