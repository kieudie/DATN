import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const Layout = ({ children }) => {
    const [menus, setMenus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/');
            return;
        }

        const fullName = localStorage.getItem('full_name');
        setUser({ name: fullName || 'Người dùng', role: 'Quản trị viên' });

        fetchMenus(token);
    }, [navigate]);

    const fetchMenus = async (token) => {
        try {
            const response = await fetch('http://localhost:8086/api/personnel/me/menus', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'accept': '*/*'
                }
            });
            if (response.ok) {
                const data = await response.json();
                setMenus(data);
            } else if (response.status === 401) {
                localStorage.removeItem('access_token');
                navigate('/');
            }
        } catch (error) {
            console.error('Error fetching menus:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('full_name');
        navigate('/');
    };

    const getIcon = (code) => {
        const iconMap = {
            'home': 'fa-house',
            'recruitment_management': 'fa-users-gear',
            'recruitment_candidate_list': 'fa-user-group',
            'recruitment_pipeline': 'fa-diagram-project',
            'recruitment_manager_management': 'fa-user-tie',
            'recruitment_order_management': 'fa-file-invoice',
            'recruitment_order_pipeline': 'fa-bars-progress',
            'recruitment_report': 'fa-chart-pie',
            'recruitment_report_overview': 'fa-chart-simple',
            'recruitment_report_effectiveness': 'fa-bolt',
            'recruitment_report_speed': 'fa-gauge-high',
        };
        return iconMap[code] || 'fa-circle-dot';
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <i className="fa-solid fa-circle-notch animate-spin text-4xl text-brand-600"></i>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] flex">
            {/* Sidebar */}
            <aside className="w-72 bg-white border-r border-gray-100 flex flex-col hidden lg:flex sticky top-0 h-screen">
                <div className="p-8 flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-600/20">
                        <i className="fa-solid fa-bolt-lightning"></i>
                    </div>
                    <span className="text-xl font-bold text-gray-900 tracking-tight">TalentHub</span>
                </div>

                <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                    {menus.map(menu => (
                        <div key={menu.id} className="mb-4">
                            <div className="px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                {menu.name}
                            </div>
                            <div className="space-y-1">
                                {menu.sub && menu.sub.length > 0 ? (
                                    menu.sub.map(sub => {
                                        const isActive = location.pathname === sub.path;
                                        return (
                                            <Link 
                                                key={sub.id} 
                                                to={sub.path} 
                                                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all group ${
                                                    isActive ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' : 'text-gray-600 hover:bg-brand-50 hover:text-brand-600'
                                                }`}
                                            >
                                                <i className={`fa-solid ${getIcon(sub.code)} ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-brand-600'} transition-colors w-5 text-center`}></i>
                                                {sub.name}
                                            </Link>
                                        );
                                    })
                                ) : (
                                    <Link 
                                        to={menu.path} 
                                        className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all group ${
                                            location.pathname === menu.path ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' : 'text-gray-600 hover:bg-brand-50 hover:text-brand-600'
                                        }`}
                                    >
                                        <i className={`fa-solid ${getIcon(menu.code)} ${location.pathname === menu.path ? 'text-white' : 'text-gray-400 group-hover:text-brand-600'} transition-colors w-5 text-center`}></i>
                                        {menu.name}
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-50 space-y-4">
                    <div className="flex items-center gap-3 px-4 py-2">
                        <div className="w-10 h-10 rounded-full bg-brand-50 border-2 border-white shadow-sm flex items-center justify-center text-brand-600 overflow-hidden shrink-0">
                            <i className="fa-solid fa-user text-lg translate-y-1"></i>
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter truncate">{user?.role}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-all">
                        <i className="fa-solid fa-arrow-right-from-bracket w-5 text-center"></i>
                        Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-screen">
                {/* Header */}
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 flex items-center justify-end z-20 sticky top-0">
                    <div className="lg:hidden w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white mr-auto">
                        <i className="fa-solid fa-bolt-lightning"></i>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 hover:text-brand-600 transition-colors cursor-pointer relative">
                                <i className="fa-regular fa-bell"></i>
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 hover:text-brand-600 transition-colors cursor-pointer">
                                <i className="fa-regular fa-message"></i>
                            </div>
                        </div>
                        
                        <div className="h-8 w-px bg-gray-100 hidden lg:block"></div>

                        <div className="hidden lg:flex items-center gap-2 text-gray-400 text-xs font-medium">
                            <i className="fa-regular fa-calendar"></i>
                            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                    </div>
                </header>

                <div className="flex-1">
                    {React.cloneElement(children, { menus, user })}
                </div>
            </main>
        </div>
    );
};

export default Layout;
