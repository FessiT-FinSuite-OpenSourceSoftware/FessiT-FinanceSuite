import React, { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, Filter, UserCircle, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchUserData, userSelector, deleteUser } from "../../ReduxApi/user";
import { authSelector } from "../../ReduxApi/auth";
import { canWrite, canDelete, Module } from "../../utils/permissions";

export default function UsersList() {
  const { usersData, isLoading } = useSelector(userSelector);
  const { user } = useSelector(authSelector);
  const hasWrite = canWrite(user, Module.Users);
  const hasDelete = canDelete(user, Module.Users);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAction, setShowAction] = useState(null);
  const [page, setPage] = useState(10);
  const dispatch = useDispatch();
  const nav = useNavigate();
  const itemsPerPage = page;

  const filteredUsers = usersData.filter((user) => {
    if (user.is_admin) return false;
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "All" || user.role === roleFilter;
    const matchesStatus = statusFilter === "All" || 
      (statusFilter === "Active" && user.is_active) ||
      (statusFilter === "Inactive" && !user.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

  useEffect(() => {
    dispatch(fetchUserData());
  }, [dispatch]);

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "manager":
        return "bg-blue-100 text-blue-800";
      case "accountant":
        return "bg-green-100 text-green-800";
      case "viewer":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (isActive) => {
    return isActive
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  };

  const onCreateNew = () => nav("/users/addUser");
  const onEdit = (id) => nav(`/users/editUser/${id}`);
  const handleDelete = (id) => dispatch(deleteUser(id));

  return (
    <div>
      <div className="max-w-7xl lg:w-full md:w-full">
        <div className="sticky top-[88px] z-100 rounded-lg bg-white border-g border-gray-300 py-4 -mt-15 shadow-sm mb-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, or username..."
                className="w-full ml-2 pl-10 pr-4 py-2 border border-gray-700 rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-grey-500"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="All">All Roles</option>
                  <option value="manager">Manager</option>
                  <option value="accountant">Accountant</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-grey-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <button
                onClick={onCreateNew}
                disabled={!hasWrite}
                className={`flex items-center mr-2 gap-2 px-4 py-2 rounded-lg transition-colors ${
                  hasWrite
                    ? "cursor-pointer bg-blue-600 text-white hover:bg-blue-700"
                    : "cursor-not-allowed bg-gray-200 text-gray-400"
                }`}
                title={!hasWrite ? "You don't have permission to add users" : ""}
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Add User</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{usersData.filter(u => !u.is_admin).length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {usersData.filter((u) => u.is_active && !u.is_admin).length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Inactive</p>
            <p className="text-2xl font-bold text-red-600">
              {usersData.filter((u) => !u.is_active && !u.is_admin).length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <div className="overflow-visible">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    Permissions
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
                {currentUsers?.length > 0 ? (
                  currentUsers?.map((user) => (
                    <tr key={user?._id?.$oid} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user?.is_admin ? 'bg-purple-100' : 'bg-indigo-100'}`}>
                            {user?.is_admin ? (
                              <Shield className="w-6 h-6 text-purple-600" />
                            ) : (
                              <UserCircle className="w-6 h-6 text-indigo-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 capitalize">{user?.name}</p>
                            {user?.is_admin && <p className="text-xs text-purple-600 font-semibold">Super Admin</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {user?.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getRoleColor(user?.role)}`}>
                          {user?.role || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                        <div className="flex gap-1">
                          {user?.permissions?.organisation?.read && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">Org</span>}
                          {user?.permissions?.invoice?.read && <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">Invoice</span>}
                          {user?.permissions?.expenses?.read && <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded">Expenses</span>}
                          {user?.permissions?.users?.read && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">Users</span>}
                          {user?.is_admin && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">Super Admin</span>}

                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user?.is_active)}`}>
                          {user?.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => hasWrite && onEdit(user?._id?.$oid)}
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
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                if (!hasDelete) return;
                                e.stopPropagation();
                                setShowAction((prev) => (prev === user?._id?.$oid ? null : user?._id?.$oid));
                              }}
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
                            {showAction === user?._id?.$oid && (
                              <div className="absolute right-5 top-1/2 -translate-y-1/2 bg-white shadow-xl border border-gray-200 rounded-lg p-5 pb-8 z-50">
                                <div className="text-center">
                                  <p className="text-gray-800 font-sm">
                                    Are you sure you want to delete <span className="font-bold capitalize">{user?.name}</span>?
                                  </p>
                                  <div className="flex justify-end gap-3 mt-4">
                                    <button
                                      onClick={() => setShowAction(null)}
                                      className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleDelete(user._id?.$oid)}
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
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      {isLoading ? "Loading users..." : "No users found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filteredUsers?.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers?.length)} of {filteredUsers?.length} results
            </p>
            <div>
              <select onChange={(e) => setPage(e.target.value)} className="bg-gray-200 text-sm px-2 py-2 rounded-sm w-44">
                <option value={10}>All</option>
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
