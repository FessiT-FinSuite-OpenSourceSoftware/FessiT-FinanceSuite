import React from "react";
import { ShieldOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Forbidden() {
  const nav = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center gap-4">
      <ShieldOff size={56} className="text-red-400" strokeWidth={1} />
      <h1 className="text-2xl font-bold text-gray-800">Access Denied</h1>
      <p className="text-gray-500 max-w-sm">
        You don't have permission to view this page. Contact your administrator to request access.
      </p>
      <button
        onClick={() => nav("/")}
        className="mt-2 px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
      >
        Go to Dashboard
      </button>
    </div>
  );
}
