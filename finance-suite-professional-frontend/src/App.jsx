import React, { useState } from 'react';
import { FileText, ShoppingCart, Receipt, TrendingUp, Users, Settings, Plus, Download, Filter, Search, IndianRupee, Bell, Menu, X } from 'lucide-react';

const FinanceSuiteDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const stats = [
    { label: 'Total Revenue', value: '₹12,45,680', change: '+12.5%', trend: 'up', icon: TrendingUp },
    { label: 'Pending Invoices', value: '23', change: '₹4,23,450', trend: 'neutral', icon: FileText },
    { label: 'GST Payable', value: '₹89,234', change: 'Due: 20 Oct', trend: 'warning', icon: Receipt },
    { label: 'TDS Deducted', value: '₹45,600', change: 'This Month', trend: 'neutral', icon: IndianRupee },
  ];

  const recentInvoices = [
    { id: 'INV-2024-001', client: 'Acme Corp Pvt Ltd', amount: 85000, status: 'Paid', date: '15 Oct 2024', gst: 15300 },
    { id: 'INV-2024-002', client: 'TechStart Solutions', amount: 125000, status: 'Pending', date: '18 Oct 2024', gst: 22500 },
    { id: 'INV-2024-003', client: 'Global Imports Ltd', amount: 65000, status: 'Overdue', date: '10 Oct 2024', gst: 11700 },
    { id: 'INV-2024-004', client: 'Metro Enterprises', amount: 95000, status: 'Paid', date: '20 Oct 2024', gst: 17100 },
  ];

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'purchases', label: 'Purchase Orders', icon: ShoppingCart },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'gst', label: 'GST Compliance', icon: IndianRupee },
    { id: 'tds', label: 'TDS Compliance', icon: Receipt },
    { id: 'cutomers', label: 'Customers', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };


  return (
    <div className="flex bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-white border-r border-gray-200 overflow-hidden`}>
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-indigo-600">Finance Suite</h1>
          <p className="text-sm text-gray-500 mt-1">Professional</p>
        </div>
        <nav className="p-4 space-y-2">
          {navigation?.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item?.id}
                onClick={() => setActiveTab(item?.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === item?.id
                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={20} />
                <span>{item?.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {sidebarOpen ? <X size={20}  strokeWidth={1} /> : <Menu size={20} strokeWidth={1} />}
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
                <p className="text-sm text-gray-500">Welcome back! Here's your business overview.</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="p-2 hover:bg-gray-100 rounded-lg relative">
                <Bell size={20} strokeWidth={1}/>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                AB
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {stats?.map((stat, idx) => {
              const Icon = stat?.icon;
              return (
                <div key={idx} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${
                      stat?.trend === 'up' ? 'bg-green-50' : 
                      stat?.trend === 'warning' ? 'bg-orange-50' : 'bg-blue-50'
                    }`}>
                      <Icon className={`${
                        stat?.trend === 'up' ? 'text-green-600' : 
                        stat?.trend === 'warning' ? 'text-orange-600' : 'text-blue-600'
                      }`} size={24} />
                    </div>
                    <span className={`text-sm font-medium ${
                      stat?.trend === 'up' ? 'text-green-600' : 
                      stat?.trend === 'warning' ? 'text-orange-600' : 'text-gray-600'
                    }`}>
                      {stat?.change}
                    </span>
                  </div>
                  <h3 className="text-gray-500 text-sm font-medium mb-1">{stat?.label}</h3>
                  <p className="text-2xl font-bold text-gray-800">{stat?.value}</p>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                <Plus className="text-indigo-600 mb-2" size={24} />
                <span className="text-sm font-medium text-gray-700">New Invoice</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                <Plus className="text-indigo-600 mb-2" size={24} />
                <span className="text-sm font-medium text-gray-700">Add Customer</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                <Plus className="text-indigo-600 mb-2" size={24} />
                <span className="text-sm font-medium text-gray-700">Purchase Order</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                <Download className="text-indigo-600 mb-2" size={24} />
                <span className="text-sm font-medium text-gray-700">GST Return</span>
              </button>
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Recent Invoices</h3>
                <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                  View All
                </button>
              </div>
              <div className="flex space-x-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search invoices..."
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentInvoices?.map((invoice) => (
                    <tr key={invoice?.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice?.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{invoice?.client}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">₹{invoice?.amount.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">₹{invoice?.gst.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{invoice?.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(invoice?.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button className="text-indigo-600 hover:text-indigo-800 font-medium">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Compliance Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Receipt className="text-orange-600" size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-orange-900 mb-1">GST Filing Due</h4>
                  <p className="text-sm text-orange-700 mb-3">GSTR-3B for September 2024 is due on 20th October 2024</p>
                  <button className="text-sm font-medium text-orange-600 hover:text-orange-700">
                    File Now →
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <IndianRupee className="text-blue-600" size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 mb-1">TDS Return Ready</h4>
                  <p className="text-sm text-blue-700 mb-3">Quarterly TDS return for Q2 FY 2024-25 is ready to file</p>
                  <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
                    Review Return →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default FinanceSuiteDashboard;