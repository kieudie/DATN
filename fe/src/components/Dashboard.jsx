import { useMemo } from 'react';
import { Link } from 'react-router-dom';

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
    recruitment_my_candidates: 'fa-user-check',
    recruitment_assigned_orders: 'fa-file-signature',
    recruitment_candidate_data: 'fa-database',
};

const getIconByCode = (code = '') => {
    const normalized = code.toLowerCase();
    if (normalized.includes('candidate')) return 'fa-solid fa-user-group';
    if (normalized.includes('pipeline')) return 'fa-solid fa-code-branch';
    if (normalized.includes('manager')) return 'fa-solid fa-user-gear';
    if (normalized.includes('order')) return 'fa-solid fa-clipboard-list';
    if (normalized.includes('report')) return 'fa-solid fa-chart-pie';
    if (normalized.includes('data')) return 'fa-solid fa-database';
    if (normalized.includes('home')) return 'fa-solid fa-border-all';
    return 'fa-solid fa-circle-dot';
};

const getAccentByIndex = (index) => {
    const accents = [
        { bg: '#F3E8FF', fg: '#7C3AED' },
        { bg: '#FCE7F3', fg: '#DB2777' },
        { bg: '#EDE9FE', fg: '#8B5CF6' },
        { bg: '#FDF2F8', fg: '#C026D3' },
        { bg: '#FAE8FF', fg: '#A855F7' },
        { bg: '#F5F3FF', fg: '#6D28D9' }
    ];
    return accents[index % accents.length];
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

const EmptyState = ({ icon = 'fa-inbox', title = 'Chưa có dữ liệu', description }) => {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                textAlign: 'center',
                gap: 12,
                padding: '40px 20px',
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px dashed #CBD5E1'
            }}
        >
            <div
                style={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    background: '#F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94A3B8',
                    fontSize: '20px',
                }}
            >
                <i className={`fa-solid ${icon}`}></i>
            </div>

            <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    {title}
                </div>
                {description && (
                    <div style={{ fontSize: '13px', color: '#64748B', maxWidth: 300, margin: '0 auto', lineHeight: 1.5 }}>
                        {description}
                    </div>
                )}
            </div>
        </div>
    );
};

function getDisplayName() {
    const storedName =
        localStorage.getItem("full_name") ||
        localStorage.getItem("fullName") ||
        localStorage.getItem("user_name") ||
        localStorage.getItem("name");

    if (storedName) return storedName;

    try {
        const token = localStorage.getItem("access_token");
        if (!token) return "bạn";

        const payload = JSON.parse(atob(token.split(".")[1]));
        const email = payload?.email || "";

        if (!email) return "bạn";

        const namePart = email.split("@")[0];

        return namePart
            .split(/[._-]/)
            .filter(Boolean)
            .map((word) => {
                if (word.toLowerCase() === "hr") return "HR";
                return word.charAt(0).toUpperCase() + word.slice(1);
            })
            .join(" ");
    } catch (error) {
        return "bạn";
    }
}

const getCorrectPath = (item) => {
    const nameLower = (item?.name || '').toLowerCase();
    if (nameLower.includes('ứng viên của tôi') || nameLower.includes('my candidate')) return '/recruitment/my-candidates';
    if (nameLower.includes('danh sách order')) return '/recruitment/orders/manager';
    if (nameLower.includes('data ứng viên') || nameLower.includes('candidate data')) return '/recruitment/manager-candidate-data';
    if (item?.path === '/recruitment/my-candidate') return '/recruitment/my-candidates';
    return item?.path || '#';
};

const Dashboard = ({ menus = [], user }) => {
    const displayName = getDisplayName();
    const dashboardSubtitle = 'Theo dõi và quản lý các chức năng tuyển dụng trong hệ thống.';

    const quickAccessItems = useMemo(() => {
        return flattenMenus(menus)
            .filter((item) => item?.code !== 'home')
            .filter((item) => item?.name && item.name !== '-')
            .slice(0, 8);
    }, [menus]);

    return (
        <div className="db-wrap">
            <style>{`
                .db-wrap { font-family: 'Inter', system-ui, sans-serif; background-color: transparent; width: 100%; min-width: 0; }
                .db-container { width: 100%; max-width: 1280px; margin: 0 auto; box-sizing: border-box; }
                .db-banner { 
                    background: linear-gradient(135deg, #F3E8FF 0%, #FDF2F8 45%, #EDE9FE 100%) !important; 
                    border: 1px solid #E9D5FF !important; 
                    border-radius: 28px !important; 
                    box-shadow: 0 18px 45px rgba(147, 51, 234, 0.12) !important;
                    padding: 40px !important;
                    margin-bottom: 48px !important;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                    box-sizing: border-box;
                }
                .db-banner-left { flex: 1; min-width: 0; }
                .db-banner-date { display: none; }
                .db-banner-title { color: #0F172A !important; font-size: 2.75rem !important; font-weight: 800 !important; margin-bottom: 16px !important; letter-spacing: -0.02em; line-height: 1.2; word-break: break-word; }
                .db-banner-sub { color: #64748B !important; font-size: 1.125rem !important; max-width: 550px; line-height: 1.6; word-break: break-word; }
                .db-banner-illo { display: flex; gap: 16px; align-items: center; justify-content: center; position: relative; margin-right: 40px; flex-shrink: 0; }
                .db-illo-block { width: 140px; height: 140px; border-radius: 32px; background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; color: #7C3AED; font-size: 64px; box-shadow: 0 20px 40px -10px rgba(124, 58, 237, 0.15); border: 1px solid #FFFFFF; }

                .db-sec-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px !important; width: 100%; }
                .db-sec-title-wrap { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
                .db-sec-title { color: #0F172A !important; font-weight: 800 !important; font-size: 1.25rem !important; margin: 0 !important; text-transform: uppercase; letter-spacing: 0.5px; }
                .db-sec-sub { display: none; }
                .db-sec-count { background: #F3E8FF; color: #7C3AED; padding: 6px 16px; border-radius: 20px; font-size: 0.875rem; font-weight: 600; border: 1px solid #D8B4FE; flex-shrink: 0; }
                
                .qa-grid {
                    display: grid;
                    grid-template-columns: repeat(1, minmax(0, 1fr));
                    gap: 28px;
                    width: 100%;
                }
                @media (min-width: 768px) { .qa-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
                @media (min-width: 1280px) { .qa-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
                
                .qa-card {
                    background: #FFFFFF !important;
                    border: 1px solid #E2E8F0 !important;
                    border-radius: 24px !important;
                    padding: 28px !important;
                    transition: all 0.2s ease !important;
                    box-shadow: 0 14px 35px rgba(15, 23, 42, 0.08) !important;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    text-decoration: none !important;
                    width: 100%;
                    min-height: 260px;
                    box-sizing: border-box;
                }
                .qa-card:hover {
                    transform: translateY(-6px);
                    box-shadow: 0 20px 45px rgba(15, 23, 42, 0.12) !important;
                    border-color: #D8B4FE !important;
                }
                .qa-icon { width: 64px !important; height: 64px !important; border-radius: 18px !important; display: flex; align-items: center; justify-content: center; font-size: 28px !important; margin-bottom: 24px; }
                .qa-name { color: #0F172A !important; font-weight: 800 !important; font-size: 1.25rem !important; margin-bottom: 12px !important; text-transform: uppercase; }
                .qa-desc { color: #64748B !important; font-size: 0.875rem !important; line-height: 1.6 !important; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
                .qa-cta { margin-top: 24px; display: flex; align-items: center; font-size: 0.875rem !important; font-weight: 600 !important; border-top: 1px solid transparent; padding-top: 8px; }
                .qa-open { color: #475569 !important; display: flex; align-items: center; gap: 8px; transition: color 0.2s; }
                .qa-card:hover .qa-open { color: #7C3AED !important; }
                .qa-na { color: #9CA3AF; font-weight: 500; }
                
                @media (max-width: 768px) {
                    .db-banner { flex-direction: column; align-items: flex-start; gap: 32px; padding: 24px !important; }
                    .db-banner-illo { display: none; }
                }
            `}</style>
            
            <div className="db-container">
                <section className="db-banner">
                    <div className="db-banner-left">
                        <div className="db-banner-date">
                            {new Date().toLocaleDateString('vi-VN', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                            })}
                        </div>

                        <h1 className="db-banner-title">Xin chào, {displayName}! 👋</h1>
                        <p className="db-banner-sub">Theo dõi và quản lý các chức năng tuyển dụng trong hệ thống của bạn một cách hiệu quả nhất.</p>
                    </div>

                    <div className="db-banner-illo" aria-hidden="true">
                        <div className="db-illo-block">
                            <i className="fa-solid fa-border-all"></i>
                        </div>
                    </div>
                </section>

                <section>
                    <div className="db-sec-hd">
                        <div className="db-sec-title-wrap">
                            <h2 className="db-sec-title">CHỨC NĂNG CỦA BẠN</h2>
                        </div>

                        {quickAccessItems.length > 0 && (
                            <span className="db-sec-count">{quickAccessItems.length} chức năng</span>
                        )}
                    </div>

                    {quickAccessItems.length === 0 ? (
                        <div className="db-panel">
                            <EmptyState
                                icon="fa-inbox"
                                title="Chưa có menu khả dụng"
                                description="Không tìm thấy chức năng phù hợp với tài khoản hiện tại."
                            />
                        </div>
                    ) : (
                        <div className="qa-grid">
                            {quickAccessItems.map((item, index) => {
                                const accent = getAccentByIndex(index);
                                const correctPath = getCorrectPath(item);
                                const hasPath = Boolean(correctPath && correctPath !== '#');

                                const content = (
                                    <>
                                        <div className="qa-icon" style={{ background: accent.bg, color: accent.fg }}>
                                            <i className={getIconByCode(item?.code || '')}></i>
                                        </div>

                                        <div className="qa-body">
                                            <h3 className="qa-name">{item.name}</h3>

                                            {item.description && (
                                                <p className="qa-desc">{item.description}</p>
                                            )}
                                        </div>

                                        <div className="qa-cta">
                                            {hasPath ? (
                                                <span className="qa-open">
                                                    Mở chức năng &rarr;
                                                </span>
                                            ) : (
                                                <span className="qa-na">Chưa khả dụng</span>
                                            )}
                                        </div>
                                    </>
                                );

                                if (!hasPath) {
                                    return (
                                        <div key={item?.id || item?.code || index} className="qa-card qa-card--disabled">
                                            {content}
                                        </div>
                                    );
                                }

                                return (
                                    <Link
                                        key={item?.id || item?.code || index}
                                        to={correctPath}
                                        className="qa-card qa-card--link"
                                    >
                                        {content}
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Dashboard;