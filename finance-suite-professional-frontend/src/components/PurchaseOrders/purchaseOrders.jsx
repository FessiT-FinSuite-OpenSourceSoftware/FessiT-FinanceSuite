import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchPurchaseOrderData, deletePurchaseOrder, purchaseOrderSelector } from "../../ReduxApi/purchaseOrder";
import { authSelector } from "../../ReduxApi/auth";
import { canWrite, canDelete, Module } from "../../utils/permissions";
import { getCurrencySymbol } from "../../utils/formatNumber";
import { TabActionBar, FilterSelect, StatCard, TableWrapper, TableHead, EmptyRow, RowActions, Pagination } from "../../shared/ui";

const getStatusColor = (status) => {
  switch (status) {
    case "Approved":  return "bg-green-100 text-green-800";
    case "Sent":      return "bg-blue-100 text-blue-800";
    case "Completed": return "bg-purple-100 text-purple-800";
    case "Cancelled": return "bg-red-100 text-red-800";
    default:          return "bg-gray-100 text-gray-800";
  }
};

const COLUMNS = [
  { label: "PO Number" }, { label: "Vendor" },
  { label: "PO Date", hidden: true }, { label: "Due Date", hidden: true },
  { label: "Amount" }, { label: "Status" }, { label: "Actions", right: true },
];

export default function PurchaseOrderList() {
  const nav      = useNavigate();
  const dispatch = useDispatch();
  const { purchaseOrderData, isLoading } = useSelector(purchaseOrderSelector);
  const { user } = useSelector(authSelector);
  const hasWrite  = canWrite(user, Module.PurchaseOrders);
  const hasDelete = canDelete(user, Module.PurchaseOrders);

  const [searchTerm,     setSearchTerm]     = useState("");
  const [statusFilter,   setStatusFilter]   = useState("All");
  const [currencyFilter, setCurrencyFilter] = useState("All");
  const [currentPage,    setCurrentPage]    = useState(1);
  const [pageSize,       setPageSize]       = useState(10);

  useEffect(() => { dispatch(fetchPurchaseOrderData()); }, [dispatch]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, currencyFilter]);

  const purchaseOrders = Array.isArray(purchaseOrderData) ? purchaseOrderData : [];

  const filtered = purchaseOrders.filter((po) => {
    const matchSearch = (po.po_number || "").toLowerCase().includes(searchTerm.toLowerCase()) || (po.vendor_name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "All" || po.status === statusFilter;
    const cur = po.currency_type || "INR";
    const matchCurrency = currencyFilter === "All" || (currencyFilter === "Others" ? !["INR","USD","EUR"].includes(cur) : cur === currencyFilter);
    return matchSearch && matchStatus && matchCurrency;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current    = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const countByStatus = (s) => purchaseOrders.filter((po) => po.status === s).length;

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this purchase order?")) return;
    try { await dispatch(deletePurchaseOrder(id)); } catch (e) { console.error(e); }
  };

  return (
    <div className="max-w-7xl lg:w-full md:w-full">
      <TabActionBar searchValue={searchTerm} onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }} searchPlaceholder="Search by PO number or vendor...">
        <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <option value="All">All Status</option>
          <option value="Draft">Draft</option>
          <option value="Approved">Approved</option>
          <option value="Sent">Sent</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </FilterSelect>
        <FilterSelect value={currencyFilter} onChange={(v) => { setCurrencyFilter(v); setCurrentPage(1); }}>
          <option value="All">All Currency</option>
          <option value="INR">INR (₹)</option>
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
          <option value="Others">Others</option>
        </FilterSelect>
        <button
          onClick={() => nav("/purchases/addPurchaseOrder")}
          disabled={!hasWrite}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${hasWrite ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
        >
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Create</span>
        </button>
      </TabActionBar>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Purchase Orders"  value={purchaseOrders.length} />
        <StatCard label="Approved"  value={countByStatus("Approved")}  valueClass="text-green-600" />
        <StatCard label="Sent"      value={countByStatus("Sent")}      valueClass="text-blue-600" />
        <StatCard label="Draft"     value={countByStatus("Draft")}     valueClass="text-gray-600" />
      </div>

      <TableWrapper>
        <TableHead columns={COLUMNS} />
        <tbody className="divide-y divide-gray-200">
          {current.length > 0 ? current.map((po) => {
            const id = po._id?.$oid || po.id;
            return (
              <tr key={id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-blue-600 font-medium cursor-pointer" onClick={() => nav(`/purchases/editPurchaseOrder/${id}`)}>{po.po_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{po.vendor_name}</td>
                <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell text-gray-600">{po.po_date}</td>
                <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell text-gray-600">{po.po_dueDate}</td>
                <td className="px-6 py-4 whitespace-nowrap font-semibold">{getCurrencySymbol(po.currency_type)} {Number(po.total || 0).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(po.status)}`}>{po.status}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <RowActions
                    onEdit={() => hasWrite && nav(`/purchases/editPurchaseOrder/${id}`)}
                    onDelete={() => hasDelete && handleDelete(id)}
                    canEdit={hasWrite}
                    canDelete={hasDelete}
                  />
                </td>
              </tr>
            );
          }) : (
            <EmptyRow colSpan={7} message={isLoading ? "Loading..." : "No purchase orders found."} />
          )}
        </tbody>
      </TableWrapper>
      <Pagination currentPage={currentPage} totalPages={totalPages} pageSize={pageSize} totalCount={filtered.length} onPageChange={setCurrentPage} onPageSizeChange={(n) => { setPageSize(n); setCurrentPage(1); }} />
    </div>
  );
}
