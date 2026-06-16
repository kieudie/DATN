import { message, Select } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';

const getRawCandidate = (item) => item?.candidate || item?.candidateInfo || item?.application?.candidate || item?.applicationInfo?.candidate || item?.profile || item || {};
const getRawApplication = (item) => {
    const cand = getRawCandidate(item);
    return item?.applications?.[0] || item?.application || item?.applicationInfo || item?.latestApplication || cand?.applications?.[0] || cand?.application || cand?.applicationInfo || item || {};
};
const getRawReview = (item) => item?.reviewManager || item?.managerReview || item?.review || item?.latestReview || item || {};

const getFullName = (item) => {
    const rawCandidate = getRawCandidate(item);
    return rawCandidate.fullName || rawCandidate.full_name || rawCandidate.name || rawCandidate.candidateName || item.candidateName || item.fullName || item.full_name || 'Chưa có tên';
};

const getEmail = (item) => {
    const rawCandidate = getRawCandidate(item);
    const rawApplication = getRawApplication(item);
    return rawCandidate.email || item.email || rawApplication.email || '—';
};

const getPhone = (item) => {
    const rawCandidate = getRawCandidate(item);
    return rawCandidate.phone || rawCandidate.phoneNumber || item.phone || item.phoneNumber || '—';
};

const getPositionLabel = (item) => {
    const rawCandidate = getRawCandidate(item);
    const rawApplication = getRawApplication(item);

    const label = rawApplication.orderInfo?.position ||
        rawCandidate.orderInfo?.position ||
        item.orderInfo?.position ||
        rawApplication.order_position ||
        rawApplication.orderPosition ||
        rawCandidate.position_name ||
        rawCandidate.positionName ||
        rawCandidate.job_position ||
        rawCandidate.jobPosition ||
        (rawCandidate.position && isNaN(Number(rawCandidate.position)) ? rawCandidate.position : null) ||
        (item.position && isNaN(Number(item.position)) ? item.position : null);

    if (label) return label;

    const posId = rawApplication.position || rawApplication.positionId || rawApplication.recruitmentOrderId || rawApplication.orderId || rawCandidate.position || item.position;
    if (posId) return `Vị trí #${posId}`;

    return '—';
};

const getLevel = (item) => {
    const rawCandidate = getRawCandidate(item);
    const rawApplication = getRawApplication(item);
    return rawCandidate.level || rawApplication.level || item.level || '—';
};

const getDepartment = (item) => {
    const rawCandidate = getRawCandidate(item);
    const rawApplication = getRawApplication(item);
    return rawApplication.department || rawApplication.team || rawCandidate.department || rawCandidate.team || item.department || item.team || '—';
};

const getAppStatus = (item) => {
    const rawApplication = getRawApplication(item);
    return rawApplication.status || rawApplication.applicationStatus || rawApplication.currentStatus || item.status || item.applicationStatus || item.currentStatus || '—';
};

const getManagerReviewStatusRaw = (item) => {
    const rawReview = getRawReview(item);
    const s = rawReview.status || rawReview.reviewStatus || item.reviewManager?.status || item.managerReview?.status;
    return s ? String(s).toUpperCase() : null;
};

const getManagerReviewStatusMapped = (item) => {
    const s = getManagerReviewStatusRaw(item);
    if (s === 'PENDING') return 'Chờ đánh giá';
    if (s === 'APPROVE' || s === 'APPROVED') return 'Đã duyệt';
    if (s === 'REJECT' || s === 'REJECTED') return 'Đã loại';
    return s || '—';
};

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '');

const getByPath = (source, path) => path.reduce((obj, key) => obj?.[key], source);

const isLikelyCvUrl = (value) => {
    const url = cleanString(value);
    return Boolean(url) && (
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.includes('drive.google.com') ||
        url.toLowerCase().includes('.pdf')
    );
};

const findCvUrlDeep = (source, depth = 0, hint = '') => {
    if (!source || depth > 5) return '';
    if (typeof source === 'string') return /cv|cvs|resume|file|url|path/i.test(hint) && isLikelyCvUrl(source) ? cleanString(source) : '';
    if (Array.isArray(source)) {
        for (const item of source) {
            const found = findCvUrlDeep(item, depth + 1, hint);
            if (found) return found;
        }
        return '';
    }
    if (typeof source !== 'object') return '';

    for (const [key, value] of Object.entries(source)) {
        const nextHint = `${hint}.${key}`;
        if (typeof value === 'string' && /cv|cvs|resume|file|url|path/i.test(nextHint) && isLikelyCvUrl(value)) return cleanString(value);
        const found = findCvUrlDeep(value, depth + 1, nextHint);
        if (found) return found;
    }
    return '';
};

const getCandidateCvUrl = (item) => {
    const rawCandidate = getRawCandidate(item);
    const rawApplication = getRawApplication(item);
    const sources = [rawCandidate, rawApplication, item];
    const paths = [
        ['filePath'], ['file_path'], ['cvUrl'], ['cv_url'], ['cvLink'], ['cv_link'], ['resumeUrl'], ['resume_url'],
        ['cv', 'filePath'], ['cv', 'file_path'], ['cv', 'url'], ['resume', 'filePath'], ['resume', 'url'],
        ['cvs', 0, 'filePath'], ['cvs', 0, 'file_path'], ['cvs', 0, 'url'],
        ['application', 'filePath'], ['application', 'cvUrl'], ['application', 'cvs', 0, 'filePath'], ['application', 'cvs', 0, 'url'],
        ['applications', 0, 'filePath'], ['applications', 0, 'cvUrl'], ['applications', 0, 'cvs', 0, 'filePath'], ['applications', 0, 'cvs', 0, 'url'],
    ];

    for (const source of sources) {
        for (const path of paths) {
            const url = getByPath(source, path);
            if (isLikelyCvUrl(url)) return cleanString(url);
        }
    }

    return sources.map(source => findCvUrlDeep(source)).find(Boolean) || '';
};

const ManagerCandidateData = () => {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [positionFilter, setPositionFilter] = useState('ALL');
    
    const [uiPage, setUiPage] = useState(1);
    const [uiPageSize, setUiPageSize] = useState(10);
    
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);

    useEffect(() => {
        fetchCandidates();
    }, []);

    const parseCandidateList = (result) => {
        let list = [];
        if (Array.isArray(result)) {
            list = result;
        } else if (Array.isArray(result?.data)) {
            list = result.data;
        } else {
            const searchTarget = result?.data || result;
            if (searchTarget && typeof searchTarget === 'object') {
                Object.keys(searchTarget).forEach(key => {
                    // Cực kỳ quan trọng: Bỏ qua mảng managers
                    if (key === 'managers') return;
                    if (Array.isArray(searchTarget[key])) {
                        list = [...list, ...searchTarget[key]];
                    } else if (searchTarget[key] && typeof searchTarget[key] === 'object') {
                         Object.keys(searchTarget[key]).forEach(subKey => {
                             if (Array.isArray(searchTarget[key][subKey])) {
                                 list = [...list, ...searchTarget[key][subKey]];
                             }
                         });
                    }
                });
            }
        }
        
        return list.filter(item => {
            if (!item) return false;
            
            // Lọc bỏ manager objects lẫn vào candidates
            const email = getEmail(item);
            if (email && email.includes('manager.') && email.includes('@cggamestudio.com')) {
                if (!item.candidateId && !item.candidate_id && !item.applicationId && !item.application_id && !item.candidate && !item.application && !item.cvs) {
                    return false;
                }
            }

            return item.candidateId || item.candidate_id || item.applicationId || item.application_id || item.candidate || item.application || item.cvs || item.fullName || item.full_name || item.name || item.phone || item.position || item.orderInfo || item.jobPosition;
        });
    };

    const fetchCandidates = async () => {
        setLoading(true);
        const token = localStorage.getItem('access_token');
        try {
            const response = await fetch(`http://localhost:3000/api/recruitment-manager/candidate`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 403) {
                message.error('Bạn không có quyền xem dữ liệu này');
                setLoading(false);
                return;
            }

            if (!response.ok) throw new Error('Failed to fetch data');

            const result = await response.json();
            const rawList = parseCandidateList(result);
            
            const uniqueMap = new Map();
            rawList.forEach(cand => {
                const appId = cand.applicationId || cand.application_id || getRawApplication(cand).id;
                const email = getEmail(cand);
                const phone = getPhone(cand);
                const candId = cand.id || cand.candidateId || getRawCandidate(cand).id;
                
                let key = '';
                if (appId) {
                    key = `app_${appId}`;
                } else if (candId) {
                    key = `id_${candId}`;
                } else if (email !== '—' && phone !== '—') {
                    key = `ep_${email}_${phone}`;
                } else {
                    key = Math.random().toString();
                }
                
                if (!uniqueMap.has(key)) {
                    uniqueMap.set(key, cand);
                }
            });

            setCandidates(Array.from(uniqueMap.values()));
        } catch (error) {
            console.error('fetchCandidates error:', error);
            message.error(error.message || 'Không thể tải danh sách ứng viên');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (code) => {
        const colors = {
            'received_cv': 'bg-blue-50 text-blue-600 border-blue-100',
            'hr_scan': 'bg-indigo-50 text-indigo-600 border-indigo-100',
            'iq_test': 'bg-purple-50 text-purple-600 border-purple-100',
            'onboarding': 'bg-green-50 text-green-600 border-green-100',
            'fail': 'bg-red-50 text-red-600 border-red-100',
        };
        return colors[code] || 'bg-gray-50 text-gray-600 border-gray-100';
    };

    const filteredCandidates = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();
        
        return candidates.filter(cand => {
            const name = getFullName(cand);
            const email = getEmail(cand);
            const phone = getPhone(cand);
            const positionLabel = getPositionLabel(cand);
            const level = getLevel(cand);
            const dept = getDepartment(cand);
            const revStatus = getManagerReviewStatusRaw(cand);

            const textMatch = !keyword || [name, email, phone, positionLabel, level, dept].filter(Boolean).join(' ').toLowerCase().includes(keyword);
            
            const statusMatch = statusFilter === 'ALL' || revStatus === statusFilter || 
                               (statusFilter === 'APPROVE' && revStatus === 'APPROVED') || 
                               (statusFilter === 'REJECT' && revStatus === 'REJECTED');
            
            const positionMatch = positionFilter === 'ALL' || positionLabel === positionFilter;

            return textMatch && statusMatch && positionMatch;
        });
    }, [candidates, searchText, statusFilter, positionFilter]);

    const positionOptions = useMemo(() => {
        const positions = new Set(candidates.map(c => getPositionLabel(c)).filter(p => p !== '—'));
        return ['ALL', ...Array.from(positions)];
    }, [candidates]);



    const totalFiltered = filteredCandidates.length;
    const totalUiPages = Math.max(1, Math.ceil(totalFiltered / uiPageSize));
    const pagedCandidates = filteredCandidates.slice((uiPage - 1) * uiPageSize, uiPage * uiPageSize);

    const openDetail = (candidate) => {
        setSelectedCandidate(candidate);
        setIsDetailModalOpen(true);
    };

    const getDrivePreviewUrl = (url) => {
        const value = cleanString(url);
        if (!value) return null;
        const match = value.match(/\/d\/([a-zA-Z0-9-_]+)/) || value.match(/[?&]id=([a-zA-Z0-9-_]+)/);
        return match?.[1] ? `https://drive.google.com/file/d/${match[1]}/preview` : null;
    };

    return (
        <div className="p-8 lg:p-12 bg-[#F8FAFC] min-h-screen">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#0F172A] mb-2">Data ứng viên</h1>
                    <p className="text-[#64748B] font-medium">Kho dữ liệu ứng viên thuộc phạm vi quản lý của bạn</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="relative">
                    <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input
                        type="text"
                        placeholder="Tìm kiếm ứng viên..."
                        className="pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl w-72 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all font-medium text-sm text-gray-700 shadow-sm"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Select 
                        value={positionFilter} 
                        onChange={setPositionFilter} 
                        size="large" 
                        className="w-[220px]"
                        options={positionOptions.map(p => ({ label: p === 'ALL' ? 'Tất cả vị trí' : p, value: p }))}
                    />
                    <Select 
                        value={statusFilter} 
                        onChange={setStatusFilter} 
                        size="large" 
                        className="w-[200px]"
                        options={[
                            { label: 'Tất cả trạng thái', value: 'ALL' },
                            { label: 'Chờ đánh giá', value: 'PENDING' },
                            { label: 'Đã duyệt', value: 'APPROVE' },
                            { label: 'Đã loại', value: 'REJECT' },
                        ]}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#FFFFFF] rounded-[2rem] border border-[#E2E8F0] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-50">
                                {['STT', 'Họ và tên', 'Trường học', 'Giới tính', 'Vị trí ứng tuyển', 'Level', 'Phòng ban', 'Nguồn', 'Trạng thái', 'Ngày ứng tuyển', 'Thao tác'].map((h, i) => (
                                    <th key={i} className={`px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest ${['Giới tính', 'Trạng thái', 'Ngày ứng tuyển'].includes(h) ? 'text-center' : ''} ${h === 'Thao tác' ? 'text-right' : ''}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="11" className="px-6 py-8"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : pagedCandidates.length === 0 ? (
                                <tr>
                                    <td colSpan="11" className="px-6 py-16 text-center">
                                        <i className="fa-solid fa-inbox text-4xl text-gray-300 mb-3 block"></i>
                                        <p className="text-gray-500 font-medium">Không tìm thấy ứng viên nào</p>
                                    </td>
                                </tr>
                            ) : pagedCandidates.map((cand, index) => {
                                const globalIndex = (uiPage - 1) * uiPageSize + index;
                                const name = getFullName(cand);
                                const email = getEmail(cand);
                                const phone = getPhone(cand);
                                const positionLabel = getPositionLabel(cand);
                                const level = getLevel(cand);
                                const dept = getDepartment(cand);
                                const appStatus = getAppStatus(cand);
                                const rawCandidate = getRawCandidate(cand);
                                const rawApplication = getRawApplication(cand);

                                return (
                                    <tr key={cand.id ?? index} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-5 text-sm font-medium text-gray-400">{globalIndex + 1}</td>
                                        <td className="px-6 py-5">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 group-hover:text-brand-600 transition-colors">{name}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">ID: {cand.id || cand.candidateId}</p>
                                                <p className="text-[10px] text-gray-400">{phone} • {email}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-sm text-gray-600">{rawCandidate.universitySchool || '—'}</td>
                                        <td className="px-6 py-5 text-center text-sm text-gray-600 uppercase text-[10px] font-bold">
                                            {rawCandidate.gender === 'female' || rawCandidate.gender === 'nữ' || rawCandidate.gender === 'nu' ? 'Nữ' : rawCandidate.gender === 'male' || rawCandidate.gender === 'nam' ? 'Nam' : (rawCandidate.gender || '—')}
                                        </td>
                                        <td className="px-6 py-5 text-sm text-gray-600 font-medium">{positionLabel}</td>
                                        <td className="px-6 py-5 text-sm text-gray-600">{level}</td>
                                        <td className="px-6 py-5 text-sm text-gray-600">{dept}</td>
                                        <td className="px-6 py-5 text-sm text-gray-600">{rawApplication.source || '—'}</td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`inline-flex min-w-[112px] items-center justify-center rounded-full border px-3 py-1.5 text-xs font-bold leading-none whitespace-nowrap ${getStatusColor(appStatus)}`}>
                                                {appStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-sm text-gray-600 text-center">
                                            {rawApplication.appliedDate ? dayjs(rawApplication.appliedDate).format('DD/MM/YYYY') : '—'}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => openDetail(cand)}
                                                    className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center hover:bg-orange-100 transition-all"
                                                    title="Xem chi tiết"
                                                >
                                                    <i className="fa-solid fa-pen-to-square text-xs"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && totalFiltered > 0 && (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 20px', background: '#fff',
                        borderTop: '1px solid #E2E8F0',
                        flexWrap: 'wrap', gap: 10,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>Số dòng/trang:</span>
                            <select
                                value={uiPageSize}
                                onChange={e => { setUiPageSize(Number(e.target.value)); setUiPage(1); }}
                                style={{ fontSize: 12, padding: '4px 8px', border: '1px solid #E2E8F0', borderRadius: 8, outline: 'none', background: '#F8FAFC' }}
                            >
                                {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 12, color: '#64748B', marginRight: 6 }}>Trang {uiPage}/{totalUiPages}</span>
                            <button onClick={() => setUiPage(p => Math.max(1, p - 1))} disabled={uiPage === 1} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-50 hover:bg-gray-50 text-gray-500">
                                <i className="fa-solid fa-chevron-left text-[10px]"></i>
                            </button>
                            <button onClick={() => setUiPage(p => Math.min(totalUiPages, p + 1))} disabled={uiPage === totalUiPages} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-50 hover:bg-gray-50 text-gray-500">
                                <i className="fa-solid fa-chevron-right text-[10px]"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {isDetailModalOpen && selectedCandidate && (() => {
                const cand = selectedCandidate;
                const name = getFullName(cand);
                const email = getEmail(cand);
                const phone = getPhone(cand);
                const positionLabel = getPositionLabel(cand);
                const level = getLevel(cand);
                const dept = getDepartment(cand);
                const appStatus = getAppStatus(cand);
                const reviewStatusRaw = getManagerReviewStatusRaw(cand);
                const cvUrl = getCandidateCvUrl(cand);
                const rawCandidate = getRawCandidate(cand);
                const rawApplication = getRawApplication(cand);
                const rawReview = getRawReview(cand);
                
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-end">
                        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsDetailModalOpen(false)}></div>
                        <div className="bg-white w-full max-w-6xl h-screen shadow-2xl relative flex flex-col animate-slide-left z-10">
                            {/* Header */}
                            <div className="p-6 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-20">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold">
                                        {(name || 'U')[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">Chi tiết ứng viên</h2>
                                        <p className="text-sm text-gray-500 mt-0.5">
                                            {name} {email && `· ${email}`}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setIsDetailModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-all">
                                    <i className="fa-solid fa-xmark text-xl"></i>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 pb-32 bg-slate-50">
                                <div className="grid grid-cols-12 gap-8">
                                    {/* Cột trái */}
                                    <div className="col-span-12 lg:col-span-7 space-y-6">
                                        
                                        {/* 1. Thông tin cá nhân */}
                                        <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                            <h3 className="text-sm font-bold text-blue-600 mb-6 flex items-center gap-2">
                                                <i className="fa-solid fa-user"></i>
                                                Thông tin cá nhân
                                            </h3>
                                            <div className="grid grid-cols-2 gap-5">
                                                {[
                                                    { label: 'Họ và tên', value: name },
                                                    { label: 'Email', value: email },
                                                    { label: 'Số điện thoại', value: phone },
                                                    { label: 'Trường học', value: rawCandidate.universitySchool || '—' },
                                                    { label: 'GPA', value: rawApplication.gpa || '—' },
                                                    { label: 'Giới tính', value: rawCandidate.gender === 'female' || rawCandidate.gender === 'nữ' || rawCandidate.gender === 'nu' ? 'Nữ' : rawCandidate.gender === 'male' || rawCandidate.gender === 'nam' ? 'Nam' : (rawCandidate.gender || '—') },
                                                    { label: 'Ngày sinh', value: rawCandidate.dob ? dayjs(rawCandidate.dob).format('DD/MM/YYYY') : rawCandidate.birthday || '—' }
                                                ].map((f, i) => (
                                                    <div key={i} className="col-span-2 md:col-span-1 space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">{f.label}</label>
                                                        <div className="text-sm font-medium mt-1 text-gray-900">{f.value}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        {/* 2. Thông tin ứng tuyển */}
                                        <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                            <h3 className="text-sm font-bold text-blue-600 mb-6 flex items-center gap-2">
                                                <i className="fa-solid fa-briefcase"></i>
                                                Thông tin ứng tuyển
                                            </h3>
                                            <div className="grid grid-cols-2 gap-5">
                                                {[
                                                    { label: 'Vị trí ứng tuyển', value: positionLabel, col: 2 },
                                                    { label: 'Level', value: level, col: 1 },
                                                    { label: 'Phòng ban', value: dept, col: 1 },
                                                    { label: 'Nguồn', value: rawApplication.source || '—', col: 1 },
                                                    { label: 'Trạng thái hiện tại', value: <span className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase ${getStatusColor(appStatus)}`}>{appStatus}</span>, col: 1 }
                                                ].map((f, i) => (
                                                    <div key={i} className={`col-span-${f.col} space-y-1`}>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">{f.label}</label>
                                                        <div className="text-sm font-medium mt-1 text-gray-900">{f.value}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        {/* 3. Kết quả đánh giá */}
                                        <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                            <h3 className="text-sm font-bold text-blue-600 mb-6 flex items-center gap-2">
                                                <i className="fa-solid fa-star"></i>
                                                Kết quả đánh giá
                                            </h3>
                                            <div className="grid grid-cols-3 gap-4">
                                                {[
                                                    { label: 'Trạng thái test online', value: rawCandidate.test_status || rawCandidate.testStatus || rawApplication.testOnlineStatus || '—', col: 3, mb: true },
                                                    { label: 'IQ Test', value: rawCandidate.test_score || rawCandidate.testScore || rawApplication.iqTest || '—', col: 1 },
                                                    { label: 'Technical', value: rawApplication.techTest || '—', col: 1 },
                                                    { label: 'Thinking', value: rawApplication.thinkingTest || '—', col: 1 }
                                                ].map((f, i) => (
                                                    <div key={i} className={`col-span-${f.col} space-y-1 ${f.mb ? 'mb-2' : ''}`}>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">{f.label}</label>
                                                        <div className="text-sm font-medium mt-1 text-gray-900">{f.value}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        {/* 4. Ghi chú HR */}
                                        <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                            <h3 className="text-sm font-bold text-blue-600 mb-6 flex items-center gap-2">
                                                <i className="fa-solid fa-note-sticky"></i>
                                                Ghi chú HR
                                            </h3>
                                            <div className="text-sm font-medium text-gray-900 whitespace-pre-wrap">
                                                {rawCandidate.hr_note || rawCandidate.hrNote || rawCandidate.note || rawApplication.note || '—'}
                                            </div>
                                        </section>

                                        {/* 5. Đánh giá bộ phận */}
                                        <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                            <h3 className="text-sm font-bold text-blue-600 mb-6 flex items-center gap-2">
                                                <i className="fa-solid fa-users-viewfinder"></i>
                                                Đánh giá bộ phận
                                            </h3>
                                            {!reviewStatusRaw ? (
                                                <div className="p-4 bg-slate-50 border border-gray-100 rounded-xl text-center">
                                                    <p className="text-sm text-gray-400 font-medium italic">Chưa có đánh giá từ bộ phận</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="flex gap-4">
                                                        <div className="flex-1 bg-slate-50 border border-gray-100 rounded-xl p-4 shadow-sm pb-4">
                                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                                <div>
                                                                    <h4 className="text-sm font-bold text-gray-800">
                                                                        Reviewer Manager
                                                                        <span className="text-xs text-gray-500 font-normal ml-2">
                                                                            (Bộ phận chọn hồ sơ)
                                                                        </span>
                                                                    </h4>
                                                                    <div className="text-[11px] text-gray-500 font-medium flex items-center gap-2 mt-1">
                                                                        <span className="flex items-center gap-1">
                                                                            <i className="fa-regular fa-clock"></i> 
                                                                            {rawReview.reviewedAt ? new Date(rawReview.reviewedAt).toLocaleDateString('vi-VN') : '—'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border ${
                                                                    reviewStatusRaw === 'APPROVE' || reviewStatusRaw === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                    reviewStatusRaw === 'REJECT' || reviewStatusRaw === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                    'bg-amber-50 text-amber-600 border-amber-100'
                                                                }`}>
                                                                    {getManagerReviewStatusMapped(cand)}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-gray-600 mt-3 p-2.5 bg-white rounded-lg border border-gray-100 whitespace-pre-wrap">
                                                                <span className="font-semibold text-gray-700">Ghi chú: </span>
                                                                {rawReview.note || cand.manager_note || cand.managerNote || cand.review_note || 'Không có ghi chú'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </section>

                                    </div>

                                    {/* Cột phải - CV */}
                                    <div className="col-span-12 lg:col-span-5 space-y-6">
                                        <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col h-full min-h-[750px] sticky top-8">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-sm font-bold text-orange-500 flex items-center gap-2">
                                                    <i className="fa-solid fa-file-pdf"></i>
                                                    Preview CV
                                                </h3>
                                                {cvUrl && (
                                                    <a href={cvUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors flex items-center gap-1">
                                                        Mở tab mới <i className="fa-solid fa-arrow-up-right-from-square"></i>
                                                    </a>
                                                )}
                                            </div>
                                            
                                            <div className="flex-1 bg-slate-50 rounded-xl border border-gray-200 relative overflow-hidden mt-2">
                                                {getDrivePreviewUrl(cvUrl) ? (
                                                    <iframe 
                                                        src={getDrivePreviewUrl(cvUrl)} 
                                                        className="absolute inset-0 w-full h-full border-none" 
                                                        title="CV Preview"
                                                    ></iframe>
                                                ) : cvUrl ? (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                                                        <i className="fa-solid fa-file-pdf text-3xl text-gray-300 mb-4"></i>
                                                        <p className="text-sm text-gray-400 font-medium break-all">
                                                            <a href={cvUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{cvUrl}</a>
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                                                        <i className="fa-solid fa-cloud-arrow-up text-3xl text-gray-300 mb-4"></i>
                                                        <p className="text-sm text-gray-400 font-medium">Không có CV</p>
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute bottom-0 inset-x-0 p-5 bg-white border-t border-gray-100 flex items-center justify-end gap-3 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                <button onClick={() => setIsDetailModalOpen(false)} className="px-8 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all">Đóng</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

        </div>
    );
};

export default ManagerCandidateData;
