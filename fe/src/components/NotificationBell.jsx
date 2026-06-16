import React, { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';

const getPossibleIdentifiers = () => {
    const highPriorityFields = [
        'personnelCode', 'personnel_code', 'employeeCode', 'employee_code',
        'staffCode', 'staff_code', 'userCode', 'user_code', 'code', 'username'
    ];
    const lowPriorityFields = ['user_id', 'userId', 'id', 'sub'];

    const identifiers = new Set();
    const availableFieldsLog = {}; // For debug logging

    const addId = (id) => { 
        if (!id) return;
        const strId = String(id).trim();
        if (strId !== '' && !strId.includes('@')) {
            identifiers.add(strId);
        }
    };

    const extractFromObj = (obj) => {
        if (!obj || typeof obj !== 'object') return;

        for (const [key, val] of Object.entries(obj)) {
            if (typeof val === 'string' || typeof val === 'number') availableFieldsLog[key] = val;
        }

        [...highPriorityFields, ...lowPriorityFields].forEach(field => obj[field] && addId(obj[field]));
    };

    // 1. JWT Access Token (Highest priority)
    const token = localStorage.getItem('access_token');
    if (token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const payload = JSON.parse(jsonPayload);
            extractFromObj(payload);
        } catch (e) {}
    }

    // 2. LocalStorage Keys (Only specific user/auth keys to avoid candidate/manager lists)
    const authKeys = ['user', 'auth', 'profile', 'account', 'current', 'login', 'session'];
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (authKeys.some(authKey => key.toLowerCase().includes(authKey))) {
            try {
                const raw = localStorage.getItem(key);
                if (raw && (raw.startsWith('{') || raw.startsWith('['))) {
                    const data = JSON.parse(raw);
                    ['', 'user', 'profile', 'account', 'data'].forEach(k => k ? extractFromObj(data?.[k]) : extractFromObj(data));
                }
            } catch (e) {}
        }
    }

    // 3. Fallback to root string items if nothing found yet
    if (identifiers.size === 0) {
        addId(localStorage.getItem('username'));
        addId(localStorage.getItem('code'));
    }

    const results = Array.from(identifiers);
    if (results.length === 0) {
        console.warn("Notification personnelCode not found. Available auth fields:", availableFieldsLog);
    }
    return results;
};

const normalizeNotification = (item) => {
    const id = item.id || item.notificationId || item.notification_id;
    const title = item.title || item.name || item.subject || item.type || 'Thông báo';
    const message = item.message || item.content || item.body || item.description || item.data?.message || '';
    const timeRaw = item.createdAt || item.created_at || item.time || item.timestamp;
    const time = timeRaw ? dayjs(timeRaw).format('HH:mm DD/MM/YYYY') : '';

    let unread = false;
    if (['isRead', 'read', 'seen'].some(k => item[k] === false) || ['UNREAD', 'unread'].includes(item.status)) unread = true;
    else if (item.readAt || item.read_at) unread = false;

    return { ...item, _id: id, _title: title, _message: message, _time: time, _unread: unread };
};

const NotificationBell = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [errorStatus, setErrorStatus] = useState(null);
    const [activePersonnelCode, setActivePersonnelCode] = useState(null);
    const dropdownRef = useRef(null);
    
    const fetchNotifications = async (showLoading = false) => {
        if (showLoading) setLoading(true);
        setError(null);
        setErrorStatus(null);
        
        let identifiersToTry = [];
        if (activePersonnelCode) {
            identifiersToTry = [activePersonnelCode];
        } else {
            identifiersToTry = getPossibleIdentifiers();
        }

        if (identifiersToTry.length === 0) {
            setError('Không tìm thấy mã nhân sự để tải thông báo');
            if (showLoading) setLoading(false);
            return;
        }

        const token = localStorage.getItem('access_token');
        let lastError = null;
        let lastStatus = null;
        let successResult = null;
        let successId = null;

        for (const pid of identifiersToTry) {
            const url = `http://localhost:3000/api/notification/${encodeURIComponent(pid)}`;
            try {
                const res = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    successResult = await res.json();
                    successId = pid;
                    break;
                } else {
                    const responseBody = await res.text().catch(() => '');
                    lastStatus = res.status;
                    lastError = 'Không tải được thông báo';
                    
                    if (res.status === 401 || res.status === 403) {
                         lastError = 'Bạn không có quyền xem thông báo';
                    }

                    console.warn("Notification fetch failed", {
                        personnelCode: pid,
                        url,
                        status: res.status,
                        response: responseBody
                    });
                }
            } catch (err) {
                 lastError = 'Không tải được thông báo';
                 lastStatus = 'Network Error';
                 console.warn("Notification fetch failed", {
                     personnelCode: pid,
                     url,
                     status: 'Network Error',
                     response: err.message
                 });
            }
        }

        if (successId) {
            if (!activePersonnelCode) {
                console.log(`Notification personnelCode resolved: ${successId}`);
                setActivePersonnelCode(successId);
            }
            
            const rawList = [successResult, successResult?.data, successResult?.notifications, successResult?.data?.notifications, successResult?.result].find(Array.isArray) || [];

            setNotifications(rawList.map(normalizeNotification));
        } else {
            setError(lastError || 'Không tải được thông báo');
            setErrorStatus(lastStatus);
        }

        if (showLoading) setLoading(false);
    };

    useEffect(() => {
        fetchNotifications(true);
        const interval = setInterval(() => fetchNotifications(false), 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id, e) => {
        if (e) e.stopPropagation();
        if (!activePersonnelCode) return;

        setNotifications(prev => prev.map(n => n._id === id ? { ...n, _unread: false } : n));

        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`http://localhost:3000/api/notification/${id}/read/${encodeURIComponent(activePersonnelCode)}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                // optional: revert state if failed
            }
        } catch (err) {
            console.error('Failed to mark as read', err);
        }
    };

    const markAllAsRead = async () => {
        if (!activePersonnelCode) return;

        setNotifications(prev => prev.map(n => ({ ...n, _unread: false })));

        try {
            const token = localStorage.getItem('access_token');
            await fetch(`http://localhost:3000/api/notification/read-all/${encodeURIComponent(activePersonnelCode)}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) {
            console.error('Failed to mark all as read', err);
        }
    };

    const unreadCount = notifications.filter(n => n._unread).length;

    return (
        <div className="relative" ref={dropdownRef} style={{ display: 'flex', alignItems: 'center' }}>
            <button 
                type="button" 
                className="lyt-notif-btn" 
                aria-label="Thông báo"
                onClick={() => setIsOpen(!isOpen)}
            >
                <i className="fa-regular fa-bell"></i>
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full border border-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-[360px] max-h-[480px] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-[#E2E8F0] overflow-hidden z-50 flex flex-col cursor-default">
                    <div className="flex items-center justify-between p-4 bg-[#2563EB] shrink-0 text-white">
                        <h3 className="text-base font-bold m-0 flex items-center gap-2">
                            Thông báo
                            {unreadCount > 0 && (
                                <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                    {unreadCount} mới
                                </span>
                            )}
                        </h3>
                        <div className="flex items-center gap-3">
                            <i className="fa-regular fa-bell text-white/80"></i>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between px-4 py-2 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                        <button 
                            onClick={() => fetchNotifications(true)}
                            className="text-[#64748B] hover:text-[#2563EB] transition-colors text-sm flex items-center gap-1"
                            title="Tải lại"
                        >
                            <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i>
                            Tải lại
                        </button>
                        {unreadCount > 0 && (
                            <button 
                                onClick={markAllAsRead}
                                className="text-xs font-medium text-[#2563EB] hover:text-blue-700 transition-colors"
                            >
                                Đánh dấu tất cả đã đọc
                            </button>
                        )}
                    </div>

                    <div className="overflow-y-auto flex-1 bg-white">
                        {!activePersonnelCode && error === 'Không tìm thấy mã nhân sự để tải thông báo' ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center">
                                <i className="fa-regular fa-id-badge text-4xl text-[#CBD5E1] mb-3"></i>
                                <p className="text-sm font-medium text-[#64748B]">Không tìm thấy mã nhân sự để tải thông báo</p>
                            </div>
                        ) : loading && notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center">
                                <i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#2563EB] mb-3"></i>
                                <p className="text-sm font-medium text-[#64748B]">Đang tải thông báo...</p>
                            </div>
                        ) : error && notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center">
                                <i className="fa-solid fa-triangle-exclamation text-4xl text-red-300 mb-3"></i>
                                <p className="text-sm font-medium text-red-500">{error} {errorStatus ? `(${errorStatus})` : ''}</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center">
                                <i className="fa-regular fa-bell-slash text-4xl text-[#CBD5E1] mb-3"></i>
                                <p className="text-sm font-medium text-[#64748B]">Bạn chưa có thông báo nào</p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {notifications.map((notif) => (
                                    <div 
                                        key={notif._id || Math.random()} 
                                        className="flex gap-3 p-4 border-b border-[#E2E8F0] last:border-0 hover:bg-[#F8FAFC] transition-colors relative group"
                                    >
                                        <div className="flex-1 min-w-0 pr-6">
                                            <h4 className={`text-sm mb-1 ${notif._unread ? 'font-bold text-[#0F172A]' : 'font-medium text-[#334155]'}`}>
                                                {notif._title}
                                            </h4>
                                            {notif._message && (
                                                <p className="text-sm text-[#475569] leading-snug mb-2 line-clamp-2">
                                                    {notif._message}
                                                </p>
                                            )}
                                            {notif._time && (
                                                <p className="text-xs text-[#94A3B8] font-medium flex items-center gap-1">
                                                    <i className="fa-regular fa-clock"></i> {notif._time}
                                                </p>
                                            )}
                                        </div>
                                        {notif._unread && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                                                <button 
                                                    onClick={(e) => markAsRead(notif._id, e)}
                                                    className="w-3 h-3 rounded-full bg-[#2563EB] hover:bg-blue-600 transition-all shadow-sm ring-4 ring-blue-50 cursor-pointer"
                                                    title="Đánh dấu đã đọc"
                                                ></button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
