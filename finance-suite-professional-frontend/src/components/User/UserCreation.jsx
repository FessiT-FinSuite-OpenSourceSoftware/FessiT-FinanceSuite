import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { createUser } from "../../ReduxApi/user";

const initialUser = {
  name: "",
  email: "",
  password: "",
  role: "",
  is_admin: false,
  is_active: true,
  permissions: {
    organisation: { read: false, write: false, delete: false },
    invoice: { read: false, write: false, delete: false },
    expenses: { read: false, write: false, delete: false },
    users: { read: false, write: false, delete: false },
    purchaseOrders: { read: false, write: false, delete: false },
    customers: { read: false, write: false, delete: false },
    products: { read: false, write: false, delete: false },
  },
};

export default function UserCreation() {
  const [user, setUser] = useState(initialUser);
  const [inputErrors, setInputErrors] = useState({});
  const [errors, setErrors] = useState({});
  const nav = useNavigate();
  const dispatch = useDispatch();

  const validateForm = (name, value) => {
    let error = "";
    switch (name) {
      case "name":
        if (!value) error = "Name is required";
        else if (value.length > 64) error = "Name cannot exceed 64 characters";
        else if (!/^[A-Za-z\s]*$/.test(value)) error = "Only alphabets and spaces allowed";
        break;
      case "email":
        if (!value) error = "Email is required";
        else if (!/^[\w.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value)) error = "Invalid email address";
        break;
      case "password":
        if (!value) error = "Password is required";
        else if (value.length < 6) error = "Password must be at least 6 characters";
        break;
      case "role":
        if (!value) error = "Role is required";
        break;
      default:
        break;
    }
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser({ ...user, [name]: value });
    validateForm(name, value);
    if (inputErrors[name]) {
      setInputErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handlePermissionChange = (module, permission) => {
    setUser({
      ...user,
      permissions: {
        ...user.permissions,
        [module]: {
          ...user.permissions[module],
          [permission]: !user.permissions[module][permission],
        },
      },
    });
  };

  const handleAdminChange = (e) => {
    const isAdmin = e.target.checked;
    setUser({
      ...user,
      is_admin: isAdmin,
      permissions: isAdmin
        ? {
            organisation: { read: true, write: true, delete: true },
            invoice: { read: true, write: true, delete: true },
            expenses: { read: true, write: true, delete: true },
            users: { read: true, write: true, delete: true },
            purchaseOrders: { read: true, write: true, delete: true },
            customers: { read: true, write: true, delete: true },
            products: { read: true, write: true, delete: true },
          }
        : initialUser.permissions,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!user.name.trim()) newErrors.name = "Name is required";
    if (!user.email.trim()) newErrors.email = "Email is required";
    if (!user.password.trim()) newErrors.password = "Password is required";
    if (!user.role.trim()) newErrors.role = "Role is required";

    if (Object.keys(newErrors).length > 0) {
      setInputErrors(newErrors);
      const firstErrorKey = Object.keys(newErrors)[0];
      const el = document.querySelector(`[name="${firstErrorKey}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
      return;
    }

    setInputErrors({});
    dispatch(createUser(user));
    nav("/users");
    setUser(initialUser);
  };

  return (
    <div className="relative">
      <div className="sticky top-[88px] w-full z-100 rounded-lg bg-white border-g border-gray-300 py-4 -mt-15 shadow-sm">
        <div className="flex justify-between">
          <div className="px-4 py-2">
            <ArrowLeft
              strokeWidth={1}
              className="cursor-pointer"
              onClick={() => nav("/users")}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2 mr-5">
            <button
              className="px-6 py-2 cursor-pointer text-black rounded-full border border-gray-300 w-full sm:w-auto hover:border-blue-500 hover:shadow-md hover:-translate-y-px transition-all duration-200 hover:text-blue-600"
              onClick={handleSubmit}
            >
              Create User
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border-g shadow-lg p-4 pb-6 mt-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
          User Details
        </h2>

        <div className="grid grid-cols-2 gap-6 text-sm">
          <div className="relative">
            <label className="block text-gray-700 font-medium mb-1">Full Name *</label>
            <input
              type="text"
              name="name"
              value={user.name}
              onChange={handleChange}
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
              placeholder="Enter full name"
            />
            {(inputErrors.name || errors.name) && (
              <p className="absolute text-[13px] text-[#f10404]">{inputErrors.name || errors.name}</p>
            )}
          </div>

          <div className="relative">
            <label className="block text-gray-700 font-medium mb-1">Email *</label>
            <input
              type="email"
              name="email"
              value={user.email}
              onChange={handleChange}
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
              placeholder="Enter email"
            />
            {(inputErrors.email || errors.email) && (
              <p className="absolute text-[13px] text-[#f10404]">{inputErrors.email || errors.email}</p>
            )}
          </div>

          <div className="relative">
            <label className="block text-gray-700 font-medium mb-1">Password *</label>
            <input
              type="password"
              name="password"
              value={user.password}
              onChange={handleChange}
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
              placeholder="Enter password"
            />
            {(inputErrors.password || errors.password) && (
              <p className="absolute text-[13px] text-[#f10404]">{inputErrors.password || errors.password}</p>
            )}
          </div>

          <div className="relative">
            <label className="block text-gray-700 font-medium mb-1">Role *</label>
            <select
              name="role"
              value={user.role}
              onChange={handleChange}
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select role</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="accountant">Accountant</option>
              <option value="viewer">Viewer</option>
            </select>
            {(inputErrors.role || errors.role) && (
              <p className="absolute text-[13px] text-[#f10404]">{inputErrors.role || errors.role}</p>
            )}
          </div>

          <div className="relative col-span-2 flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={user.is_admin}
                onChange={handleAdminChange}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="text-gray-700 font-medium">Super Admin (Full Access)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={user.is_active}
                onChange={(e) => setUser({ ...user, is_active: e.target.checked })}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-gray-700 font-medium">Active User</span>
            </label>
          </div>
        </div>

        {!user.is_admin && (
          <div className="mt-6">
            <h3 className="text-md font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
              Module Permissions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(user.permissions).map((module) => {
                // Format module names for display
                const displayName = module === 'purchaseOrders' ? 'Purchase Orders' : 
                                  module.charAt(0).toUpperCase() + module.slice(1);
                
                return (
                  <div key={module} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">{displayName}</h4>
                    <div className="space-y-2">
                      {Object.keys(user.permissions[module]).map((perm) => (
                        <label key={perm} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={user.permissions[module][perm]}
                            onChange={() => handlePermissionChange(module, perm)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-600 capitalize">{perm}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
