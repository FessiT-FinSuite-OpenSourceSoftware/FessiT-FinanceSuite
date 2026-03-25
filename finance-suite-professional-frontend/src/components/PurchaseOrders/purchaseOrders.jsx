import React, { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchPurchaseOrderData, deletePurchaseOrder, purchaseOrderSelector } from "../../ReduxApi/purchaseOrder";
import { authSelector } from "../../ReduxApi/auth";
import { canWrite, canDelete, Module } from "../../utils/permissions";

// 💰 Helper to get currency symbol
const getCurrencySymbol = (currencyType) => {
  if (!currencyType || currencyType === "" || currencyType === "INR") {
    return "₹";
  }
  
  const currencySymbols = {
    // Major World Currencies
    "USD": "$",     // US Dollar
    "EUR": "€",     // Euro
    "GBP": "£",     // British Pound
    "JPY": "¥",     // Japanese Yen
    "CNY": "¥",     // Chinese Yuan
    "INR": "₹",     // Indian Rupee
    "CAD": "C$",    // Canadian Dollar
    "AUD": "A$",    // Australian Dollar
    "CHF": "CHF",   // Swiss Franc
    "SEK": "kr",    // Swedish Krona
    "NOK": "kr",    // Norwegian Krone
    "DKK": "kr",    // Danish Krone
    "RUB": "₽",     // Russian Ruble
    "BRL": "R$",    // Brazilian Real
    "MXN": "$",     // Mexican Peso
    "SGD": "S$",    // Singapore Dollar
    "HKD": "HK$",   // Hong Kong Dollar
    "NZD": "NZ$",   // New Zealand Dollar
    "KRW": "₩",     // South Korean Won
    "TRY": "₺",     // Turkish Lira
    "ZAR": "R",     // South African Rand
    "PLN": "zł",    // Polish Zloty
    "CZK": "Kč",    // Czech Koruna
    "HUF": "Ft",    // Hungarian Forint
    "ILS": "₪",     // Israeli Shekel
    "AED": "د.إ",   // UAE Dirham
    "SAR": "﷼",     // Saudi Riyal
    "QAR": "﷼",     // Qatari Riyal
    "KWD": "د.ك",   // Kuwaiti Dinar
    "BHD": ".د.ب",  // Bahraini Dinar
    "OMR": "﷼",     // Omani Rial
    "EGP": "£",     // Egyptian Pound
    "THB": "฿",     // Thai Baht
    "MYR": "RM",    // Malaysian Ringgit
    "IDR": "Rp",    // Indonesian Rupiah
    "PHP": "₱",     // Philippine Peso
    "VND": "₫",     // Vietnamese Dong
    "TWD": "NT$",   // Taiwan Dollar
    "BGN": "лв",    // Bulgarian Lev
    "RON": "lei",   // Romanian Leu
    "HRK": "kn",    // Croatian Kuna
    "RSD": "дин",   // Serbian Dinar
    "UAH": "₴",     // Ukrainian Hryvnia
    "BYN": "Br",    // Belarusian Ruble
    "GEL": "₾",     // Georgian Lari
    "AMD": "֏",     // Armenian Dram
    "AZN": "₼",     // Azerbaijani Manat
    "KZT": "₸",     // Kazakhstani Tenge
    "UZS": "лв",    // Uzbekistani Som
    "PKR": "₨",     // Pakistani Rupee
    "BDT": "৳",     // Bangladeshi Taka
    "LKR": "₨",     // Sri Lankan Rupee
    "NPR": "₨",     // Nepalese Rupee
    "AFN": "؋",     // Afghan Afghani
    "IRR": "﷼",     // Iranian Rial
    "IQD": "ع.د",   // Iraqi Dinar
    "JOD": "د.ا",   // Jordanian Dinar
    "LBP": "£",     // Lebanese Pound
    "SYP": "£",     // Syrian Pound
    "YER": "﷼",     // Yemeni Rial
    "MAD": "د.م.",  // Moroccan Dirham
    "TND": "د.ت",   // Tunisian Dinar
    "DZD": "د.ج",   // Algerian Dinar
    "LYD": "ل.د",   // Libyan Dinar
    "SDG": "ج.س.",  // Sudanese Pound
    "ETB": "Br",    // Ethiopian Birr
    "KES": "KSh",   // Kenyan Shilling
    "UGX": "USh",   // Ugandan Shilling
    "TZS": "TSh",   // Tanzanian Shilling
    "RWF": "FRw",   // Rwandan Franc
    "GHS": "₵",     // Ghanaian Cedi
    "NGN": "₦",     // Nigerian Naira
    "XOF": "CFA",   // West African CFA Franc
    "XAF": "FCFA",  // Central African CFA Franc
    "MZN": "MT",    // Mozambican Metical
    "BWP": "P",     // Botswana Pula
    "SZL": "L",     // Swazi Lilangeni
    "LSL": "L",     // Lesotho Loti
    "NAD": "$",     // Namibian Dollar
    "ZMW": "ZK",    // Zambian Kwacha
    "ZWL": "$",     // Zimbabwean Dollar
    "MWK": "MK",    // Malawian Kwacha
    "MGA": "Ar",    // Malagasy Ariary
    "MUR": "₨",     // Mauritian Rupee
    "SCR": "₨",     // Seychellois Rupee
    "CLP": "$",     // Chilean Peso
    "ARS": "$",     // Argentine Peso
    "UYU": "$U",    // Uruguayan Peso
    "PYG": "₲",     // Paraguayan Guarani
    "BOB": "Bs",    // Bolivian Boliviano
    "PEN": "S/",    // Peruvian Sol
    "COP": "$",     // Colombian Peso
    "VES": "Bs",    // Venezuelan Bolívar
    "GYD": "$",     // Guyanese Dollar
    "SRD": "$",     // Surinamese Dollar
    "TTD": "TT$",   // Trinidad and Tobago Dollar
    "JMD": "J$",    // Jamaican Dollar
    "BBD": "Bds$",  // Barbadian Dollar
    "BSD": "$",     // Bahamian Dollar
    "BZD": "BZ$",   // Belize Dollar
    "GTQ": "Q",     // Guatemalan Quetzal
    "HNL": "L",     // Honduran Lempira
    "NIO": "C$",    // Nicaraguan Córdoba
    "CRC": "₡",     // Costa Rican Colón
    "PAB": "B/.",   // Panamanian Balboa
    "DOP": "RD$",   // Dominican Peso
    "HTG": "G",     // Haitian Gourde
    "CUP": "₱",     // Cuban Peso
    "XCD": "$",     // East Caribbean Dollar
    "AWG": "ƒ",     // Aruban Florin
    "ANG": "ƒ",     // Netherlands Antillean Guilder
    "FJD": "$",     // Fijian Dollar
    "PGK": "K",     // Papua New Guinean Kina
    "SBD": "$",     // Solomon Islands Dollar
    "VUV": "VT",    // Vanuatu Vatu
    "WST": "WS$",   // Samoan Tala
    "TOP": "T$",    // Tongan Paʻanga
    "XPF": "₣",     // CFP Franc
  };
  
  return currencySymbols[currencyType] || "₹";
};

export default function PurchaseOrderList() {
  const nav = useNavigate();
  const dispatch = useDispatch();
  const { purchaseOrderData, isLoading } = useSelector(purchaseOrderSelector);
  const { user } = useSelector(authSelector);
  const hasWrite = canWrite(user, Module.PurchaseOrders);
  const hasDelete = canDelete(user, Module.PurchaseOrders);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currencyFilter, setCurrencyFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  useEffect(() => {
    dispatch(fetchPurchaseOrderData());
  }, [dispatch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, currencyFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-800";
      case "Sent":
        return "bg-blue-100 text-blue-800";
      case "Completed":
        return "bg-purple-100 text-purple-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      case "Draft":
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const createPO = () => {
    nav("/purchases/addPurchaseOrder");
  };

  const onEdit = (id) => {
    nav(`/purchases/editPurchaseOrder/${id}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this purchase order?")) return;

    try {
      await dispatch(deletePurchaseOrder(id));
    } catch (error) {
      console.error('Error deleting purchase order:', error);
    }
  };

  const purchaseOrders = Array.isArray(purchaseOrderData) ? purchaseOrderData : [];

  const filteredPOs = purchaseOrders.filter((po) => {
    const poNumber = (po.po_number || "").toLowerCase();
    const vendor = (po.vendor_name || "").toLowerCase();

    const matchesSearch =
      poNumber.includes(searchTerm.toLowerCase()) ||
      vendor.includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || po.status === statusFilter;

    const currency = po.currency_type || "INR";
    let matchesCurrency = true;
    
    if (currencyFilter !== "All") {
      if (currencyFilter === "Others") {
        // Show currencies that are not INR, USD, or EUR
        matchesCurrency = !['INR', 'USD', 'EUR'].includes(currency);
      } else {
        matchesCurrency = currency === currencyFilter;
      }
    }

    return matchesSearch && matchesStatus && matchesCurrency;
  });

  const totalPages = Math.ceil(filteredPOs.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPOs = filteredPOs.slice(startIndex, endIndex);

  const countByStatus = (status) =>
    purchaseOrders.filter((po) => po.status === status).length;

  return (
    <div>
      <div className="max-w-7xl lg:w-full md:w-full">

        {/* Action Bar */}
        <div className="sticky top-[88px] z-100 rounded-lg bg-white border-g border-gray-300 py-4 -mt-15 shadow-sm mb-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by PO number or vendor..."
                className="w-full ml-2 pl-10 pr-4 py-2 border border-gray-700 rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filters + Create */}
            <div className="flex items-center gap-3">

              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="Draft">Draft</option>
                  <option value="Approved">Approved</option>
                  <option value="Sent">Sent</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Currency Filter */}
              <div className="flex items-center gap-2">
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2"
                  value={currencyFilter}
                  onChange={(e) => setCurrencyFilter(e.target.value)}
                >
                  <option value="All">All Currency</option>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <button
                onClick={createPO}
                disabled={!hasWrite}
                className={`flex items-center mr-2 gap-2 px-4 py-2 rounded-lg transition-colors ${
                  hasWrite
                    ? "cursor-pointer bg-blue-600 text-white hover:bg-blue-700"
                    : "cursor-not-allowed bg-gray-200 text-gray-400"
                }`}
                title={!hasWrite ? "You don't have permission to create purchase orders" : ""}
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Create</span>
              </button>

            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Total PO</p>
            <p className="text-2xl font-bold text-gray-900">
              {purchaseOrders.length}
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Approved</p>
            <p className="text-2xl font-bold text-green-600">
              {countByStatus("Approved")}
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Sent</p>
            <p className="text-2xl font-bold text-blue-600">
              {countByStatus("Sent")}
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Draft</p>
            <p className="text-2xl font-bold text-gray-600">
              {countByStatus("Draft")}
            </p>
          </div>

        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">

            <table className="w-full">

              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>

                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    PO Number
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Vendor
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden lg:table-cell">
                    PO Date
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden lg:table-cell">
                    Due Date
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Amount
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Status
                  </th>

                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Actions
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">

                {currentPOs.length > 0 ? (
                  currentPOs.map((po) => (

                    <tr key={po._id?.$oid || po.id} className="hover:bg-gray-50">

                      <td
                        className="px-6 py-4 whitespace-nowrap text-blue-600 font-medium cursor-pointer"
                        onClick={() => onEdit(po._id?.$oid || po.id)}
                      >
                        {po.po_number}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {po.vendor_name}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                        {po.po_date}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                        {po.po_dueDate}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap font-semibold">
                        {getCurrencySymbol(po.currency_type)} {Number(po.total || 0).toLocaleString()}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(po.status)}`}
                        >
                          {po.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">

                          <button
                            onClick={() => hasWrite && onEdit(po._id?.$oid || po.id)}
                            disabled={!hasWrite}
                            className={`transition-colors ${
                              hasWrite
                                ? "cursor-pointer text-gray-600 hover:text-green-600"
                                : "cursor-not-allowed text-gray-300"
                            }`}
                            title={!hasWrite ? "No write permission" : "Edit"}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => hasDelete && handleDelete(po._id?.$oid || po.id)}
                            disabled={!hasDelete}
                            className={`transition-colors ${
                              hasDelete
                                ? "cursor-pointer text-gray-600 hover:text-red-600"
                                : "cursor-not-allowed text-gray-300"
                            }`}
                            title={!hasDelete ? "No delete permission" : "Delete"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No purchase orders found.
                    </td>
                  </tr>
                )}

              </tbody>
            </table>

          </div>

          {/* Pagination */}
          {filteredPOs.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">

              <p className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredPOs.length)} of {filteredPOs.length}
              </p>

              <div className="flex gap-1">

                {[...Array(totalPages)].map((_, index) => (

                  <button
                    key={index}
                    onClick={() => setCurrentPage(index + 1)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
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