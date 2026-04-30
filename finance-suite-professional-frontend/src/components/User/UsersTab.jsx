import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, UserCircle, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchUserData, userSelector, deleteUser } from "../../ReduxApi/user";
import { authSelector } from "../../ReduxApi/auth";
import { canWrite, canDelete, Module } from "../../utils/permissions";
import { TabActionBar, FilterSelect, StatCard, TableWrapper, TableHead, EmptyRow, Pagination } from "../../shared/ui";

const COLUMNS = [
  { label: "User" }, { label: "Email" }, { label: "Role", hidden: true },
  { label: "Permissions", hidden: true }, { label: "Status" }, { label: "Actions", right: true },
];

const getRoleColor = (role) => {
  switch (role?.toLowerCase()) {
    case "admin":      return "bg-purple-100 text-purple-800";
    case "manager":    return "bg-blue-100 text-blue-800";
    case "accountant": return "bg-green-100 text-green-800";
    default:           return "bg-gray-100 text-gray-800";
  }
};

export default function UsersTab() {
  const { usersData, isLoading } = useSelector(userSelector);
  const { user } = useSelector(authSelector);
  const hasWrite  = canWrite(user, Module.Users);
  const hasDelete = canDelete(user, Module.Users);
  const dispatch  = useDispatch();
  const nav       = useNavigate();

  const [searchTerm,   setSearchTerm]   = useState("");
  const [roleFilter,   setRoleFilter]   = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage,  setCurrentPage]  = useState(1);
  const [pageSize,     setPageSize]     = useState(10);
  const [showAction,   setShowAction]   = useState(null);

  useEffect(() => { dispatch(fetchUserData()); }, [dispatch]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, roleFilter, statusFilter]);

  const filtered = usersData.filter((u) => {
    if (u.is_admin) return false;
    const q = searchTerm.toLowerCase();
    const matchSearch = !searchTerm || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q);
    const matchRole   = roleFilter   === "All" || u.role === roleFilter;
    const matchStatus = statusFilter === "All" || (statusFilter === "Active" ? u.is_active : !u.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  const totalPages   = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentUsers = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="max-w-7xl lg:w-full md:w-full">
      <TabActionBar searchValue={searchTerm} onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }} searchPlaceholder="Search by name, email, or role...">
        <FilterSelect value={roleFilter} onChange={(v) => { setRoleFilter(v); setCurrentPage(1); }}>
          <option value="All">All Roles</option>
          <option value="manager">Manager</option>
          <option value="accountant">Accountant</option>
          <option value="viewer">Viewer</option>
        </FilterSelect>
        <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </FilterSelect>
        <button
          onClick={() => nav("/users/addUser")}
          disabled={!hasWrite}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${hasWrite ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
        >
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add User</span>
        </button>
      </TabActionBar>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <StatCard label="Total Users" value={usersData.filter((u) => !u.is_admin).length} />
        <StatCard label="Active"      value={usersData.filter((u) => u.is_active && !u.is_admin).length} valueClass="text-green-600" />
        <StatCard label="Inactive"    value={usersData.filter((u) => !u.is_active && !u.is_admin).length} valueClass="text-red-600" />
      </div>

      <TableWrapper>
        <TableHead columns={COLUMNS} />
        <tbody className="divide-y divide-gray-200">
          {currentUsers.length > 0 ? currentUsers.map((u) => (
            <tr key={u?._id?.$oid} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-2 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${u?.is_admin ? "bg-purple-100" : "bg-indigo-100"}`}>
                    {u?.is_admin ? <Shield className="w-4 h-4 text-purple-600" /> : <UserCircle className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{u?.name}</p>
                    {u?.is_admin && <p className="text-xs text-purple-600 font-semibold">Super Admin</p>}
                  </div>
                </div>
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-gray-600">{u?.email}</td>
              <td className="px-4 py-2 whitespace-nowrap hidden lg:table-cell">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getRoleColor(u?.role)}`}>{u?.role || "N/A"}</span>
              </td>
              <td className="px-4 py-2 whitespace-nowrap hidden lg:table-cell">
                <div className="flex gap-1 flex-wrap">
                  {u?.permissions?.organisation?.read && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Org</span>}
                  {u?.permissions?.invoice?.read      && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">Invoice</span>}
                  {u?.permissions?.expenses?.read     && <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">Expenses</span>}
                  {u?.permissions?.users?.read        && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">Users</span>}
                  {u?.is_admin                        && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">Super Admin</span>}
                </div>
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${u?.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {u?.is_active ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-right">
                <div className="flex items-center justify-end gap-3">
                  <button onClick={() => hasWrite && nav(`/users/editUser/${u?._id?.$oid}`)} disabled={!hasWrite} className={`transition-colors ${hasWrite ? "text-gray-600 hover:text-green-600" : "text-gray-300 cursor-not-allowed"}`}><Edit2 className="w-4 h-4" /></button>
                  <div className="relative">
                    <button onClick={(e) => { if (!hasDelete) return; e.stopPropagation(); setShowAction((p) => (p === u?._id?.$oid ? null : u?._id?.$oid)); }} disabled={!hasDelete} className={`transition-colors ${hasDelete ? "text-gray-600 hover:text-red-600" : "text-gray-300 cursor-not-allowed"}`}><Trash2 className="w-4 h-4" /></button>
                    {showAction === u?._id?.$oid && (
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 bg-white shadow-xl border border-gray-200 rounded-lg p-5 pb-8 z-50">
                        <p className="text-gray-800 text-sm">Are you sure you want to delete <span className="font-bold capitalize">{u?.name}</span>?</p>
                        <div className="flex justify-end gap-3 mt-4">
                          <button onClick={() => setShowAction(null)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</button>
                          <button onClick={() => dispatch(deleteUser(u._id?.$oid))} className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white">Confirm</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </td>
            </tr>
          )) : (
            <EmptyRow colSpan={6} message={isLoading ? "Loading users..." : "No users found"} />
          )}
        </tbody>
      </TableWrapper>
      <Pagination currentPage={currentPage} totalPages={totalPages} pageSize={pageSize} totalCount={filtered.length} onPageChange={setCurrentPage} onPageSizeChange={(n) => { setPageSize(n); setCurrentPage(1); }} />
    </div>
  );
}
