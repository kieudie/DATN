import React, { useState, useEffect, useMemo } from 'react';
import { message, Select } from 'antd';
import dayjs from 'dayjs';

function getEmailFromToken() {
    try {
        const token = localStorage.getItem("access_token");
        if (!token) return "";
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload?.email || "";
    } catch (error) {
        return "";
    }
}

const RecruitmentOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState('Tất cả');
    const [teamFilter, setTeamFilter] = useState('Tất cả phòng ban');

    // Modals
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [editForm, setEditForm] = useState({
        team: '', position: '', hrLevel: '', quantity: '', startDate: '', expiredDate: '', pic: '', createdBy: '', note: ''
    });
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        team: '', position: '', hrLevel: '', quantity: '1', startDate: '', expiredDate: '', pic: '', createdBy: getEmailFromToken(), note: ''
    });
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState('');

    const statusOptions = [
        { label: 'Tất cả', value: 'Tất cả' },
        { label: 'Chờ duyệt', value: 'pending' },
        { label: 'Đang tuyển', value: 'inprogress' },
        { label: 'Hết hạn', value: 'expired' },
        { label: 'Đã đóng', value: 'closed' },
        { label: 'Đã hủy', value: 'cancelled' }
    ];

    const getStatusLabel = (status) => {
        const map = {
            'pending': 'Chờ duyệt',
            'inprogress': 'Đang tuyển',
            'expired': 'Hết hạn',
            'closed': 'Đã đóng',
            'cancelled': 'Đã hủy'
        };
        return map[status] || status || '—';
    };

    const getStatusColor = (status) => {
        const map = {
            'pending': 'bg-amber-50 text-amber-600 border-amber-100',
            'inprogress': 'bg-blue-50 text-blue-600 border-blue-100',
            'expired': 'bg-red-50 text-red-600 border-red-100',
            'closed': 'bg-gray-50 text-gray-600 border-gray-100',
            'cancelled': 'bg-slate-50 text-slate-600 border-slate-100'
        };
        return map[status] || 'bg-gray-50 text-gray-600 border-gray-100';
    };

    const fetchOrders = async () => {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('access_token');
        try {
            const response = await fetch(`http://localhost:3000/api/recruitment-order/recruiter/all`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'accept': 'application/json'
                }
            });

            if (response.status === 401) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('full_name');
                window.location.href = '/';
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }

            const result = await response.json();
            
            const groups = Array.isArray(result.data) ? result.data : [];
            const normalizedOrders = groups.flatMap((item) => {
                if (Array.isArray(item.orders)) return item.orders;
                if (item && item.id) return [item];
                return [];
            });
            const validOrders = normalizedOrders.filter((order) => {
                if (!order || !order.id) return false;

                const hasPosition = Boolean(String(order.position || "").trim());
                const hasTeam = Boolean(String(order.team || "").trim());

                const hasBusinessInfo = [
                    order.hrLevel,
                    order.note,
                    order.pic,
                    order.createdBy,
                    order.expiredDate,
                ].some((value) => Boolean(String(value || "").trim()));

                return hasPosition && hasTeam && hasBusinessInfo;
            });
            setOrders(validOrders);
        } catch (error) {
            console.error('fetchOrders error:', error);
            setError(error.message || 'Lỗi tải danh sách order');
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const teamOptions = useMemo(() => {
        const teams = new Set(orders.map(o => o.team).filter(Boolean));
        return [{ label: 'Tất cả phòng ban', value: 'Tất cả phòng ban' }, ...Array.from(teams).map(t => ({ label: t, value: t }))];
    }, [orders]);

    const positionOptions = useMemo(() => Array.from(new Set(orders.map(o => o.position).filter(Boolean))), [orders]);
    const hrLevelOptions = useMemo(() => Array.from(new Set(orders.map(o => o.hrLevel).filter(Boolean))), [orders]);
    const picOptions = useMemo(() => Array.from(new Set(orders.map(o => o.pic).filter(Boolean))), [orders]);

    const filteredOrders = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();
        return orders.filter(order => {
            const matchSearch = !keyword || [
                order.position, order.hrLevel, order.team, order.pic, order.createdBy, order.note
            ].filter(Boolean).join(' ').toLowerCase().includes(keyword);

            const matchStatus = statusFilter === 'Tất cả' || order.status === statusFilter;
            const matchTeam = teamFilter === 'Tất cả phòng ban' || order.team === teamFilter;

            return matchSearch && matchStatus && matchTeam;
        });
    }, [orders, searchText, statusFilter, teamFilter]);

    const openCreate = () => {
        setCreateError('');
        setCreateForm({
            team: '', position: '', hrLevel: '', quantity: '1', startDate: '', expiredDate: '', pic: '', createdBy: getEmailFromToken(), note: ''
        });
        setIsCreateModalOpen(true);
    };

    const handleCreateChange = (e) => {
        const { name, value } = e.target;
        setCreateForm(prev => ({ ...prev, [name]: value }));
    };

    const submitCreate = async (e) => {
        e.preventDefault();
        
        if (!createForm.team || !createForm.position || !createForm.quantity) {
            setCreateError('Vui lòng nhập Phòng ban, Vị trí và Số lượng');
            return;
        }

        setCreateLoading(true);
        setCreateError('');
        const token = localStorage.getItem('access_token');
        
        try {
            const bodyData = {
                team: createForm.team,
                position: createForm.position,
                hrLevel: createForm.hrLevel,
                note: createForm.note,
                quantity: createForm.quantity,
                expiredDate: createForm.expiredDate || null,
                startDate: createForm.startDate || null,
                createdBy: createForm.createdBy,
                pic: createForm.pic
            };

            const response = await fetch(`http://localhost:3000/api/recruitment-order`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'accept': 'application/json'
                },
                body: JSON.stringify(bodyData)
            });

            if (response.status === 401) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('full_name');
                window.location.href = '/';
                return;
            }

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Tạo order thất bại');
            }

            message.success('Tạo order thành công');
            setIsCreateModalOpen(false);
            fetchOrders();
        } catch (err) {
            console.error('submitCreate error:', err);
            setCreateError(err.message || 'Lỗi khi tạo order');
        } finally {
            setCreateLoading(false);
        }
    };

    const openEdit = (order) => {
        setEditingOrder(order);
        setEditError('');
        setEditForm({
            team: order.team || '',
            position: order.position || '',
            hrLevel: order.hrLevel || '',
            quantity: order.quantity || '',
            startDate: order.startDate ? dayjs(order.startDate).format('YYYY-MM-DD') : '',
            expiredDate: order.expiredDate ? dayjs(order.expiredDate).format('YYYY-MM-DD') : '',
            pic: order.pic || '',
            createdBy: order.createdBy || '',
            note: order.note || ''
        });
        setIsEditModalOpen(true);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    const submitEdit = async (e) => {
        e.preventDefault();
        setEditLoading(true);
        setEditError('');
        const token = localStorage.getItem('access_token');
        
        try {
            const bodyData = {
                team: editForm.team,
                position: editForm.position,
                hrLevel: editForm.hrLevel,
                note: editForm.note,
                quantity: editForm.quantity,
                expiredDate: editForm.expiredDate || null,
                startDate: editForm.startDate || null,
                createdBy: editForm.createdBy,
                pic: editForm.pic
            };

            const response = await fetch(`http://localhost:3000/api/recruitment-order/${editingOrder.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'accept': 'application/json'
                },
                body: JSON.stringify(bodyData)
            });

            if (response.status === 401) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('full_name');
                window.location.href = '/';
                return;
            }

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Cập nhật thất bại');
            }

            message.success('Cập nhật order thành công');
            setIsEditModalOpen(false);
            fetchOrders();
        } catch (err) {
            console.error('submitEdit error:', err);
            setEditError(err.message || 'Lỗi khi cập nhật');
        } finally {
            setEditLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return dayjs(dateString).format('DD/MM/YYYY');
    };

    return (
        <div className="p-8 lg:p-12 bg-[#F8FAFC] min-h-screen relative">
            <style>{`
                @keyframes slideLeft {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
            {/* Header & Filters */}
            <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 shrink-0">
                    <h1 className="text-2xl font-extrabold text-[#0F172A] mb-1">Danh sách Order</h1>
                    <p className="text-[#64748B] font-medium text-sm">Quản lý yêu cầu tuyển dụng dành cho HR</p>
                </div>
                
                <div className="flex flex-wrap items-center justify-end gap-3 xl:flex-nowrap">
                    <div className="relative w-full sm:w-auto shrink-0">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input
                            type="text"
                            placeholder="Tìm theo vị trí, phòng ban..."
                            className="pl-11 pr-4 h-[44px] bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl w-full sm:w-[280px] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all font-medium text-sm text-[#0F172A] shadow-sm"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </div>
                    <Select 
                        value={teamFilter} 
                        onChange={setTeamFilter} 
                        size="large" 
                        className="w-full sm:w-[180px] shrink-0"
                        options={teamOptions}
                    />
                    <Select 
                        value={statusFilter} 
                        onChange={setStatusFilter} 
                        size="large" 
                        className="w-full sm:w-[160px] shrink-0"
                        options={statusOptions}
                    />
                    <button 
                        onClick={() => fetchOrders()}
                        className="w-[44px] h-[44px] rounded-xl bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#2563EB] hover:border-[#2563EB] hover:bg-blue-50 transition-all flex items-center justify-center shadow-sm shrink-0"
                        title="Tải lại"
                    >
                        <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin text-[#2563EB]' : ''}`}></i>
                    </button>
                    <button 
                        onClick={openCreate}
                        className="px-5 h-[44px] bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white font-bold rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 shrink-0 whitespace-nowrap"
                    >
                        <i className="fa-solid fa-plus"></i>
                        Tạo Order
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center gap-3">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    <p className="font-medium text-sm">{error}</p>
                </div>
            )}

            {/* Table */}
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                                {['STT', 'Phòng ban', 'Vị trí', 'Level', 'Số lượng', 'Trạng thái', 'Ngày bắt đầu - Hết hạn', 'PIC', 'Ghi chú', 'Thao tác'].map((h, i) => (
                                    <th key={i} className={`px-6 py-4 text-[11px] font-bold text-[#64748B] uppercase tracking-wider ${['STT', 'Số lượng', 'Trạng thái', 'Ngày bắt đầu - Hết hạn'].includes(h) ? 'text-center' : ''} ${h === 'Thao tác' ? 'text-right' : ''} ${h === 'STT' ? 'w-16' : ''} ${h === 'Vị trí' ? 'min-w-[180px]' : ''}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="10" className="px-6 py-6"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="px-6 py-16 text-center">
                                        <i className="fa-solid fa-inbox text-4xl text-slate-300 mb-3 block"></i>
                                        <p className="text-[#64748B] font-medium">Chưa có order tuyển dụng</p>
                                    </td>
                                </tr>
                            ) : filteredOrders.map((order, index) => (
                                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-sm font-bold text-[#64748B] text-center">
                                        {index + 1}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-[#0F172A] font-medium">{order.team || '—'}</td>
                                    <td className="px-6 py-4 min-w-[180px] whitespace-normal break-words leading-snug">
                                        <p className="text-sm font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">{order.position || '—'}</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-[#64748B]">{order.hrLevel || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-center">
                                        <span className="font-bold text-[#0F172A]">{order.quantity || '—'}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap ${getStatusColor(order.status)}`}>
                                            {getStatusLabel(order.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-center text-[#64748B]">
                                        {formatDate(order.startDate)} - {formatDate(order.expiredDate)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-[#0F172A]">{order.pic || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-[#64748B] max-w-[200px] truncate" title={order.note}>
                                        {order.note || '—'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => openEdit(order)}
                                                className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100 transition-all"
                                                title="Sửa"
                                            >
                                                <i className="fa-solid fa-pen text-xs"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Drawer Modal */}
            {isEditModalOpen && editingOrder && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={() => setIsEditModalOpen(false)}></div>
                    <div className="w-full sm:w-[520px] bg-[#FFFFFF] h-full shadow-2xl relative flex flex-col z-10 border-l border-[#E2E8F0]" style={{ animation: 'slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                        <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-white shrink-0">
                            <h2 className="text-xl font-extrabold text-[#0F172A]">Cập nhật Order #{editingOrder.id}</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-[#64748B] hover:bg-[#E2E8F0] transition-all">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1">
                            {editError && (
                                <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center gap-3">
                                    <i className="fa-solid fa-circle-exclamation"></i>
                                    <p className="font-medium text-sm">{editError}</p>
                                </div>
                            )}

                            <form id="editForm" onSubmit={submitEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {[
                                    { name: 'team', label: 'Phòng ban / Team', list: 'team-list', req: true, col: 2 },
                                    { name: 'position', label: 'Vị trí', list: 'position-list', req: true, col: 2 },
                                    { name: 'hrLevel', label: 'Level', list: 'hrLevel-list', col: 1 },
                                    { name: 'quantity', label: 'Số lượng', type: 'number', req: true, col: 1 },
                                    { name: 'startDate', label: 'Ngày bắt đầu', type: 'date', col: 1 },
                                    { name: 'expiredDate', label: 'Hạn tuyển', type: 'date', col: 1 },
                                    { name: 'pic', label: 'PIC', list: 'pic-list', col: 2 },
                                    { name: 'createdBy', label: 'Người tạo', col: 2 }
                                ].map((f, i) => (
                                    <div key={i} className={`space-y-1.5 ${f.col === 2 ? 'sm:col-span-2' : ''}`}>
                                        <label className="text-sm font-bold text-[#0F172A]">{f.label} {f.req && <span className="text-red-500">*</span>}</label>
                                        <input 
                                            type={f.type || "text"} name={f.name} list={f.list} value={editForm[f.name]} onChange={handleEditChange} 
                                            className="w-full px-4 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all text-sm" 
                                        />
                                    </div>
                                ))}
                                <div className="space-y-1.5 sm:col-span-2">
                                    <label className="text-sm font-bold text-[#0F172A]">Ghi chú</label>
                                    <textarea 
                                        name="note" value={editForm.note} onChange={handleEditChange} rows="3"
                                        className="w-full px-4 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all text-sm resize-none" 
                                    ></textarea>
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t border-[#E2E8F0] flex justify-end gap-3 bg-white shrink-0 sticky bottom-0">
                            <button 
                                onClick={() => setIsEditModalOpen(false)}
                                disabled={editLoading}
                                className="px-5 py-2.5 bg-white border border-[#E2E8F0] text-[#64748B] font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                Hủy
                            </button>
                            <button 
                                type="submit"
                                form="editForm"
                                disabled={editLoading}
                                className="px-5 py-2.5 bg-[#2563EB] text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                {editLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                                Lưu thay đổi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Drawer Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={() => setIsCreateModalOpen(false)}></div>
                    <div className="w-full sm:w-[520px] bg-[#FFFFFF] h-full shadow-2xl relative flex flex-col z-10 border-l border-[#E2E8F0]" style={{ animation: 'slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                        <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-white shrink-0">
                            <h2 className="text-xl font-extrabold text-[#0F172A]">Tạo Order mới</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-[#64748B] hover:bg-[#E2E8F0] transition-all">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1">
                            {createError && (
                                <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center gap-3">
                                    <i className="fa-solid fa-circle-exclamation"></i>
                                    <p className="font-medium text-sm">{createError}</p>
                                </div>
                            )}

                            <form id="createForm" onSubmit={submitCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {[
                                    { name: 'team', label: 'Phòng ban / Team', list: 'team-list', req: true, col: 2, ph: 'Ví dụ: Backend' },
                                    { name: 'position', label: 'Vị trí', list: 'position-list', req: true, col: 2, ph: 'Ví dụ: Backend Developer' },
                                    { name: 'hrLevel', label: 'Level', list: 'hrLevel-list', col: 1 },
                                    { name: 'quantity', label: 'Số lượng', type: 'number', req: true, col: 1 },
                                    { name: 'startDate', label: 'Ngày bắt đầu', type: 'date', col: 1 },
                                    { name: 'expiredDate', label: 'Hạn tuyển', type: 'date', col: 1 },
                                    { name: 'pic', label: 'PIC', list: 'pic-list', col: 2 },
                                    { name: 'createdBy', label: 'Người tạo', col: 2 }
                                ].map((f, i) => (
                                    <div key={i} className={`space-y-1.5 ${f.col === 2 ? 'sm:col-span-2' : ''}`}>
                                        <label className="text-sm font-bold text-[#0F172A]">{f.label} {f.req && <span className="text-red-500">*</span>}</label>
                                        <input 
                                            type={f.type || "text"} name={f.name} list={f.list} value={createForm[f.name]} onChange={handleCreateChange} placeholder={f.ph}
                                            className="w-full px-4 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all text-sm" 
                                        />
                                    </div>
                                ))}
                                <div className="space-y-1.5 sm:col-span-2">
                                    <label className="text-sm font-bold text-[#0F172A]">Ghi chú</label>
                                    <textarea 
                                        name="note" value={createForm.note} onChange={handleCreateChange} rows="3"
                                        className="w-full px-4 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all text-sm resize-none" 
                                    ></textarea>
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t border-[#E2E8F0] flex justify-end gap-3 bg-white shrink-0 sticky bottom-0">
                            <button 
                                onClick={() => setIsCreateModalOpen(false)}
                                disabled={createLoading}
                                className="px-5 py-2.5 bg-white border border-[#E2E8F0] text-[#64748B] font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                Hủy
                            </button>
                            <button 
                                type="submit"
                                form="createForm"
                                disabled={createLoading}
                                className="px-5 py-2.5 bg-[#2563EB] text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                {createLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-plus"></i>}
                                Tạo mới
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <datalist id="team-list">
                {teamOptions.filter(t => t.value !== 'Tất cả phòng ban').map(t => <option key={t.value} value={t.value} />)}
            </datalist>
            <datalist id="position-list">
                {positionOptions.map(p => <option key={p} value={p} />)}
            </datalist>
            <datalist id="hrLevel-list">
                {hrLevelOptions.map(l => <option key={l} value={l} />)}
            </datalist>
            <datalist id="pic-list">
                {picOptions.map(p => <option key={p} value={p} />)}
            </datalist>
        </div>
    );
};

export default RecruitmentOrders;
