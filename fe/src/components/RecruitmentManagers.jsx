import React, { useState, useEffect, useMemo, useRef } from 'react';

const DEPARTMENT_SPECIALIZATION_MAP = {
  HR: ["TA", "BA"],
  KT: ["Backend Developer", "Frontend Developer", "Tester"],
  Atomic: ["Unity Developer", "Game Designer", "2D Artist", "3D Artist", "Tester"],
  Marketing: ["Store Policy", "BA", "Product Owner"],
  Data: ["Backend Developer", "BA", "Product Owner", "Tester"],
  Hypercat: ["Unity Developer", "Game Designer", "2D Artist", "3D Artist", "Tester"],
  Unicorn: ["Unity Developer", "Game Designer", "2D Artist", "3D Artist", "Tester"],
  Galaxy: ["Unity Developer", "Game Designer", "2D Artist", "3D Artist", "Tester"],
  Lab: ["Unity Developer", "Backend Developer", "Frontend Developer", "Game Designer", "Tester", "BA"]
};

const PERMISSION_SCOPES = [
  { label: 'Xem', value: 'view' },
  { label: 'Duyệt', value: 'approve' },
  { label: 'Ghi chú', value: 'comment' }
];

export default function RecruitmentManagers() {
  const [managers, setManagers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    departmentName: '',
    specialization: '',
    isCc: ''
  });

  const [appliedFilters, setAppliedFilters] = useState({ ...filters });
  
  // Filter Dropdown state
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingManager, setEditingManager] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    departmentName: '',
    specializations: [],
    isTechlead: '',
    isCc: false,
    permissions: {}
  });

  const getToken = () => localStorage.getItem('access_token');

  const apiFetch = async (url, options = {}) => {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    };
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    return response.json();
  };

  const normalizeListResponse = (response) => {
    const items = [response?.data?.data, response?.data, response?.items, response?.results, response].find(Array.isArray) || [];
    const total = response?.data?.total || response?.data?.totalItems || response?.total || response?.totalItems || items.length;
    return { items, total };
  };

  const fetchManagers = async (currentPage = 1, currentSize = 10, currentFilters = appliedFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        size: currentSize
      });
      if (currentFilters.search) params.append('search', currentFilters.search);
      if (currentFilters.departmentName) params.append('departmentName', currentFilters.departmentName);
      if (currentFilters.specialization) params.append('specialization', currentFilters.specialization);
      if (currentFilters.isCc !== '') params.append('isCc', currentFilters.isCc);

      const res = await apiFetch(`http://localhost:3000/api/recruitment-manager?${params.toString()}`);
      const { items, total } = normalizeListResponse(res);
      setManagers(items);
      setTotal(total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers(page, size, appliedFilters);
  }, [page, size, appliedFilters]);

  const handleResetFilters = () => {
    const defaultFilters = { search: '', departmentName: '', specialization: '', isCc: '' };
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setPage(1);
  };

  const splitSpecializations = (specStr) => {
    if (!specStr) return [];
    return specStr.split(',').map(s => s.trim()).filter(Boolean);
  };

  const normalizePermissions = (apiPermissions, specs) => {
    const perms = {};
    specs.forEach(spec => {
      perms[spec] = { view: false, approve: false, comment: false };
    });
    if (Array.isArray(apiPermissions)) {
      apiPermissions.forEach(p => {
        if (p.specialization && p.scope && perms[p.specialization]) {
          perms[p.specialization][p.scope.toLowerCase()] = true;
        }
      });
    }
    return perms;
  };

  const buildPermissions = (specs) => {
    const perms = {};
    specs.forEach(spec => {
      perms[spec] = { view: true, approve: true, comment: true };
    });
    return perms;
  };

  const getManagerName = (manager) => manager.name || manager.fullName || '';
  const getManagerEmail = (manager) => manager.email || '';
  const displayValue = (val) => val || '—';

  const openModal = (manager = null) => {
    if (manager) {
      setEditingManager(manager);
      const departmentName = manager.departmentName || manager.department_name || '';
      const specializations = splitSpecializations(manager.specialization || manager.specializations);
      const isTechlead = manager.isTechlead || manager.is_techlead || '';
      const isCc = manager.isCc || manager.is_cc || false;
      const apiPerms = manager.permissions || manager.managerPermissions || manager.recruitmentManagerPermissions || [];
      
      const permissions = apiPerms.length > 0 ? normalizePermissions(apiPerms, specializations) : buildPermissions(specializations);

      setForm({
        name: getManagerName(manager),
        email: getManagerEmail(manager),
        departmentName,
        specializations,
        isTechlead,
        isCc,
        permissions
      });
    } else {
      setEditingManager(null);
      setForm({
        name: '',
        email: '',
        departmentName: '',
        specializations: [],
        isTechlead: '',
        isCc: false,
        permissions: {}
      });
    }
    setError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingManager(null);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDepartmentChange = (e) => {
    const departmentName = e.target.value;
    setForm(prev => ({
      ...prev,
      departmentName,
      specializations: [],
      isTechlead: '',
      permissions: {}
    }));
  };

  const handleSpecializationChange = (spec, checked) => {
    setForm(prev => {
      const currentSpecs = prev.specializations;
      let newSpecs;
      if (checked) {
        newSpecs = [...currentSpecs, spec];
      } else {
        newSpecs = currentSpecs.filter(s => s !== spec);
      }
      
      let newTechlead = prev.isTechlead;
      if (!newSpecs.includes(newTechlead)) {
        newTechlead = newSpecs[0] || '';
      }

      const newPerms = { ...prev.permissions };
      if (checked) {
        newPerms[spec] = { view: true, approve: true, comment: true };
      } else {
        delete newPerms[spec];
      }

      return {
        ...prev,
        specializations: newSpecs,
        isTechlead: newTechlead,
        permissions: newPerms
      };
    });
  };

  const handlePermissionChange = (spec, scope, checked) => {
    setForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [spec]: {
          ...prev.permissions[spec],
          [scope]: checked
        }
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.departmentName || form.specializations.length === 0) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const checkedPermissions = [];
    form.specializations.forEach(spec => {
      PERMISSION_SCOPES.forEach(({ value }) => {
        if (form.permissions[spec] && form.permissions[spec][value]) {
          checkedPermissions.push({ scope: value, specialization: spec });
        }
      });
    });

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      isCc: Boolean(form.isCc),
      departmentName: form.departmentName,
      specialization: form.specializations.join(', '),
      isTechlead: form.isTechlead || form.specializations[0] || '',
      permissions: checkedPermissions
    };

    try {
      await apiFetch('http://localhost:3000/api/recruitment-manager', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      closeModal();
      fetchManagers(page, size, appliedFilters);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const availableSpecializations = useMemo(() => {
    if (!form.departmentName) return [];
    return DEPARTMENT_SPECIALIZATION_MAP[form.departmentName] || [];
  }, [form.departmentName]);

  const filterAvailableSpecializations = useMemo(() => {
    if (!filters.departmentName) {
        const allSpecs = Object.values(DEPARTMENT_SPECIALIZATION_MAP).flat();
        return [...new Set(allSpecs)];
    }
    return DEPARTMENT_SPECIALIZATION_MAP[filters.departmentName] || [];
  }, [filters.departmentName]);

  return (
    <div className="p-8 lg:p-12 min-h-screen bg-[#F8FAFC]">
      {/* Header section matching reference UI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b] mb-1">Quản lý Manager</h1>
          <p className="text-[#64748b] font-medium text-sm">{total} manager</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={filters.search}
              onChange={(e) => {
                const val = e.target.value;
                setFilters(prev => ({ ...prev, search: val }));
                setAppliedFilters(prev => ({ ...prev, search: val }));
                setPage(1);
              }}
              className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg w-64 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm shadow-sm"
            />
          </div>

          {/* Filter Dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`flex items-center gap-2 px-4 py-2.5 bg-white border text-sm font-medium rounded-lg hover:bg-gray-50 transition-all shadow-sm ${showFilterDropdown ? 'border-indigo-500 text-indigo-600' : 'border-gray-200 text-gray-700'}`}
            >
              <i className="fa-solid fa-filter text-gray-400"></i> Bộ lọc
            </button>

            {showFilterDropdown && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-40 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-800">Lọc theo</h3>
                </div>
                <div className="p-4 space-y-4">
                  {[
                    { label: 'Phòng ban', name: 'departmentName', opts: Object.keys(DEPARTMENT_SPECIALIZATION_MAP).map(o => ({ v: o, l: o })), onChange: val => { setFilters(p => ({...p, departmentName: val, specialization: ''})); setAppliedFilters(p => ({...p, departmentName: val, specialization: ''})); setPage(1); } },
                    { label: 'Lĩnh vực chuyên môn', name: 'specialization', opts: filterAvailableSpecializations.map(o => ({ v: o, l: o })), onChange: val => { setFilters(p => ({...p, specialization: val})); setAppliedFilters(p => ({...p, specialization: val})); setPage(1); } },
                    { label: 'CC trong email', name: 'isCc', opts: [{v: 'true', l: 'CC'}, {v: 'false', l: 'Không CC'}], onChange: val => { setFilters(p => ({...p, isCc: val})); setAppliedFilters(p => ({...p, isCc: val})); setPage(1); } }
                  ].map((f, i) => (
                    <div key={i}>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">{f.label}</label>
                      <select value={filters[f.name]} onChange={e => f.onChange(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                        <option value="">Tất cả</option>
                        {f.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-gray-50 border-t border-gray-100">
                  <button
                    onClick={() => {
                      handleResetFilters();
                      setShowFilterDropdown(false);
                    }}
                    className="w-full py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 text-sm transition-colors"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              </div>
            )}
          </div>


          {/* Add Manager Button */}
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#4F46E5] text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all text-sm shadow-sm"
          >
            <i className="fa-solid fa-plus"></i> Thêm Manager
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                {['STT', 'Họ và tên', 'Email', 'Phòng ban', 'Lĩnh vực chuyên môn', 'CC', 'Thao tác'].map((h, i) => (
                  <th key={i} className={`px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest ${['STT', 'Phòng ban', 'CC', 'Thao tác'].includes(h) ? 'text-center' : ''} ${h === 'STT' ? 'w-16' : ''} ${h === 'Thao tác' ? 'w-24' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i> Đang tải dữ liệu...
                  </td>
                </tr>
              ) : managers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500 font-medium">
                    Không tìm thấy dữ liệu.
                  </td>
                </tr>
              ) : (
                managers.map((manager, index) => {
                  const name = getManagerName(manager);
                  const email = getManagerEmail(manager);
                  const dept = manager.departmentName || manager.department_name;
                  const specs = splitSpecializations(manager.specialization || manager.specializations);
                  const isCc = manager.isCc || manager.is_cc;

                  return (
                    <tr key={manager.id || index} className="hover:bg-slate-50 transition-colors bg-white">
                      <td className="px-6 py-4 text-sm font-medium text-gray-500 text-center">{(page - 1) * size + index + 1}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-800">{displayValue(name)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{displayValue(email)}</td>
                      <td className="px-6 py-4 text-center">
                        {dept ? <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full">{dept}</span> : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {specs.length > 0 ? specs.join(', ') : '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isCc ? (
                          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mx-auto" title="Là CC">
                            <i className="fa-solid fa-check text-green-600 text-[10px]"></i>
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mx-auto" title="Không CC">
                            <i className="fa-solid fa-xmark text-gray-400 text-[10px]"></i>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => openModal(manager)}
                          className="text-amber-500 hover:text-amber-600 transition-colors p-2 rounded-lg hover:bg-amber-50"
                          title="Chỉnh sửa Manager"
                        >
                          <i className="fa-solid fa-pen"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {total > 0 && (
          <div className="px-6 py-4 border-t border-[#E2E8F0] flex flex-col md:flex-row items-center justify-between gap-4 bg-white">
            <span className="text-sm text-gray-500">Hiển thị <span className="font-bold text-gray-900">{Math.min((page - 1) * size + 1, total)}</span> đến <span className="font-bold text-gray-900">{Math.min(page * size, total)}</span> trong <span className="font-bold text-gray-900">{total}</span></span>
            <div className="flex gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
              >
                Trang trước
              </button>
              <button 
                disabled={page * size >= total}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
              >
                Trang sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal / Popup Thêm - Sửa */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
              <h2 className="text-lg font-bold text-gray-900">{editingManager ? 'Chỉnh sửa Manager' : 'Thêm mới Manager'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50 custom-scrollbar">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm font-medium flex items-center gap-2">
                  <i className="fa-solid fa-circle-exclamation text-red-500"></i>
                  {error}
                </div>
              )}
              
              <form id="managerForm" onSubmit={handleSubmit} className="space-y-6">
                
                {/* Section 1: Thông tin chung */}
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <i className="fa-regular fa-id-card text-indigo-500"></i> Thông tin chung
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {[
                      { name: 'name', label: 'Họ và tên', type: 'text', ph: 'VD: Nguyễn Văn A' },
                      { name: 'email', label: 'Email', type: 'email', ph: 'manager@example.com' }
                    ].map((f, i) => (
                      <div key={i}>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">{f.label} <span className="text-red-500">*</span></label>
                        <input
                          type={f.type} name={f.name} required value={form[f.name]} onChange={handleFormChange} placeholder={f.ph}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 2: Vị trí & Vai trò */}
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-briefcase text-indigo-500"></i> Vị trí & Phân công
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Phòng ban <span className="text-red-500">*</span></label>
                      <select
                        name="departmentName"
                        required
                        value={form.departmentName}
                        onChange={handleDepartmentChange}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                      >
                        <option value="">-- Chọn phòng ban --</option>
                        {Object.keys(DEPARTMENT_SPECIALIZATION_MAP).map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col justify-center pt-6">
                      <label className="flex items-center gap-3 cursor-pointer group w-fit">
                        <div className="relative flex items-center justify-center">
                          <input
                            type="checkbox"
                            name="isCc"
                            checked={form.isCc}
                            onChange={handleFormChange}
                            className="peer sr-only"
                          />
                          <div className="w-5 h-5 bg-white border-2 border-gray-300 rounded peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all flex items-center justify-center">
                            <i className="fa-solid fa-check text-white text-[10px] opacity-0 peer-checked:opacity-100 transition-opacity"></i>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">Thiết lập làm CC trong email</span>
                      </label>
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Lĩnh vực chuyên môn <span className="text-red-500">*</span></label>
                    {!form.departmentName ? (
                      <div className="text-sm text-gray-400 italic p-3 border border-dashed border-gray-200 rounded-lg bg-gray-50 text-center">
                        Vui lòng chọn phòng ban để tải danh sách chuyên môn
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2.5">
                        {availableSpecializations.map(spec => (
                          <label key={spec} className={`flex items-center gap-2 cursor-pointer px-3 py-2 border rounded-lg transition-all ${form.specializations.includes(spec) ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                            <input
                              type="checkbox"
                              checked={form.specializations.includes(spec)}
                              onChange={(e) => handleSpecializationChange(spec, e.target.checked)}
                              className="sr-only"
                            />
                            <span className="text-sm font-medium">{spec}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {form.departmentName && form.specializations.length === 0 && (
                      <p className="text-xs text-red-500 mt-2">Cần chọn ít nhất 1 lĩnh vực chuyên môn.</p>
                    )}
                  </div>

                  {form.specializations.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Techlead / Vai trò mặc định</label>
                      <select
                        name="isTechlead"
                        value={form.isTechlead}
                        onChange={handleFormChange}
                        className="w-full md:w-1/2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                      >
                        <option value="">-- Không chọn --</option>
                        {form.specializations.map(spec => (
                          <option key={spec} value={spec}>{spec}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Section 3: Quyền hạn */}
                {form.specializations.length > 0 && (
                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <i className="fa-solid fa-shield-halved text-indigo-500"></i> Quyền hạn thao tác
                    </h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Chuyên môn</th>
                            {PERMISSION_SCOPES.map(scope => (
                              <th key={scope.value} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">{scope.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {form.specializations.map(spec => (
                            <tr key={spec} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-3 text-sm font-semibold text-gray-700">{spec}</td>
                              {PERMISSION_SCOPES.map(scope => (
                                <td key={scope.value} className="px-4 py-3 text-center">
                                  <label className="flex items-center justify-center cursor-pointer">
                                    <div className="relative flex items-center justify-center">
                                      <input
                                        type="checkbox"
                                        checked={form.permissions[spec]?.[scope.value] || false}
                                        onChange={(e) => handlePermissionChange(spec, scope.value, e.target.checked)}
                                        className="peer sr-only"
                                      />
                                      <div className="w-5 h-5 bg-white border-2 border-gray-300 rounded peer-checked:bg-green-500 peer-checked:border-green-500 transition-all flex items-center justify-center">
                                          <i className="fa-solid fa-check text-white text-[10px] opacity-0 peer-checked:opacity-100 transition-opacity"></i>
                                      </div>
                                    </div>
                                  </label>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </form>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-white">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="px-5 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="managerForm"
                disabled={submitting || (form.departmentName && form.specializations.length === 0)}
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <i className="fa-solid fa-spinner fa-spin"></i>}
                {editingManager ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
