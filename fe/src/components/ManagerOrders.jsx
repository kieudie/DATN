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

const ManagerOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const limit = 12;

    // Filters
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState('Tất cả');

    // Modal
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

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
        
        const email = getEmailFromToken();
        if (!email) {
            setOrders([]);
            setTotalItems(0);
            setTotalPages(1);
            setError("Không tìm thấy email trong token đăng nhập.");
            setLoading(false);
            return;
        }

        const token = localStorage.getItem('access_token');
        try {
            const url = `http://localhost:3000/api/recruitment-order/manager/all?email=${encodeURIComponent(email)}`;
            const response = await fetch(url, {
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
            
            const list = Array.isArray(result.data) ? result.data : [];
            setOrders(list);
            setTotalItems(result.totalItems || list.length);
            setCurrentPage(result.currentPage || 1);
            setTotalPages(result.totalPages || 1);
            
        } catch (error) {
            console.error('fetchOrders error:', error);
            setError(error.message || 'Lỗi');
            setOrders([]);
            message.error('Không thể tải danh sách order');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const filteredOrders = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();
        return orders.filter(order => {
            const matchSearch = !keyword || [
                order.position, order.hrLevel, order.team, order.pic, order.createdBy, order.note
            ].filter(Boolean).join(' ').toLowerCase().includes(keyword);

            const matchStatus = statusFilter === 'Tất cả' || order.status === statusFilter;

            return matchSearch && matchStatus;
        });
    }, [orders, searchText, statusFilter]);

    const openDetail = (order) => {
        setSelectedOrder(order);
        setIsDetailModalOpen(true);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return dayjs(dateString).format('DD/MM/YYYY');
    };

    const teamOptionsCreate = useMemo(() => Array.from(new Set(orders.map(o => o.team).filter(Boolean))), [orders]);
    const positionOptionsCreate = useMemo(() => Array.from(new Set(orders.map(o => o.position).filter(Boolean))), [orders]);
    const levelOptionsCreate = useMemo(() => Array.from(new Set(orders.map(o => o.hrLevel).filter(Boolean))), [orders]);
    const picOptionsCreate = useMemo(() => Array.from(new Set(orders.map(o => o.pic).filter(Boolean))), [orders]);

    const handleCreateChange = (e) => {
        const { name, value } = e.target;
        setCreateForm(prev => ({ ...prev, [name]: value }));
    };

    const openCreate = () => {
        setCreateError('');
        let defaultTeam = '';
        if (orders.length > 0 && orders[0].team) {
            defaultTeam = orders[0].team;
        } else {
            const email = getEmailFromToken();
            if (email) {
                const parts = email.split('@')[0].split('.');
                if (parts.length > 1) {
                    defaultTeam = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
                }
            }
        }
        
        setCreateForm({
            team: defaultTeam, position: '', hrLevel: '', quantity: '1', startDate: '', expiredDate: '', pic: '', createdBy: getEmailFromToken(), note: ''
        });
        setIsCreateModalOpen(true);
    };

    const submitCreate = async (e) => {
        e.preventDefault();
        
        if (!createForm.team || !createForm.position || !createForm.quantity) {
            setCreateError('Vui lòng điền các trường bắt buộc (*)');
            return;
        }

        setCreateLoading(true);
        setCreateError('');
        const token = localStorage.getItem('access_token');
        
        try {
            const response = await fetch(`http://localhost:3000/api/recruitment-order`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'accept': 'application/json'
                },
                body: JSON.stringify({
                    team: createForm.team,
                    position: createForm.position,
                    hrLevel: createForm.hrLevel,
                    note: createForm.note,
                    quantity: createForm.quantity,
                    expiredDate: createForm.expiredDate || null,
                    startDate: createForm.startDate || null,
                    createdBy: createForm.createdBy,
                    pic: createForm.pic
                })
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

    return (
        <div className="p-8 lg:p-12 bg-[#F8FAFC] min-h-screen">
            {/* Header & Filters */}
            <div className="mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#0F172A] mb-2">Danh sách Order</h1>
                    <p className="text-[#64748B] font-medium">Quản lý yêu cầu tuyển dụng dành cho Recruitment Manager</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 xl:flex-nowrap">
                    <div className="relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input
                            type="text"
                            placeholder="Tìm theo vị trí, level..."
                            className="pl-11 pr-4 h-[44px] bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl w-64 md:w-72 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all font-medium text-sm text-[#0F172A] shadow-sm"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </div>
                    <Select 
                        value={statusFilter} 
                        onChange={setStatusFilter} 
                        size="large" 
                        className="w-40 shrink-0 h-[44px]"
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
                                {['STT', 'Vị trí', 'Level', 'Số lượng', 'Trạng thái', 'Thời gian', 'Ghi chú'].map((h, i) => (
                                    <th key={i} className={`px-6 py-4 text-[11px] font-bold text-[#64748B] uppercase tracking-wider ${['STT', 'Số lượng', 'Trạng thái', 'Thời gian'].includes(h) ? 'text-center' : ''} ${h === 'STT' ? 'w-16' : ''}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="7" className="px-6 py-6"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-16 text-center">
                                        <i className="fa-solid fa-inbox text-4xl text-slate-300 mb-3 block"></i>
                                        <p className="text-[#64748B] font-medium">Không tìm thấy yêu cầu tuyển dụng nào</p>
                                    </td>
                                </tr>
                            ) : filteredOrders.map((order, index) => (
                                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-sm font-bold text-[#64748B] text-center">
                                        {(currentPage - 1) * limit + index + 1}
                                    </td>
                                    <td className="px-6 py-4">
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
                                    <td className="px-6 py-4 text-sm text-[#64748B] max-w-[200px] truncate" title={order.note}>
                                        {order.note || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 bg-[#FFFFFF] border-t border-[#E2E8F0]">
                        <span className="text-sm text-[#64748B]">Trang {currentPage} / {totalPages}</span>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                disabled={currentPage === 1} 
                                className="w-8 h-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center disabled:opacity-50 hover:bg-slate-50 text-[#64748B]"
                            >
                                <i className="fa-solid fa-chevron-left text-xs"></i>
                            </button>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                                disabled={currentPage === totalPages} 
                                className="w-8 h-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center disabled:opacity-50 hover:bg-slate-50 text-[#64748B]"
                            >
                                <i className="fa-solid fa-chevron-right text-xs"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {isDetailModalOpen && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDetailModalOpen(false)}></div>
                    <div className="bg-[#FFFFFF] w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-xl relative flex flex-col z-10 overflow-hidden animate-slide-up">
                        <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50">
                            <div>
                                <h2 className="text-xl font-extrabold text-[#0F172A]">Chi tiết Order #{selectedOrder.id}</h2>
                                <p className="text-sm text-[#64748B] mt-1">{selectedOrder.position || '—'} • {selectedOrder.team || '—'}</p>
                            </div>
                            <button onClick={() => setIsDetailModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-[#64748B] hover:bg-[#E2E8F0] transition-all">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[
                                    { label: 'Mã Order', content: `#${selectedOrder.id}` },
                                    { label: 'Trạng thái', content: <span className={`inline-flex items-center justify-center rounded-md border px-2.5 py-1 text-xs font-bold ${getStatusColor(selectedOrder.status)}`}>{getStatusLabel(selectedOrder.status)}</span> },
                                    { label: 'Vị trí', content: selectedOrder.position || '—' },
                                    { label: 'Team', content: selectedOrder.team || '—' },
                                    { label: 'Level', content: selectedOrder.hrLevel || '—' },
                                    { label: 'Số lượng / Đã xử lý', content: `${selectedOrder.quantity || '0'} / ${selectedOrder.processedCount || '0'}` },
                                    { label: 'Ngày bắt đầu', content: formatDate(selectedOrder.startDate) },
                                    { label: 'Hạn tuyển', content: formatDate(selectedOrder.expiredDate) },
                                    { label: 'PIC (Người phụ trách)', content: selectedOrder.pic || '—' },
                                    { label: 'Người tạo', content: selectedOrder.createdBy || '—' },
                                    { label: 'Ngày tạo', content: formatDate(selectedOrder.createdAt) },
                                    { label: 'Ngày cập nhật', content: formatDate(selectedOrder.updatedAt) }
                                ].map((field, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">{field.label}</label>
                                        <div className="text-sm font-medium text-[#0F172A]">{field.content}</div>
                                    </div>
                                ))}
                                <div className="col-span-1 md:col-span-2 space-y-1">
                                    <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Ghi chú</label>
                                    <div className="text-sm text-[#0F172A] p-4 bg-slate-50 rounded-lg border border-[#E2E8F0] whitespace-pre-wrap min-h-[80px]">
                                        {selectedOrder.note || 'Không có ghi chú'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-[#E2E8F0] flex justify-end bg-slate-50">
                            <button 
                                onClick={() => setIsDetailModalOpen(false)}
                                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#0F172A] font-bold text-sm rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideLeft {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
            
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

                            <form id="createForm" onSubmit={submitCreate} className="space-y-6">
                                {/* Top Info Box */}
                                <div className="bg-slate-50 border border-[#E2E8F0] rounded-xl p-4 flex flex-col gap-4 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                            <i className="fa-solid fa-user"></i>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Người tạo</p>
                                            <p className="font-bold text-[#0F172A] truncate">{createForm.createdBy}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                            <i className="fa-solid fa-building"></i>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Team</p>
                                            <p className="font-bold text-[#0F172A] truncate">{createForm.team || '—'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Form Fields */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {[
                                        { name: 'position', label: 'Vị trí', list: 'create-position-list', req: true, col: 2, ph: 'Ví dụ: Frontend Developer' },
                                        { name: 'hrLevel', label: 'Level', list: 'create-level-list', col: 1, ph: 'Ví dụ: Middle' },
                                        { name: 'quantity', label: 'Số lượng', type: 'number', req: true, col: 1, min: "1" },
                                        { name: 'startDate', label: 'Ngày bắt đầu', type: 'date', col: 1 },
                                        { name: 'expiredDate', label: 'Hạn tuyển', type: 'date', col: 1 }
                                    ].map((f, i) => (
                                        <div key={i} className={`space-y-1.5 ${f.col === 2 ? 'sm:col-span-2' : ''}`}>
                                            <label className="text-sm font-bold text-[#0F172A]">{f.label} {f.req && <span className="text-red-500">*</span>}</label>
                                            <input 
                                                type={f.type || "text"} name={f.name} list={f.list} value={createForm[f.name]} onChange={handleCreateChange} placeholder={f.ph} min={f.min}
                                                className="w-full px-4 py-2.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all text-sm shadow-sm" 
                                            />
                                        </div>
                                    ))}
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <label className="text-sm font-bold text-[#0F172A]">Ghi chú</label>
                                        <textarea 
                                            name="note" value={createForm.note} onChange={handleCreateChange} rows="3" 
                                            placeholder="Nhập ghi chú thêm..."
                                            className="w-full px-4 py-2.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all text-sm resize-none shadow-sm" 
                                        ></textarea>
                                    </div>
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
            
            <datalist id="create-team-list">
                {teamOptionsCreate.map(t => <option key={t} value={t} />)}
            </datalist>
            <datalist id="create-position-list">
                {positionOptionsCreate.map(p => <option key={p} value={p} />)}
            </datalist>
            <datalist id="create-level-list">
                {levelOptionsCreate.map(l => <option key={l} value={l} />)}
            </datalist>
            <datalist id="create-pic-list">
                {picOptionsCreate.map(p => <option key={p} value={p} />)}
            </datalist>
        </div>
    );
};

export default ManagerOrders;
