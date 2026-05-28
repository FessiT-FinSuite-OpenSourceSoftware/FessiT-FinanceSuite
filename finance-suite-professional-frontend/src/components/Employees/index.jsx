import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, RefreshCcw, User } from 'lucide-react';
import { employeeSelector, fetchEmployees, deleteEmployee, updateEmployee } from '../../ReduxApi/employee';
import { authSelector } from '../../ReduxApi/auth';
import { RowActions, Pagination, StatCard, ConfirmModal, DataTable, FilterSelect } from '../../shared/ui';
import axiosInstance from '../../utils/axiosInstance';

const extractId = (item) =>
  item?.$oid || item?._id?.$oid ||
  (typeof item?._id === 'string' ? item._id : null) ||
  (typeof item === 'string' ? item : '') || '';

const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '-';
const EMPLOYEE_TYPES = ['permanent', 'contract', 'intern'];
const EMPLOYEE_STATUSES = ['full-time', 'probation', 'relieved'];

const statusColor = (s) => {
  if (s === 'full-time') return 'bg-green-100 text-green-700';
  if (s === 'probation') return 'bg-yellow-100 text-yellow-700';
  if (s === 'relieved') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-600';
};

const typeColor = (t) => {
  if (t === 'permanent') return ' text-indigo-700';
  if (t === 'contract') return 'text-orange-700';
  if (t === 'intern') return 'text-purple-700';
  return 'text-slate-600';
};

export default function EmployeeList() {
  const dispatch = useDispatch();
  const nav = useNavigate();
  const { data: employees, isLoading, isFetching, total } = useSelector(employeeSelector);
  const { user } = useSelector(authSelector);
  const isAdmin = user?.is_admin;

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [localPage, setLocalPage] = useState(1);
  const [localSize, setLocalSize] = useState(10);
  const [deleteModal, setDeleteModal] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [photoCache, setPhotoCache] = useState({});
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const debounceRef = useRef(null);
  const isSearching = useRef(false);

  useEffect(() => {
    if (isSearching.current) { isSearching.current = false; return; }
    dispatch(fetchEmployees({ page: localPage, pageSize: localSize, search, department: departmentFilter, employeeType: typeFilter, status: statusFilter }));
  }, [localPage, localSize, departmentFilter, typeFilter, statusFilter]); // eslint-disable-line

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      isSearching.current = true;
      setLocalPage(1);
      dispatch(fetchEmployees({ page: 1, pageSize: localSize, search, department: departmentFilter, employeeType: typeFilter, status: statusFilter }));
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [search]); // eslint-disable-line

  useEffect(() => {
    (Array.isArray(employees) ? employees : []).forEach((e) => {
      if (!e.photo || photoCache[e.photo]) return;
      axiosInstance.get(`/employee-photos/${e.photo}`, { responseType: 'blob' })
        .then((res) => setPhotoCache((prev) => ({ ...prev, [e.photo]: URL.createObjectURL(res.data) })))
        .catch(() => { });
    });
  }, [employees]); // eslint-disable-line

  const paginationOpts = () => ({ page: localPage, pageSize: localSize, search, department: departmentFilter, employeeType: typeFilter, status: statusFilter });
  const totalPages = Math.max(1, Math.ceil(total / localSize));

  const rows = (Array.isArray(employees) ? employees : []).map((e) => ({
    id: extractId(e),
    first_name: e.first_name || '', last_name: e.last_name || '',
    emp_id: e.emp_id || '', email: e.email || '',
    personal_email: e.personal_email || '',
    primary_contact: e.primary_contact || '', emergency_contact: e.emergency_contact || '',
    communication_address: e.communication_address || '', permanent_address: e.permanent_address || '',
    pan_number: e.pan_number || '', uan_number: e.uan_number || '',
    passport_number: e.passport_number || '',
    passport_issued_date: e.passport_issued_date || '', passport_expiry_date: e.passport_expiry_date || '',
    employee_type: e.employee_type || 'permanent', status: e.status || 'full-time',
    department: e.department || '', join_date: e.join_date || '', exit_date: e.exit_date || '',
    reporting_manager_name: e.reportingManagerName || '', photo: e.photo || '',
  }));

  const openStatusModal = (employee) => {
    if (!isAdmin) return;
    setStatusModal({
      employee,
      employee_type: employee.employee_type || 'permanent',
      status: employee.status || 'full-time',
      exit_date: employee.exit_date || '',
    });
  };

  const closeStatusModal = () => setStatusModal(null);

  const handleStatusUpdate = async () => {
    if (!statusModal?.employee) return;
    const nextStatus = statusModal.status;
    if (nextStatus === 'relieved' && !statusModal.exit_date) return;
    const payload = {
      ...statusModal.employee,
      employee_type: statusModal.employee_type,
      status: nextStatus,
      exit_date: nextStatus === 'relieved' ? statusModal.exit_date : '',
    };
    await dispatch(updateEmployee(statusModal.employee.id, payload, null, paginationOpts()));
    closeStatusModal();
  };

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-2">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, emp ID, email, PAN, department..."
              className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="flex items-center gap-2">
            <FilterSelect value={typeFilter} onChange={(value) => { setTypeFilter(value); setLocalPage(1); }}>
              <option value="All">All Types</option>
              {EMPLOYEE_TYPES.map((type) => <option key={type} value={type}>{cap(type)}</option>)}
            </FilterSelect>
            <FilterSelect value={statusFilter} onChange={(value) => { setStatusFilter(value); setLocalPage(1); }}>
              <option value="All">All Status</option>
              {EMPLOYEE_STATUSES.map((status) => <option key={status} value={status}>{cap(status)}</option>)}
            </FilterSelect>
            <button onClick={() => dispatch(fetchEmployees(paginationOpts()))} disabled={isFetching}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <RefreshCcw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Loading...' : 'Refresh'}
            </button>
            {isAdmin && (
              <button onClick={() => nav('/employees/add')}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700">
                <Plus className="w-4 h-4" /> Add Employee
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 mb-4 mr-2">
        {/* <StatCard label="Total Employees" value={total} /> */}
        {/* <StatCard label="Page" value={`${localPage} / ${totalPages}`} /> */}
        {/* <StatCard label="Showing" value={rows.length} /> */}
        <div className='flex items-end justify-end'>
          <p>
            <span className="text-md font-bold text-slate-500">Total Employees: </span>
            <span className="text-md font-bold text-blue-900-900">{total}</span>
          </p>
        </div>
      </div>

      <div className="relative">
        {isFetching && !isLoading && <div className="absolute inset-0 z-10 rounded-2xl bg-white/60 pointer-events-none" />}
        <DataTable
          isLoading={isLoading} data={rows} rowKey={(e) => e.id}
          wrapperClass="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          tbodyClass="divide-y divide-slate-200"
          emptyMessage="No employees found." loadingMessage="Loading employees..."
          columns={[
            // {
            //   label: 'Photo', stopPropagation: true,
            //   render: (e) => photoCache[e.photo]
            //     ? <img src={photoCache[e.photo]} alt={e.first_name} onClick={() => setPreviewPhoto(photoCache[e.photo])} className="h-9 w-9 rounded-full object-cover border border-slate-200 cursor-pointer hover:opacity-80" />
            //     : <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center"><User className="w-4 h-4 text-indigo-400" /></div>,
            // },
            {
              label: 'Employee',
              render: (e) => (
                <div className="flex items-center gap-3">
                  {photoCache[e.photo] ? (
                    <img
                      src={photoCache[e.photo]}
                      alt={e.first_name}
                      onClick={() => setPreviewPhoto(photoCache[e.photo])}
                      className="h-9 w-9 rounded-full object-cover border border-slate-200 cursor-pointer hover:opacity-80 shrink-0"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-indigo-400" />
                    </div>
                  )}

                  <div className="flex flex-col min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {`${e.first_name} ${e.last_name}`.trim() || '-'}
                    </div>

                    <div className="text-xs text-slate-400">
                      <span onClick={(evt) => { evt.stopPropagation(); openStatusModal(e); }} className={`inline-flex rounded-full text-xs font-semibold ${typeColor(e.employee_type)} cursor-pointer hover:opacity-75`}>{cap(e.employee_type)}</span>
                    </div>   
                  </div>
                </div>
              ),
            },
            { label: 'Department', render: (e) => <span className="text-xs text-slate-700">{e.department || '-'}</span> },
            { label: 'Status', stopPropagation: true, render: (e) => <span onClick={(evt) => evt.stopPropagation()} className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor(e.status)}`}>{cap(e.status)}</span> },
            { label: 'Phone', render: (e) => <span className="text-xs text-slate-700">{e.primary_contact || '-'}</span> },
            { label: 'Email', render: (e) => <span className="text-xs text-slate-700">{e.email || '-'}</span> },
            { label: 'Manager', render: (e) => <span className="text-xs text-slate-700">{e.reporting_manager_name || '-'}</span> },
            {
              label: 'Actions', right: true, stopPropagation: true,
              render: (e) => (
                <RowActions
                  onEdit={() => nav(`/employees/edit/${e.id}`)}
                  onDelete={() => setDeleteModal({ id: e.id, name: `${e.first_name} ${e.last_name}` })}
                  canEdit={isAdmin} canDelete={isAdmin}
                />
              ),
            },
          ]}
          renderExpanded={(e) => (
            <div className="p-4 rounded-2xl bg-[#ECEEF2]">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {[
                  ['Personal Email', e.personal_email],
                  ['Emergency Contact', e.emergency_contact],
                  ['PAN', e.pan_number], ['UAN', e.uan_number],
                  ['Passport No', e.passport_number],
                  ['Passport Issued', e.passport_issued_date], ['Passport Expiry', e.passport_expiry_date],
                  ['Join Date', e.join_date],
                  ['Exit Date', e.exit_date],
                  ['Communication Address', e.communication_address],
                  ['Permanent Address', e.permanent_address],
                ].map(([label, val]) => (
                  <div key={label} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{val || '-'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        />
      </div>

      <Pagination
        currentPage={localPage} totalPages={totalPages} pageSize={localSize} totalCount={total}
        onPageChange={(p) => setLocalPage(Math.min(Math.max(p, 1), totalPages))}
        onPageSizeChange={(n) => { setLocalSize(Number(n)); setLocalPage(1); }}
      />

      {previewPhoto && ReactDOM.createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/80" onClick={() => setPreviewPhoto(null)}>
          <img src={previewPhoto} alt="Employee" className="max-h-[80vh] max-w-[80vw] rounded-2xl shadow-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>,
        document.body
      )}

      {deleteModal && (
        <ConfirmModal
          message={<>Delete <span className="font-medium">{deleteModal.name}</span>?</>}
          onConfirm={() => { dispatch(deleteEmployee(deleteModal.id, paginationOpts())); setDeleteModal(null); }}
          onClose={() => setDeleteModal(null)}
        />
      )}

      {statusModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-base font-semibold text-gray-800">Update Employee Status</h3>
            <p className="mb-4 text-sm text-gray-500">
              {`${statusModal.employee.first_name} ${statusModal.employee.last_name}`.trim() || statusModal.employee.emp_id}
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-600">Employee Type</label>
                <select
                  value={statusModal.employee_type}
                  onChange={(e) => setStatusModal((prev) => ({ ...prev, employee_type: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {EMPLOYEE_TYPES.map((type) => <option key={type} value={type}>{cap(type)}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">Status</label>
                <div className="flex flex-wrap gap-4">
                  {EMPLOYEE_STATUSES.map((status) => (
                    <label key={status} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        name="employee-status"
                        value={status}
                        checked={statusModal.status === status}
                        onChange={() => setStatusModal((prev) => ({ ...prev, status, exit_date: status === 'relieved' ? prev.exit_date : '' }))}
                        className="h-4 w-4 accent-blue-600"
                      />
                      <span className="font-medium">{cap(status)}</span>
                    </label>
                  ))}
                </div>
              </div>
              {statusModal.status === 'relieved' && (
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Exit Date *</label>
                  <input
                    type="date"
                    value={statusModal.exit_date}
                    onChange={(e) => setStatusModal((prev) => ({ ...prev, exit_date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {!statusModal.exit_date && <p className="mt-1 text-xs text-red-600">Exit date is required for relieved employees.</p>}
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={closeStatusModal} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleStatusUpdate}
                disabled={statusModal.status === 'relieved' && !statusModal.exit_date}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Update
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
