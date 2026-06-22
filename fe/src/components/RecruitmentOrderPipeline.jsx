import React, { useState, useEffect, useMemo } from 'react';
import { message, Select } from 'antd';
import dayjs from 'dayjs';

const RecruitmentOrderPipeline = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [searchText, setSearchText] = useState('');
    const [teamFilter, setTeamFilter] = useState('Tất cả phòng ban');
    
    const [draggedOrder, setDraggedOrder] = useState(null);
    const [dragOverCol, setDragOverCol] = useState(null);
    
    // Update State
    const [updatingOrderId, setUpdatingOrderId] = useState(null);

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

    const filteredOrders = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();
        return orders.filter(order => {
            const matchSearch = !keyword || [
                order.position, order.team, order.pic, order.createdBy, order.note
            ].filter(Boolean).join(' ').toLowerCase().includes(keyword);

            const matchTeam = teamFilter === 'Tất cả phòng ban' || order.team === teamFilter;

            return matchSearch && matchTeam;
        });
    }, [orders, searchText, teamFilter]);

    const handleDrop = async (e, newStatus) => {
        e.preventDefault();
        if (!draggedOrder || updatingOrderId) return;
        if (draggedOrder.status === newStatus) {
            setDraggedOrder(null);
            return;
        }

        const orderId = draggedOrder.id;
        const pic = draggedOrder.pic || "";
        
        setUpdatingOrderId(orderId);
        setDraggedOrder(null);

        const token = localStorage.getItem('access_token');
        try {
            const response = await fetch(`http://localhost:3000/api/recruitment-order/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'accept': 'application/json'
                },
                body: JSON.stringify({
                    status: newStatus,
                    pic: pic
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
                throw new Error(result.message || 'Cập nhật trạng thái thất bại');
            }

            message.success('Cập nhật trạng thái order thành công');
            fetchOrders();
        } catch (err) {
            console.error('updateStatus error:', err);
            message.error(err.message || 'Lỗi khi cập nhật trạng thái');
        } finally {
            setUpdatingOrderId(null);
        }
    };

    const columns = [
        { id: 'pending', title: 'Chờ duyệt', icon: 'fa-hourglass-half', bgColor: 'bg-[#FEFCE8]', borderColor: 'border-[#FDE68A]', leftBorder: 'border-l-[#FDE68A]', titleColor: 'text-[#B45309]', badgeColor: 'bg-[#FDE68A]/50 text-[#B45309]' },
        { id: 'inprogress', title: 'Đang tuyển', icon: 'fa-spinner', bgColor: 'bg-[#EFF6FF]', borderColor: 'border-[#BFDBFE]', leftBorder: 'border-l-[#BFDBFE]', titleColor: 'text-[#2563EB]', badgeColor: 'bg-[#BFDBFE]/50 text-[#2563EB]' },
        { id: 'closed', title: 'Đã đóng', icon: 'fa-check', bgColor: 'bg-[#ECFDF5]', borderColor: 'border-[#BBF7D0]', leftBorder: 'border-l-[#BBF7D0]', titleColor: 'text-[#059669]', badgeColor: 'bg-[#BBF7D0]/50 text-[#059669]' },
        { id: 'cancelled', title: 'Đã hủy', icon: 'fa-ban', bgColor: 'bg-[#F8FAFC]', borderColor: 'border-[#CBD5E1]', leftBorder: 'border-l-[#CBD5E1]', titleColor: 'text-[#475569]', badgeColor: 'bg-[#CBD5E1]/50 text-[#475569]' },
        { id: 'expired', title: 'Hết hạn', icon: 'fa-calendar-xmark', bgColor: 'bg-[#FEF2F2]', borderColor: 'border-[#FECACA]', leftBorder: 'border-l-[#FECACA]', titleColor: 'text-[#DC2626]', badgeColor: 'bg-[#FECACA]/50 text-[#DC2626]' },
    ];

    const getOrdersByStatus = (status) => filteredOrders.filter(o => o.status === status);

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return dayjs(dateString).format('DD/MM/YYYY');
    };

    const renderCardContent = (order, colId) => {
        const header = (
            <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-bold text-[#0F172A] text-sm leading-snug line-clamp-2" title={order.position}>
                    {order.position || '—'}
                </h4>
                <span className="text-[10px] font-bold text-[#64748B] bg-slate-100 px-2 py-1 rounded shrink-0">#{order.id}</span>
            </div>
        );

        const teamLine = (
            <p className="text-xs text-[#475569] font-medium flex items-center gap-1.5 mb-3 line-clamp-1">
                <i className="fa-solid fa-users text-[10px] text-[#64748B]"></i>
                {order.team || '—'}
            </p>
        );

        const basicInfoGrid = (
            <>
                <div>
                    <p className="font-medium mb-0.5">Level</p>
                    <p className="font-bold text-[#0F172A] truncate" title={order.hrLevel}>{order.hrLevel || '—'}</p>
                </div>
                <div>
                    <p className="font-medium mb-0.5">Số lượng</p>
                    <p className="font-bold text-[#0F172A]">{order.quantity || '—'}</p>
                </div>
            </>
        );

        const renderFooter = (dateLabel, dateValue) => (
            <div className="px-3.5 py-3 bg-white border-t border-[#E2E8F0] flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#64748B]">PIC: <span className="font-bold text-[#0F172A]">{order.pic || '—'}</span></span>
                    <span className="text-[#64748B] text-right">
                        Tạo bởi: <span className="font-medium text-[#0F172A] line-clamp-1 truncate max-w-[80px] inline-block align-bottom" title={order.createdBy}>{order.createdBy || '—'}</span>
                    </span>
                </div>
                {(dateLabel || dateValue) && (
                    <div className="flex justify-between items-center text-[10px] text-[#64748B]">
                        <span>{dateLabel}</span>
                        <span className="font-medium text-[#475569]">{formatDate(dateValue)}</span>
                    </div>
                )}
                {order.note && (
                    <div className="text-[11px] text-[#475569] bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0] mt-1">
                        <p className="line-clamp-2" title={order.note}>
                            <span className="font-semibold text-[#475569] mr-1">Note:</span>
                            {order.note}
                        </p>
                    </div>
                )}
            </div>
        );

        switch (colId) {
            case 'pending':
                return (
                    <>
                        <div className="p-3.5 flex flex-col">
                            {header}
                            {teamLine}
                            <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-[11px] text-[#475569] bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0]">
                                {basicInfoGrid}
                                <div className="col-span-2 pt-1.5 border-t border-[#E2E8F0] mt-0.5 flex items-center justify-between">
                                    <span className="font-medium">Bắt đầu: <span className="font-bold text-[#0F172A]">{formatDate(order.startDate)}</span></span>
                                </div>
                                <div className="col-span-2 flex items-center justify-between">
                                    <span className="font-medium">Hạn tuyển: <span className="font-bold text-[#0F172A]">{formatDate(order.expiredDate)}</span></span>
                                </div>
                            </div>
                        </div>
                        {renderFooter('Cập nhật:', order.updatedAt || order.createdAt || order.startDate)}
                    </>
                );

            case 'inprogress':
                const q = parseInt(order.quantity) || 0;
                const c = parseInt(order.completedQuantity) || 0;
                const percent = q > 0 ? Math.min(100, Math.round((c / q) * 100)) : 0;
                
                return (
                    <>
                        <div className="p-3.5 flex flex-col">
                            {header}
                            {teamLine}
                            <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-[11px] text-[#475569] bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0] mb-3">
                                {basicInfoGrid}
                                <div className="col-span-2 pt-1.5 border-t border-[#E2E8F0] mt-0.5 flex items-center justify-between">
                                    <span className="font-medium">Bắt đầu: <span className="font-bold text-[#0F172A]">{formatDate(order.startDate)}</span></span>
                                </div>
                                <div className="col-span-2 flex items-center justify-between">
                                    <span className="font-medium">Hạn tuyển: <span className="font-bold text-[#0F172A]">{formatDate(order.expiredDate)}</span></span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5 text-[11px]">
                                <div className="flex justify-between items-center text-[#475569] font-medium">
                                    <span>Tiến độ</span>
                                    <span className="text-[#2563EB] font-bold">{c}/{q}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-[#2563EB] h-1.5 rounded-full transition-all duration-300" style={{ width: `${percent}%` }}></div>
                                </div>
                            </div>
                        </div>
                        {renderFooter('Cập nhật:', order.updatedAt || order.createdAt || order.startDate)}
                    </>
                );

            case 'closed':
                const cq = parseInt(order.quantity) || 0;
                const cc = order.completedQuantity !== undefined ? order.completedQuantity : cq;
                return (
                    <>
                        <div className="p-3.5 flex flex-col">
                            {header}
                            {teamLine}
                            <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-[11px] text-[#475569] bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0]">
                                {basicInfoGrid}
                                <div className="col-span-2 pt-1.5 border-t border-[#E2E8F0] mt-0.5 flex items-center justify-between">
                                    <span className="font-medium">Hoàn thành: <span className="font-bold text-[#059669]">{cc}/{cq}</span></span>
                                </div>
                                <div className="col-span-2 flex items-center justify-between">
                                    <span className="font-medium">Ngày đóng: <span className="font-bold text-[#0F172A]">{formatDate(order.closedDate || order.updatedAt || order.expiredDate)}</span></span>
                                </div>
                            </div>
                        </div>
                        {renderFooter('Cập nhật:', order.updatedAt || order.createdAt || order.closedDate)}
                    </>
                );

            case 'cancelled':
                return (
                    <>
                        <div className="p-3.5 flex flex-col">
                            {header}
                            {teamLine}
                            <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-[11px] text-[#475569] bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0]">
                                {basicInfoGrid}
                                <div className="col-span-2 pt-1.5 border-t border-[#E2E8F0] mt-0.5 flex items-center justify-between">
                                    <span className="font-medium">Ngày hủy: <span className="font-bold text-[#0F172A]">{formatDate(order.cancelledDate || order.updatedAt || order.expiredDate)}</span></span>
                                </div>
                            </div>
                        </div>
                        {renderFooter('Cập nhật:', order.updatedAt || order.createdAt || order.cancelledDate)}
                    </>
                );

            case 'expired':
                return (
                    <>
                        <div className="p-3.5 flex flex-col">
                            {header}
                            {teamLine}
                            <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-[11px] text-[#475569] bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0]">
                                {basicInfoGrid}
                                <div className="col-span-2 pt-1.5 border-t border-[#E2E8F0] mt-0.5 flex items-center justify-between">
                                    <span className="font-medium">Bắt đầu: <span className="font-bold text-[#0F172A]">{formatDate(order.startDate)}</span></span>
                                </div>
                                <div className="col-span-2 flex items-center justify-between text-[#DC2626]">
                                    <span className="font-medium">Hạn tuyển: <span className="font-bold">{formatDate(order.expiredDate)}</span></span>
                                </div>
                            </div>
                        </div>
                        {renderFooter('Cập nhật:', order.updatedAt || order.createdAt || order.expiredDate)}
                    </>
                );

            default:
                return null;
        }
    };

    return (
        <div className="w-full min-w-0 p-6 lg:p-8 bg-[#F8FAFC] min-h-[calc(100vh-64px)] flex flex-col overflow-x-hidden">
            {/* Header & Filters */}
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between shrink-0">
                <div className="min-w-0 shrink-0">
                    <h1 className="text-2xl font-extrabold text-[#0F172A] mb-1">Quản lý quy trình Order</h1>
                    <p className="text-[#64748B] font-medium text-sm">{filteredOrders.length} đơn tuyển dụng</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 xl:flex-nowrap">
                    <Select 
                        value={teamFilter} 
                        onChange={setTeamFilter} 
                        size="large" 
                        className="w-full sm:w-[180px] shrink-0 h-[44px]"
                        options={teamOptions}
                    />
                    <div className="relative w-full sm:w-auto shrink-0">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            className="pl-11 pr-4 h-[44px] bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl w-full sm:w-[280px] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all font-medium text-sm text-[#0F172A] shadow-sm"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => fetchOrders()}
                        className="h-[44px] px-4 rounded-xl bg-white border border-[#CBD5E1] text-[#64748B] hover:text-[#2563EB] hover:border-[#2563EB] hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-sm shrink-0 font-medium text-sm"
                    >
                        <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin text-[#2563EB]' : ''}`}></i>
                        Tải lại
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center gap-3 shrink-0">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    <p className="font-medium text-sm">{error}</p>
                </div>
            )}

            {/* Kanban Board */}
            <div className="w-full overflow-x-auto pb-4">
                <div className="flex gap-4 min-w-max">
                    {columns.map(col => {
                        const colOrders = getOrdersByStatus(col.id);
                        return (
                            <div key={col.id} className={`flex flex-col w-[320px] min-w-[320px] max-w-[320px] h-[calc(100vh-220px)] min-h-[560px] rounded-2xl border ${col.borderColor} ${col.bgColor} shadow-sm shrink-0 overflow-hidden`}>
                                <div className="px-4 flex items-center justify-between border-b border-black/5 shrink-0 h-[56px]">
                                    <div className="flex items-center gap-2">
                                        <i className={`fa-solid ${col.icon} ${col.titleColor}`}></i>
                                        <h3 className={`font-bold ${col.titleColor}`}>{col.title}</h3>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${col.badgeColor}`}>
                                        {colOrders.length}
                                    </span>
                                </div>

                                <div 
                                    className={`p-3 h-full overflow-y-auto space-y-3 transition-colors ${dragOverCol === col.id ? 'bg-black/5' : ''}`}
                                    onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
                                    onDragLeave={() => setDragOverCol(null)}
                                    onDrop={(e) => { setDragOverCol(null); handleDrop(e, col.id); }}
                                >
                                    {loading ? (
                                        <div className="animate-pulse space-y-3">
                                            {[1, 2].map(i => <div key={i} className="h-32 bg-white/50 rounded-xl border border-white"></div>)}
                                        </div>
                                    ) : colOrders.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center">
                                            <i className="fa-solid fa-box-open text-4xl text-[#94A3B8] mb-3 block"></i>
                                            <p className="text-sm font-medium text-[#94A3B8]">Không có order nào</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 pb-2">
                                            {colOrders.map(order => (
                                                <div 
                                                    key={order.id} 
                                                    draggable={updatingOrderId !== order.id}
                                                    onDragStart={() => setDraggedOrder(order)}
                                                    onDragEnd={() => setDraggedOrder(null)}
                                                    className={`bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all overflow-hidden border-l-4 flex flex-col ${col.leftBorder} ${updatingOrderId !== order.id ? 'cursor-grab active:cursor-grabbing' : 'opacity-50 pointer-events-none'} ${draggedOrder?.id === order.id ? 'opacity-60 ring-2 ring-indigo-300' : ''}`}
                                                >
                                                    {renderCardContent(order, col.id)}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default RecruitmentOrderPipeline;

