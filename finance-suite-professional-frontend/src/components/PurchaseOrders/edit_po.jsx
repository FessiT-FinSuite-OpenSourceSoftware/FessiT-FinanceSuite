import React, { useEffect, useState } from "react";
import { CirclePlus, CircleMinus, ChevronDown, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import { countries } from "../../shared/countries";
import { useNavigate, useParams } from "react-router-dom";
import { formatNumber } from "../../utils/formatNumber";
import PurchaseOrderReportGeneration from "./purchaseReportGeneration";
import { useDispatch } from "react-redux";
import { fetchOnePurchaseOrder, updatePurchaseOrder } from "../../ReduxApi/purchaseOrder";
import axiosInstance from "../../utils/axiosInstance";

const initialPOData = {
  company_name: "",
  gstIN: "",
  company_address: "",
  company_phone: "",
  company_email: "",
  po_number: "",
  po_date: "",
  po_dueDate: "",
  po_terms: "",
  place_of_supply: "",
  vendor_name: "",
  vendor_address: "",
  vendor_gstin: "",
  vendor_phone: "",
  vendor_email: "",
  subject: "",
  items: [
    {
      description: "",
      quantity: "",
      rate: "",
      itemTotal: "",
    },
  ],
  subTotal: "",
  total: "",
  notes: "",
  status: "Draft",
};

export default function EditPurchaseOrder() {
  const [poData, setPoData] = useState(initialPOData);
  const [inputErrors, setInputErrors] = useState({});
  const [errors, setErrors] = useState({});
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [showPOPreview, setShowPOPreview] = useState(false);
  const nav = useNavigate();
  const { id } = useParams();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!poData || !Array.isArray(poData.items)) return;

    const subTotal = poData.items.reduce((sum, item) => {
      return sum + (parseFloat(item.itemTotal) || 0);
    }, 0);

    setPoData((prev) => ({
      ...prev,
      subTotal: subTotal.toFixed(2),
      total: subTotal.toFixed(2),
    }));
  }, [poData.items]);

  useEffect(() => {
    const fetchPO = async () => {
      try {
        if (!id) return;

        const response = await axiosInstance.get(`/purchase-orders/${id}`);
        const data = await response.data;

        if (!data || typeof data !== "object") {
          throw new Error("Purchase Order not found");
        }

        const normalizedItems =
          Array.isArray(data.items) && data.items.length > 0
            ? data.items.map((item) => ({
                description: item.description || "",
                quantity: item.quantity || "",
                rate: item.rate || "",
                itemTotal: item.itemTotal || "",
              }))
            : initialPOData.items;

        setPoData({
          ...initialPOData,
          ...data,
          items: normalizedItems,
        });
      } catch (err) {
        console.error(err);
        toast.error(err.message || "Failed to load purchase order");
      }
    };

    fetchPO();
  }, [id]);

  const handleSelect = (e) => {
    const selected = countries.find((c) => c.code === e.target.value);
    setSelectedCountry(selected);
  };

  const validateField = (name, value) => {
    let error = "";

    switch (name) {
      case "company_name":
        if (value.length > 64)
          error = "Company name cannot exceed 64 characters.";
        else if (!/^[A-Za-z.\s]*$/.test(value))
          error = "Only alphabets, spaces and '.' are allowed.";
        break;

      case "company_phone":
      case "vendor_phone":
        if (!value) {
          error = "Phone number is required.";
        } else if (!selectedCountry.phone.test(value)) {
          error = `Invalid phone number for ${selectedCountry.cname}.`;
        } else if (value.length > 15) {
          error = "Phone number cannot exceed 15 digits.";
        }
        break;

      case "company_email":
      case "vendor_email":
        if (value && !/^[\w.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value))
          error = "Invalid email address.";
        break;

      case "gstIN":
      case "vendor_gstin":
        if (!/^[A-Za-z0-9]*$/.test(value))
          error = "GSTIN must be alphanumeric only.";
        else if (value.length > 15)
          error = "GSTIN should not exceed 15 characters.";
        break;

      default:
        break;
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    const disabledFields = ['company_name', 'gstIN', 'company_address', 'company_email', 'po_number'];
    if (disabledFields.includes(name)) {
      return;
    }

    setPoData({ ...poData, [name]: value });
    validateField(name, value);

    if (inputErrors[name]) {
      setInputErrors((prevErrors) => {
        const updated = { ...prevErrors };
        delete updated[name];
        return updated;
      });
    }
  };

  const handlePhoneChange = (e, field) => {
    let { value } = e.target;
    value = value.replace(/\D/g, "");
    setPoData((prev) => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    const updatedItems = [...poData.items];
    const item = updatedItems[index];

    if (["quantity", "rate", "itemTotal"].includes(name)) {
      if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
        item[name] = value;
      }
    } else {
      item[name] = value;
    }

    const quantity = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    item.itemTotal = (quantity * rate).toFixed(2);

    setPoData({ ...poData, items: updatedItems });
  };

  const addItem = () => {
    setPoData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: "",
          quantity: "",
          rate: "",
          itemTotal: "",
        },
      ],
    }));
  };

  const removeItem = (index) => {
    const updatedItems = poData.items.filter((_, i) => i !== index);
    setPoData({ ...poData, items: updatedItems });
  };

  const poDataSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};

    if (!poData.company_name?.trim())
      newErrors.company_name = "Company name is required";
    if (!poData.gstIN?.trim()) newErrors.gstIN = "GSTIN is required";
    if (!poData.company_address?.trim())
      newErrors.company_address = "Address is required";
    if (!poData.company_phone?.trim())
      newErrors.company_phone = "Phone number is required";
    if (!poData.company_email?.trim())
      newErrors.company_email = "Email is required";

    if (!poData?.po_number?.trim())
      newErrors.po_number = "PO number is required";
    if (!poData?.po_date?.trim())
      newErrors.po_date = "PO date is required";
    if (!poData?.po_dueDate?.trim())
      newErrors.po_dueDate = "PO due date is required";
    if (!poData?.place_of_supply?.trim())
      newErrors.place_of_supply = "Place of supply is required";
    if (!poData?.vendor_name?.trim())
      newErrors.vendor_name = "Vendor name is required";
    if (!poData?.vendor_address?.trim())
      newErrors.vendor_address = "Vendor address is required";

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

    try {
      await dispatch(updatePurchaseOrder(id, poData));
      toast.success("Purchase Order updated successfully");
      nav("/purchases");
    } catch (err) {
      console.error(err);
      toast.error(
        err.message || "Something went wrong while updating purchase order"
      );
    }
  };

  const goBack = () => {
    nav(-1);
  };

  if (!poData || !Array.isArray(poData.items)) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Loading purchase order...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {!showPOPreview ? (
        <>
          <div className="sticky top-[88px] w-full z-100 rounded-lg bg-white border-g border-gray-300 py-4 -mt-15 shadow-sm">
            <div className="flex justify-between">
              <div className="px-4 py-2 flex items-center gap-3">
                <ArrowLeft strokeWidth={1} onClick={goBack} className="cursor-pointer" />
                <span className="text-sm font-semibold text-gray-700">Purchase Orders</span>
              </div>
              <div className="flex flex-wrap justify-end gap-2 mr-5">
                <button
                  className="px-6 py-2 cursor-pointer text-black rounded-full border border-gray-300 hover:border-blue-500 hover:shadow-md hover:-translate-y-px transition-all duration-200 hover:text-blue-600"
                  onClick={poDataSubmit}
                >
                  Save
                </button>

                <button
                  className="px-6 py-2 cursor-pointer text-black rounded-full border border-gray-300 hover:border-blue-500 hover:shadow-md hover:-translate-y-px transition-all duration-200 hover:text-blue-600"
                  onClick={() => setShowPOPreview(true)}
                >
                  Download
                </button>

                <button
                  onClick={() => setShowPOPreview(true)}
                  className="px-6 py-2 cursor-pointer text-black rounded-full border border-gray-300 hover:border-blue-500 hover:shadow-md hover:-translate-y-px transition-all duration-200 hover:text-blue-600"
                >
                  Preview PO
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg border-g shadow-lg p-8 pb-6 mt-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
                Organization Details
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 bg-gray-50 cursor-not-allowed"
                    value={poData.company_name}
                    name="company_name"
                    disabled
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">GSTIN *</label>
                  <input
                    type="text"
                    className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 bg-gray-50 cursor-not-allowed"
                    value={poData.gstIN}
                    name="gstIN"
                    disabled
                  />
                </div>
                <div className="col-span-2 relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Address *</label>
                  <textarea
                    className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 h-20 bg-gray-50 cursor-not-allowed"
                    name="company_address"
                    value={poData.company_address}
                    disabled
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone *</label>
                  <input
                    type="text"
                    className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 bg-gray-50 cursor-not-allowed"
                    value={poData?.company_phone}
                    name="company_phone"
                    disabled
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 bg-gray-50 cursor-not-allowed"
                    value={poData.company_email}
                    name="company_email"
                    disabled
                  />
                </div>
              </div>

              <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-gray-300">
                Purchase Order Details
              </h2>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">PO No *</label>
                  <input
                    type="text"
                    className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 bg-gray-50 cursor-not-allowed"
                    value={poData.po_number}
                    name="po_number"
                    disabled
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">PO Date *</label>
                  <input
                    type="date"
                    className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700"
                    value={poData.po_date}
                    name="po_date"
                    onChange={handleChange}
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700"
                    value={poData.po_dueDate}
                    name="po_dueDate"
                    onChange={handleChange}
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Terms</label>
                  <input
                    type="text"
                    className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700"
                    value={poData.po_terms}
                    name="po_terms"
                    onChange={handleChange}
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Place of Supply *</label>
                  <input
                    type="text"
                    className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700"
                    value={poData.place_of_supply}
                    name="place_of_supply"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-gray-300">
                Vendor Details
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Vendor Name *</label>
                  <input
                    type="text"
                    className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700"
                    value={poData.vendor_name}
                    name="vendor_name"
                    onChange={handleChange}
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Vendor GSTIN</label>
                  <input
                    type="text"
                    className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700"
                    value={poData.vendor_gstin}
                    name="vendor_gstin"
                    onChange={handleChange}
                  />
                </div>
                <div className="col-span-2 relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Vendor Address *</label>
                  <textarea
                    className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 h-20"
                    value={poData.vendor_address}
                    name="vendor_address"
                    onChange={handleChange}
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Vendor Phone</label>
                  <input
                    type="text"
                    className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700"
                    value={poData.vendor_phone}
                    name="vendor_phone"
                    onChange={(e) => handlePhoneChange(e, 'vendor_phone')}
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Vendor Email</label>
                  <input
                    type="email"
                    className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700"
                    value={poData.vendor_email}
                    name="vendor_email"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700"
                  value={poData.subject}
                  name="subject"
                  onChange={handleChange}
                />
              </div>

              <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-gray-300">Items</h2>
              <div>
                <table className="w-full border border-gray-300 border-collapse text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-3 py-2 text-center">Sl No</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Description</th>
                      <th className="border border-gray-300 px-3 py-2 text-center">Quantity</th>
                      <th className="border border-gray-300 px-3 py-2 text-center">Rate</th>
                      <th className="border border-gray-300 px-3 py-2 text-center">Amount</th>
                      <th className="border border-gray-300 px-3 py-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poData.items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition">
                        <td className="border border-gray-300 px-3 py-2 text-center">{index + 1}</td>
                        <td className="border border-gray-300 px-3 py-2">
                          <input
                            type="text"
                            name="description"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, e)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-gray-700"
                            placeholder="Enter description"
                          />
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          <input
                            type="number"
                            name="quantity"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, e)}
                            className="w-20 border border-gray-300 rounded px-2 py-1 text-right text-gray-700"
                            placeholder="Qty"
                          />
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          <input
                            type="number"
                            name="rate"
                            value={item.rate}
                            onChange={(e) => handleItemChange(index, e)}
                            className="w-24 border border-gray-300 rounded px-2 py-1 text-right text-gray-700"
                            placeholder="Rate"
                          />
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-800">
                          {item.itemTotal || "0.00"}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          {index === poData.items.length - 1 ? (
                            <CirclePlus
                              strokeWidth={1}
                              className="text-green-600 cursor-pointer"
                              onClick={addItem}
                            />
                          ) : (
                            <CircleMinus
                              strokeWidth={1}
                              className="text-red-500 cursor-pointer"
                              onClick={() => removeItem(index)}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h2 className="text-lg font-semibold text-gray-800 mb-4 mt-6 border-b pb-2 border-gray-300">Totals</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div></div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Sub Total</span>
                    <input
                      type="text"
                      className="border border-gray-300 rounded px-2 py-1 w-32 text-right"
                      value={formatNumber(poData.subTotal)}
                      disabled
                    />
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t border-gray-400 pt-2 mt-2">
                    <span>Total</span>
                    <input
                      type="text"
                      className="border border-gray-300 rounded px-2 py-1 w-32 text-right font-bold text-indigo-700"
                      value={formatNumber(poData.total) || 0}
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                <textarea
                  className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 h-24"
                  name="notes"
                  value={poData.notes}
                  onChange={handleChange}
                />
              </div>

              <div className="flex justify-end mt-8">
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700 mb-16">
                    For {poData.company_name || "Organization"}
                  </p>
                  <div className="border-t border-gray-400 pt-2">
                    <p className="text-sm text-gray-600">Authorized Signature</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <PurchaseOrderReportGeneration
            poData={poData}
            onBack={() => setShowPOPreview(false)}
          />
        </>
      )}
    </div>
  );
}
