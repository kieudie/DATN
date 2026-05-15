import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard = ({ menus, user }) => {
    // Flatten menus for the dashboard "Quick Access" view, excluding 'home'
    const quickAccessItems = (menus || []).reduce((acc, menu) => {
        if (menu.code === 'home') return acc;
        if (menu.sub && menu.sub.length > 0) {
            const filteredSubs = menu.sub.filter(s => s.code !== 'home');
            return [...acc, ...filteredSubs];
        }
        return [...acc, menu];
    }, []);

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

    return (
        <div className="p-8 lg:p-12">
            <div className="max-w-6xl mx-auto">
                <div className="mb-12">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Chào bạn, {user?.name}! 👋</h1>
                </div>

                <section>
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold text-gray-900">Các chức năng được truy cập</h3>
                        <button className="text-sm font-bold text-brand-600 hover:underline">Tùy chỉnh phím tắt</button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {quickAccessItems.map(item => (
                            <Link key={item.id} to={item.path} className="group bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-brand-600/5 hover:-translate-y-1 transition-all">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:rotate-3 ${item.code.includes('report') ? 'bg-orange-50 text-orange-600' :
                                        item.code.includes('pipeline') ? 'bg-blue-50 text-blue-600' :
                                            'bg-brand-50 text-brand-600'
                                    }`}>
                                    <i className={`fa-solid ${getIcon(item.code)} text-2xl`}></i>
                                </div>
                                <h4 className="text-base font-bold text-gray-900 mb-2">{item.name}</h4>
                                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{item.description}</p>
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Dashboard;
