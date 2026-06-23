import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';

const API_BASE_URL = 'http://localhost:3000';

const ICONS = {
    home: 'fa-house',
    recruitment_management: 'fa-users-gear',
    recruitment_candidate_list: 'fa-user-group',
    recruitment_pipeline: 'fa-diagram-project',
    recruitment_manager_management: 'fa-user-tie',
    recruitment_order_management: 'fa-file-invoice',
    recruitment_order_pipeline: 'fa-bars-progress',
    recruitment_report: 'fa-chart-pie',
    recruitment_report_overview: 'fa-chart-simple',
    recruitment_report_effectiveness: 'fa-bolt',
    recruitment_report_speed: 'fa-gauge-high',

    // Manager-side pages nếu backend trả code khác
    recruitment_my_candidates: 'fa-user-check',
    recruitment_assigned_orders: 'fa-file-signature',
    recruitment_candidate_data: 'fa-database',
};

const getIcon = (code = '') => ICONS[code] || 'fa-circle-dot';

const getInitials = (name = '') => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    return parts.slice(-2).map((part) => part[0]).join('').toUpperCase();
};

const flattenMenus = (menus = []) => {
    const result = [];

    menus.forEach((menu) => {
        if (menu?.sub?.length) {
            menu.sub.forEach((sub) => result.push(sub));
        } else {
            result.push(menu);
        }
    });

    return result;
};

const inferRoleLabel = (menus = []) => {
    const allItems = flattenMenus(menus);
    const text = allItems
        .map((item) => `${item?.code || ''} ${item?.name || ''} ${item?.path || ''}`)
        .join(' ')
        .toLowerCase();

    if (
        text.includes('ứng viên của tôi') ||
        text.includes('data ứng viên') ||
        text.includes('my candidate') ||
        text.includes('assigned') ||
        text.includes('manager')
    ) {
        return 'Quản lý tuyển dụng';
    }

    if (
        text.includes('báo cáo') ||
        text.includes('report') ||
        text.includes('kho ứng viên') ||
        text.includes('quản lý manager')
    ) {
        return 'HR';
    }

    return 'Người dùng';
};

const Layout = ({ children }) => {
    const [menus, setMenus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [user, setUser] = useState({
        name: localStorage.getItem('full_name') || 'Người dùng',
        role: 'Người dùng',
    });

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const token = localStorage.getItem('access_token');

        if (!token) {
            navigate('/');
            return;
        }

        fetchMenus(token);
    }, [navigate]);

    const fetchMenus = async (token) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/personnel/me/menus`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    accept: 'application/json',
                },
            });

            if (response.status === 401) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('full_name');
                navigate('/');
                return;
            }

            if (!response.ok) {
                setMenus([]);
                return;
            }

            const data = await response.json();
            const normalizedMenus = Array.isArray(data) ? data : [];

            setMenus(normalizedMenus);
            setUser({
                name: localStorage.getItem('full_name') || 'Người dùng',
                role: inferRoleLabel(normalizedMenus),
            });
        } catch (error) {
            console.error('fetchMenus error:', error);
            setMenus([]);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('full_name');
        navigate('/');
    };

    const pageTitle = useMemo(() => {
        if (location.pathname === '/home') return 'Tổng quan';

        for (const menu of menus) {
            if (menu.path === location.pathname) return menu.name;

            const sub = menu.sub?.find((item) => item.path === location.pathname);
            if (sub) return sub.name;
        }

        return 'HR Recruitment System';
    }, [location.pathname, menus]);

    const isActive = (path) => {
        if (!path) return false;
        return location.pathname === path;
    };

    const renderMenuItem = (item) => {
        let finalPath = item.path;

        // Fix incorrect backend paths
        const nameLower = (item.name || '').toLowerCase();
        if (nameLower.includes('ứng viên của tôi') || nameLower.includes('my candidate')) {
            finalPath = '/recruitment/my-candidates';
        } else if (nameLower.includes('data ứng viên') || nameLower.includes('candidate data')) {
            finalPath = '/recruitment/manager-candidate-data';
        } else if (finalPath === '/recruitment/my-candidate') {
            finalPath = '/recruitment/my-candidates';
        }

        const active = isActive(finalPath);
        const disabled = !finalPath || finalPath === '#';

        if (disabled) {
            return (
                <div
                    key={item.id || item.code || item.name}
                    className="lyt-nav-item"
                    style={{ opacity: 0.5, cursor: 'not-allowed' }}
                >
                    <i className={`fa-solid ${getIcon(item.code)} lyt-nav-icon`}></i>
                    <span>{item.name}</span>
                </div>
            );
        }

        return (
            <Link
                key={item.id || item.code || item.name}
                to={finalPath}
                className={`lyt-nav-item ${active ? 'lyt-nav-item--active' : ''}`}
                onClick={() => setIsSidebarOpen(false)}
            >
                <i className={`fa-solid ${getIcon(item.code)} lyt-nav-icon`}></i>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                </span>
            </Link>
        );
    };

    const enhancedChildren = React.isValidElement(children)
        ? React.cloneElement(children, { menus, user })
        : children;

    if (loading) {
        return (
            <div className="lyt-loading">
                <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 22, color: '#2563EB' }}></i>
                <span>Đang tải hệ thống...</span>
            </div>
        );
    }

    return (
        <div className="lyt-root" style={{ backgroundColor: '#EEF4FF', height: '100vh', display: 'flex', overflow: 'hidden' }}>
            <style>{`
                .lyt-sidebar { transition: width 0.2s ease, opacity 0.2s ease !important; width: 320px; flex-shrink: 0; display: flex; flex-direction: column; background-color: #FFFFFF !important; border-right: 1px solid #E2E8F0 !important; box-shadow: 2px 0 10px rgba(0,0,0,0.02); overflow: hidden; z-index: 10; }
                .lyt-sidebar--collapsed { width: 0 !important; border-right: none !important; opacity: 0; }
                .lyt-brand { padding: 32px 24px; display: flex; align-items: center; gap: 16px; width: 320px; box-sizing: border-box; }
                .lyt-brand-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
                .lyt-brand-name { font-weight: 800; color: #4F46E5; font-size: 18px; white-space: nowrap; }
                .lyt-brand-sub { display: none; }
                .lyt-nav { padding: 0 20px; flex: 1; overflow-y: auto; width: 320px; box-sizing: border-box; }
                .lyt-nav-group-label { font-size: 12px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin: 24px 0 8px 12px; white-space: nowrap; }
                .lyt-nav-item { border-radius: 16px !important; transition: all 0.2s ease !important; padding: 14px 16px !important; margin-bottom: 8px !important; display: flex; align-items: center; gap: 12px; color: #475569; text-decoration: none; font-weight: 600; white-space: nowrap; font-size: 15px; }
                .lyt-nav-item:hover { background-color: #F8FAFC !important; color: #334155; transform: translateX(2px); }
                .lyt-nav-item--active { background: linear-gradient(135deg, #EEF2FF, #EFF6FF) !important; color: #4F46E5 !important; font-weight: 800 !important; box-shadow: 0 4px 10px rgba(79,70,229,0.05); }
                .lyt-nav-item--active i { color: #4F46E5 !important; }
                .lyt-nav-icon { width: 24px !important; text-align: center !important; font-size: 20px; flex-shrink: 0; color: #94A3B8; transition: color 0.2s; }
                .lyt-user-area { padding: 24px; width: 320px; box-sizing: border-box; border-top: 1px solid #E2E8F0; }
                .lyt-user-row { display: none; }
                .lyt-avatar { width: 36px; height: 36px; border-radius: 50%; background: #4F46E5; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }
                .lyt-user-name { font-weight: 700; color: #1E1B4B; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .lyt-logout-btn { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 16px; border-radius: 12px; color: #DC2626; font-weight: 600; border: none; background: transparent; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
                .lyt-logout-btn:hover { background-color: #FEF2F2; }
                
                .lyt-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
                .lyt-header { background-color: #FFFFFF !important; border-bottom: 1px solid #E2E8F0 !important; height: 72px !important; display: flex; align-items: center; padding: 0 24px; justify-content: space-between; flex-shrink: 0; }
                .lyt-header-left { display: flex; align-items: center; gap: 20px; min-width: 0; }
                .lyt-header-right { display: flex; align-items: center; gap: 24px; flex-shrink: 0; }
                .lyt-breadcrumb { color: #94A3B8 !important; font-weight: 500; font-size: 15px; display: flex; align-items: center; gap: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .lyt-breadcrumb-page { color: #1E1B4B !important; font-weight: 700; }
                .lyt-desktop-toggle { background: #FFFFFF; border: 1px solid #CBD5E1; cursor: pointer; font-size: 18px; color: #334155; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 14px; transition: all 0.2s; flex-shrink: 0; padding: 0; }
                .lyt-desktop-toggle:hover { background: #F8FAFC; }
                .lyt-content { flex: 1; min-width: 0; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; }
                .lyt-content-inner { width: 100%; min-width: 0; padding: 32px; box-sizing: border-box; }
                
                @media (max-width: 1024px) {
                    .lyt-desktop-toggle { display: none !important; }
                    .lyt-sidebar { position: fixed !important; top: 0; left: 0; height: 100vh; z-index: 50; transform: translateX(-100%); width: 320px !important; opacity: 1 !important; border-right: 1px solid #E2E8F0 !important; transition: transform 0.3s ease !important; }
                    .lyt-sidebar--mobile-open { transform: translateX(0); }
                    .lyt-mobile-toggle { background: #FFFFFF; border: 1px solid #CBD5E1; font-size: 18px; color: #334155; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 14px; flex-shrink: 0; }
                }
                @media (min-width: 1025px) {
                    .lyt-mobile-toggle { display: none !important; }
                }
            `}</style>
            {isSidebarOpen && (
                <div className="lyt-sidebar-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 45 }} onClick={() => setIsSidebarOpen(false)}></div>
            )}
            <aside className={`lyt-sidebar ${isSidebarOpen ? 'lyt-sidebar--mobile-open' : ''} ${isSidebarCollapsed ? 'lyt-sidebar--collapsed' : ''}`}>
                <div className="lyt-brand">
                    <div className="lyt-brand-icon" style={{ background: 'transparent', width: '40px', height: '40px', padding: 0 }}>
                        <img src="/cg-logo.png" alt="CG Studio" style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} />
                    </div>

                    <div style={{ minWidth: 0 }}>
                        <div className="lyt-brand-name">CG Studio</div>
                    </div>
                </div>

                <nav className="lyt-nav">
                    {menus.length === 0 ? (
                        <div className="lyt-nav-empty" style={{ padding: '20px 12px', color: '#94A3B8', fontSize: '14px', textAlign: 'center' }}>Chưa có menu khả dụng</div>
                    ) : (
                        menus.map((menu) => (
                            <div key={menu.id || menu.code || menu.name} className="lyt-nav-group">
                                {menu.sub?.length > 0 && <div className="lyt-nav-group-label">{menu.name}</div>}

                                {menu.sub?.length
                                    ? menu.sub.map((sub) => renderMenuItem(sub))
                                    : renderMenuItem(menu)}
                            </div>
                        ))
                    )}
                </nav>

                <div className="lyt-user-area">
                    <button type="button" className="lyt-logout-btn" onClick={handleLogout}>
                        <i className="fa-solid fa-arrow-right-from-bracket"></i>
                        <span>Đăng xuất</span>
                    </button>
                </div>
            </aside>

            <div className="lyt-main">
                <header className="lyt-header">
                    <div className="lyt-header-left">
                        <button type="button" className="lyt-desktop-toggle" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
                            <i className="fa-solid fa-bars"></i>
                        </button>
                        <button type="button" className="lyt-mobile-toggle" onClick={() => setIsSidebarOpen(true)}>
                            <i className="fa-solid fa-bars"></i>
                        </button>

                        <div className="lyt-breadcrumb">
                            <span className="lyt-breadcrumb-root">CG Game Studio</span>
                            <i className="fa-solid fa-chevron-right lyt-breadcrumb-sep" style={{ fontSize: '12px', color: '#9CA3AF' }}></i>
                            <span className="lyt-breadcrumb-page">{pageTitle}</span>
                        </div>
                    </div>

                    <div className="lyt-header-right">
                        <div className="lyt-header-date" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', background: '#EEF2FF', color: '#4F46E5', padding: '6px 16px', borderRadius: '9999px', fontSize: '14px', border: '1px solid #C7D2FE' }}>
                            <i className="fa-regular fa-calendar"></i>
                            <span>
                                {(() => {
                                    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                                    const now = new Date();
                                    return `${days[now.getDay()]}, ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
                                })()}
                            </span>
                        </div>

                        <NotificationBell />

                        <div className="lyt-header-sep" style={{ width: '1px', height: '24px', background: '#E2E8F0' }}></div>

                        <div className="lyt-header-user" style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                            <div className="lyt-avatar" style={{ borderRadius: '14px', background: 'linear-gradient(135deg, #6366F1, #A855F7)' }}>{getInitials(user.name)}</div>
                            <span className="lyt-header-username" style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>{user.name}</span>
                        </div>
                    </div>
                </header>

                <main className="lyt-content">
                    <div className="lyt-content-inner">
                        {enhancedChildren}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;