import React, { useState, useEffect } from 'react';

// --- Constants & Helpers ---
const API_BASE = 'http://localhost:3000/api';

const TABS = {
    NEED_REVIEW: 'need_review',
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
};

const TAB_INFO = {
    [TABS.NEED_REVIEW]: { title: 'Danh sách cần đánh giá', empty: 'Không có ứng viên cần đánh giá' },
    [TABS.PENDING]: { title: 'Danh sách chờ phỏng vấn', empty: 'Không có ứng viên chờ phỏng vấn' },
    [TABS.APPROVED]: { title: 'Danh sách đã duyệt', empty: 'Không có ứng viên đã duyệt' },
    [TABS.REJECTED]: { title: 'Danh sách đã loại', empty: 'Không có ứng viên đã loại' },
};

const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d) ? '—' : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getCombinedStatus = (i) => `${i.status || ''} ${i.review_status || ''} ${i.manager_review_status || ''} ${i.latest_review_status || ''}`;
const isApproved = (s) => /APPROVE|APPROVED|HIRED/i.test(s);
const isRejected = (s) => /REJECT|REJECTED/i.test(s);
const isPending = (s) => /PENDING|INTERVIEW|WAITING/i.test(s);

const getTabForCandidate = (item) => {
    const s = getCombinedStatus(item);
    if (isApproved(s)) return TABS.APPROVED;
    if (isRejected(s)) return TABS.REJECTED;
    if (isPending(s)) return TABS.PENDING;
    return TABS.NEED_REVIEW;
};

const getCvUrl = (row, application) => {
    return application?.cvs?.[0]?.filePath ||
        row?.cv_file_path ||
        row?.cvFilePath ||
        row?.filePath ||
        row?.cvs?.[0]?.filePath || '';
};

const toGoogleDrivePreviewUrl = (url) => {
    if (!url) return '';
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    return url;
};

const getPositionText = (row, application) => {
    const pos = row?.order_position || row?.orderPosition || row?.position_name || row?.positionName || row?.job_position || row?.jobPosition || row?.position || application?.position;
    if (!pos) return '—';
    if (!isNaN(pos)) return `Vị trí #${pos}`;
    return pos;
};

const formatStatusLabel = (status) => {
    if (!status) return '—';
    const s = String(status).toUpperCase();
    if (s === 'DEPARTMENT_REVIEW') return 'Chờ đánh giá';
    if (s === 'INTERVIEW_ROUND_1') return 'Phỏng vấn vòng 1';
    if (s === 'INTERVIEW_ROUND_2') return 'Phỏng vấn vòng 2';
    if (s === 'ONBOARDING') return 'Nhận việc';
    if (s === 'FAIL') return 'Đã loại';
    return status;
};

const displayValue = (val) => val || '—';

const getNoteText = (row, application) => {
    const notes = [
        application?.note,
        row?.application_note,
        row?.note,
        row?.hr_note,
        row?.applicationNote
    ].filter(Boolean);
    return notes.length > 0 ? notes.join('\n') : 'Chưa có ghi chú HR';
};

export default function MyCandidates() {
    // --- States ---
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');

    const [activeTab, setActiveTab] = useState(TABS.NEED_REVIEW);

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [detailApp, setDetailApp] = useState(null);
    const [reviewStatus, setReviewStatus] = useState('PENDING');
    const [reviewNote, setReviewNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // --- API Calls ---
    const fetchCandidates = async () => {
        setLoading(true);
        setError(null);
        try {
            const query = new URLSearchParams();
            if (appliedSearch) query.append('fullname', appliedSearch);

            const res = await fetch(`${API_BASE}/recruitment-manager/my-candidate?${query.toString()}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, page: 1, size: 50 }
            });

            if (res.status === 401) return window.location.href = '/';
            if (!res.ok) throw new Error('Lỗi tải danh sách ứng viên');

            const json = await res.json();
            setData(json.data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCandidates();
    }, [appliedSearch]);

    const submitReview = async () => {
        if (!selectedCandidate?.application_id || !reviewStatus) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/recruitment-manager/candidate/review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    application_id: selectedCandidate.application_id,
                    pipeline_code: 'department_review',
                    status: reviewStatus,
                    note: reviewNote
                })
            });

            if (!res.ok) throw new Error('Lỗi lưu đánh giá');
            closeModal();
            fetchCandidates();
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // --- Handlers ---
    const handleSearch = (e) => {
        if (e.key === 'Enter') setAppliedSearch(search);
    };

    const refresh = () => setAppliedSearch(search);

    const openModal = async (candidate) => {
        setSelectedCandidate(candidate);
        setReviewStatus('PENDING');
        setReviewNote('');
        setDetailApp(null);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedCandidate(null);
        setDetailApp(null);
    };

    // --- Derived Data ---
    const clientData = appliedSearch
        ? data.filter(i =>
            (i.full_name || '').toLowerCase().includes(appliedSearch.toLowerCase()) ||
            (i.candidate_email || '').toLowerCase().includes(appliedSearch.toLowerCase()) ||
            (i.phone || '').includes(appliedSearch) ||
            (i.position || '').toLowerCase().includes(appliedSearch.toLowerCase())
        )
        : data;

    const stats = {
        [TABS.NEED_REVIEW]: 0,
        [TABS.PENDING]: 0,
        [TABS.APPROVED]: 0,
        [TABS.REJECTED]: 0,
    };

    clientData.forEach(item => {
        stats[getTabForCandidate(item)]++;
    });

    const displayData = clientData.filter(item => getTabForCandidate(item) === activeTab);
    const activeInfo = TAB_INFO[activeTab];

    return (
        <div className="p-6 max-w-[1400px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-lg shadow-sm">
                        <i className="fa-solid fa-users-viewfinder"></i>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 leading-tight">Ứng viên của tôi</h1>
                        <p className="text-sm text-slate-500">Danh sách ứng viên được phân công đánh giá</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative w-full md:w-80">
                        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={handleSearch}
                            placeholder="Tìm tên, email, SĐT, vị trí..."
                            className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                        />
                    </div>
                    <button onClick={refresh} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition shadow-sm">
                        <i className="fa-solid fa-rotate-right"></i>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                    onClick={() => setActiveTab(TABS.NEED_REVIEW)}
                    className={`text-left p-5 rounded-xl border shadow-sm relative overflow-hidden transition-all duration-200 group ${activeTab === TABS.NEED_REVIEW ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-100' : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                >
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <div className={`text-sm font-medium mb-1 ${activeTab === TABS.NEED_REVIEW ? 'text-blue-700' : 'text-blue-600'}`}>Cần đánh giá</div>
                            <div className="text-3xl font-bold text-slate-800">{stats[TABS.NEED_REVIEW]}</div>
                        </div>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${activeTab === TABS.NEED_REVIEW ? 'bg-blue-200 text-blue-700' : 'bg-blue-100 text-blue-600'}`}>
                            <i className="fa-solid fa-clipboard-list"></i>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => setActiveTab(TABS.PENDING)}
                    className={`text-left p-5 rounded-xl border shadow-sm flex justify-between items-start transition-all duration-200 ${activeTab === TABS.PENDING ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-100' : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-slate-50'}`}
                >
                    <div>
                        <div className={`text-sm font-medium mb-1 ${activeTab === TABS.PENDING ? 'text-amber-700' : 'text-amber-600'}`}>Chờ phỏng vấn</div>
                        <div className="text-3xl font-bold text-slate-800">{stats[TABS.PENDING]}</div>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${activeTab === TABS.PENDING ? 'bg-amber-200 text-amber-700' : 'bg-amber-50 text-amber-500'}`}>
                        <i className="fa-regular fa-clock"></i>
                    </div>
                </button>

                <button
                    onClick={() => setActiveTab(TABS.APPROVED)}
                    className={`text-left p-5 rounded-xl border shadow-sm flex justify-between items-start transition-all duration-200 ${activeTab === TABS.APPROVED ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-100' : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}`}
                >
                    <div>
                        <div className={`text-sm font-medium mb-1 ${activeTab === TABS.APPROVED ? 'text-emerald-700' : 'text-emerald-600'}`}>Đã duyệt</div>
                        <div className="text-3xl font-bold text-slate-800">{stats[TABS.APPROVED]}</div>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${activeTab === TABS.APPROVED ? 'bg-emerald-200 text-emerald-700' : 'bg-emerald-50 text-emerald-500'}`}>
                        <i className="fa-solid fa-check-double"></i>
                    </div>
                </button>

                <button
                    onClick={() => setActiveTab(TABS.REJECTED)}
                    className={`text-left p-5 rounded-xl border shadow-sm flex justify-between items-start transition-all duration-200 ${activeTab === TABS.REJECTED ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-100' : 'bg-white border-slate-200 hover:border-rose-300 hover:bg-slate-50'}`}
                >
                    <div>
                        <div className={`text-sm font-medium mb-1 ${activeTab === TABS.REJECTED ? 'text-rose-700' : 'text-rose-600'}`}>Đã loại</div>
                        <div className="text-3xl font-bold text-slate-800">{stats[TABS.REJECTED]}</div>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${activeTab === TABS.REJECTED ? 'bg-rose-200 text-rose-700' : 'bg-rose-50 text-rose-500'}`}>
                        <i className="fa-solid fa-ban"></i>
                    </div>
                </button>
            </div>

            {/* Candidate List Section */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-lg font-bold text-slate-800">{activeInfo.title}</h2>
                    <span className="bg-slate-200 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded-full">{stats[activeTab]}</span>
                </div>

                {error ? (
                    <div className="bg-white rounded-xl border border-rose-200 p-8 text-center shadow-sm">
                        <div className="w-12 h-12 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">
                            <i className="fa-solid fa-triangle-exclamation"></i>
                        </div>
                        <h3 className="text-base font-semibold text-slate-800 mb-1">Lỗi tải danh sách ứng viên</h3>
                        <p className="text-sm text-slate-500 mb-4">{error}</p>
                        <button onClick={fetchCandidates} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition">
                            Thử lại
                        </button>
                    </div>
                ) : loading ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
                        <i className="fa-solid fa-circle-notch fa-spin text-blue-500 text-3xl mb-3"></i>
                        <p className="text-sm text-slate-500">Đang tải dữ liệu...</p>
                    </div>
                ) : displayData.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                            <i className="fa-solid fa-inbox"></i>
                        </div>
                        <h3 className="text-base font-medium text-slate-700">{activeInfo.empty}</h3>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {displayData.map((item, i) => (
                            <div key={item.application_id || i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition flex flex-col">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex gap-3 items-center">
                                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-sm">
                                            {(item.full_name || item.candidate_email || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-800 line-clamp-1">{item.full_name || item.candidate_email}</div>
                                            {item.full_name && <div className="text-xs text-slate-500 line-clamp-1">{item.candidate_email}</div>}
                                        </div>
                                    </div>
                                    <span className="inline-block bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap uppercase">
                                        {formatStatusLabel(item.status)}
                                    </span>
                                </div>

                                <div className="space-y-1.5 mb-4 text-xs text-slate-600 flex-1">
                                    {item.phone && <div className="flex items-center gap-2"><i className="fa-solid fa-phone w-3 text-slate-400"></i> {item.phone}</div>}
                                    <div className="flex items-center gap-2"><i className="fa-solid fa-briefcase w-3 text-slate-400"></i> {getPositionText(item, null)} {item.department ? ` • ${item.department}` : ''}</div>
                                    {item.level && <div className="flex items-center gap-2"><i className="fa-solid fa-star w-3 text-slate-400"></i> Level: {item.level}</div>}
                                    <div className="flex items-center gap-2"><i className="fa-regular fa-calendar w-3 text-slate-400"></i> {formatDate(item.applied_date)}</div>
                                </div>

                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                                    <div className="text-[10px] font-medium text-slate-400">
                                        #{item.application_id}
                                    </div>
                                    <button onClick={() => openModal(item)} className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-600 hover:text-white transition flex items-center gap-1.5">
                                        <i className="fa-solid fa-pen-nib"></i> Đánh giá
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Review Modal */}
            {modalOpen && selectedCandidate && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden animate-fadeInUp">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
                                    {(selectedCandidate.full_name || selectedCandidate.candidate_email || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-bold text-slate-800">{selectedCandidate.full_name || selectedCandidate.candidate_email}</h2>
                                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold">{getPositionText(selectedCandidate, detailApp)}</span>
                                        <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs font-medium">{displayValue(selectedCandidate.level || detailApp?.level)}</span>
                                    </div>
                                    <div className="text-sm text-slate-500 mt-1 flex items-center gap-3">
                                        <span><i className="fa-solid fa-hashtag mr-1"></i>{selectedCandidate.application_id}</span>
                                        <span><i className="fa-solid fa-building mr-1"></i>{displayValue(selectedCandidate.department || detailApp?.department)}</span>
                                        <span><i className="fa-regular fa-calendar mr-1"></i>{formatDate(selectedCandidate.applied_date || detailApp?.appliedDate)}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-800 transition">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        {/* Body 2 columns */}
                        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                            {/* Left Col: Info & Form */}
                            <div className="w-full md:w-[45%] border-r border-slate-200 flex flex-col overflow-y-auto bg-white p-6 custom-scrollbar">
                                {/* Basic Info */}
                                <section className="mb-6">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                                        <i className="fa-solid fa-circle-info text-blue-500"></i> Thông tin cơ bản
                                    </h3>
                                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                                        <div><span className="text-slate-500 block text-xs mb-0.5">Giới tính</span> <span className="font-medium text-slate-800">{displayValue(selectedCandidate.gender || detailApp?.candidate?.gender)}</span></div>
                                        <div><span className="text-slate-500 block text-xs mb-0.5">Ngày sinh</span> <span className="font-medium text-slate-800">{formatDate(selectedCandidate.birthday || detailApp?.candidate?.birthday)}</span></div>
                                        <div><span className="text-slate-500 block text-xs mb-0.5">Trường học</span> <span className="font-medium text-slate-800">{displayValue(selectedCandidate.university_school || detailApp?.candidate?.universitySchool)}</span></div>
                                        <div><span className="text-slate-500 block text-xs mb-0.5">GPA</span> <span className="font-medium text-slate-800">{displayValue(selectedCandidate.gpa || detailApp?.gpa)}</span></div>
                                        <div><span className="text-slate-500 block text-xs mb-0.5">Nguồn</span> <span className="font-medium text-slate-800">{displayValue(selectedCandidate.source || detailApp?.source)}</span></div>
                                        <div><span className="text-slate-500 block text-xs mb-0.5">Email</span> <span className="font-medium text-slate-800 truncate block" title={selectedCandidate.candidate_email}>{displayValue(selectedCandidate.candidate_email)}</span></div>
                                        <div><span className="text-slate-500 block text-xs mb-0.5">SĐT</span> <span className="font-medium text-slate-800">{displayValue(selectedCandidate.phone || detailApp?.candidate?.phone)}</span></div>
                                        <div><span className="text-slate-500 block text-xs mb-0.5">Test Online</span> <span className="font-medium text-slate-800">{displayValue(selectedCandidate.test_online_status || detailApp?.testOnlineStatus)}</span></div>
                                        <div><span className="text-slate-500 block text-xs mb-0.5">Test IQ</span> <span className="font-medium text-slate-800">{displayValue(selectedCandidate.iq_test || detailApp?.iqTest)}</span></div>
                                        <div><span className="text-slate-500 block text-xs mb-0.5">Test Tư duy</span> <span className="font-medium text-slate-800">{displayValue(selectedCandidate.thinking_test || detailApp?.thinkingTest)}</span></div>
                                        <div className="col-span-2"><span className="text-slate-500 block text-xs mb-0.5">Test Chuyên môn</span> <span className="font-medium text-slate-800">{displayValue(selectedCandidate.tech_test || detailApp?.techTest)}</span></div>
                                        <div className="col-span-2"><span className="text-slate-500 block text-xs mb-0.5">Link sản phẩm</span>
                                            {selectedCandidate.cv_product_links || detailApp?.cvs?.[0]?.productLinks ? (
                                                <a href={selectedCandidate.cv_product_links || detailApp?.cvs?.[0]?.productLinks} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium break-all">
                                                    {selectedCandidate.cv_product_links || detailApp?.cvs?.[0]?.productLinks}
                                                </a>
                                            ) : '—'}
                                        </div>
                                    </div>
                                </section>

                                {/* HR Note */}
                                <section className="mb-6">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                                        <i className="fa-solid fa-comment-dots text-amber-500"></i> Ghi chú HR
                                    </h3>
                                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                                        {getNoteText(selectedCandidate, detailApp)}
                                    </div>
                                </section>

                                {/* Pipeline History */}
                                {detailApp?.pipelineHistory?.length > 0 && (
                                    <section className="mb-6">
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                                            <i className="fa-solid fa-clock-rotate-left text-emerald-500"></i> Lịch sử xử lý
                                        </h3>
                                        <div className="space-y-4 pl-2 border-l-2 border-slate-100 ml-2">
                                            {detailApp.pipelineHistory.map((h, i) => (
                                                <div key={i} className="relative pl-4">
                                                    <div className="absolute -left-[21px] top-1 w-3 h-3 bg-white border-2 border-slate-300 rounded-full"></div>
                                                    <div className="text-xs font-semibold text-slate-800">{formatStatusLabel(h.recruitmentPipelineCode || h.pipelineCode)}</div>
                                                    <div className="text-[10px] text-slate-500 mb-1">{formatDate(h.startTime)} - <span className="font-medium text-slate-600">{h.result}</span></div>
                                                    {h.note && <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded">{h.note}</div>}
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Review Form */}
                                <section className="mt-auto border-t border-slate-200 pt-6">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                                        <i className="fa-solid fa-pen-to-square text-blue-600"></i> Đánh giá ứng viên
                                    </h3>

                                    <div className="space-y-3 mb-4">
                                        <label className={`flex p-3 border rounded-xl cursor-pointer transition-all ${reviewStatus === 'APPROVE' ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'hover:bg-slate-50 border-slate-200'}`}>
                                            <input type="radio" name="review_status" value="APPROVE" checked={reviewStatus === 'APPROVE'} onChange={() => setReviewStatus('APPROVE')} className="mt-1" />
                                            <div className="ml-3">
                                                <div className={`text-sm font-bold ${reviewStatus === 'APPROVE' ? 'text-emerald-700' : 'text-slate-700'}`}>Duyệt đi tiếp</div>
                                                <div className="text-xs text-slate-500">Đề xuất chuyển ứng viên sang bước tiếp theo</div>
                                            </div>
                                        </label>
                                        <label className={`flex p-3 border rounded-xl cursor-pointer transition-all ${reviewStatus === 'REJECT' ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-500' : 'hover:bg-slate-50 border-slate-200'}`}>
                                            <input type="radio" name="review_status" value="REJECT" checked={reviewStatus === 'REJECT'} onChange={() => setReviewStatus('REJECT')} className="mt-1" />
                                            <div className="ml-3">
                                                <div className={`text-sm font-bold ${reviewStatus === 'REJECT' ? 'text-rose-700' : 'text-slate-700'}`}>Đề xuất loại</div>
                                                <div className="text-xs text-slate-500">Ứng viên chưa phù hợp</div>
                                            </div>
                                        </label>
                                        <label className={`flex p-3 border rounded-xl cursor-pointer transition-all ${reviewStatus === 'PENDING' ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500' : 'hover:bg-slate-50 border-slate-200'}`}>
                                            <input type="radio" name="review_status" value="PENDING" checked={reviewStatus === 'PENDING'} onChange={() => setReviewStatus('PENDING')} className="mt-1" />
                                            <div className="ml-3">
                                                <div className={`text-sm font-bold ${reviewStatus === 'PENDING' ? 'text-amber-700' : 'text-slate-700'}`}>Chờ thêm</div>
                                                <div className="text-xs text-slate-500">Cần thêm thông tin trước khi quyết định</div>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ghi chú đánh giá</label>
                                        <textarea
                                            value={reviewNote}
                                            onChange={e => setReviewNote(e.target.value)}
                                            rows={3}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm resize-none"
                                            placeholder="Nhập nhận xét của bạn..."
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <button onClick={closeModal} disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition">
                                            Hủy
                                        </button>
                                        <button onClick={submitReview} disabled={submitting} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-70 flex items-center gap-2 shadow-sm">
                                            {submitting && <i className="fa-solid fa-circle-notch fa-spin"></i>}
                                            Gửi đánh giá
                                        </button>
                                    </div>
                                </section>
                            </div>

                            {/* Right Col: CV Iframe */}
                            <div className="w-full md:w-[55%] bg-slate-100 flex flex-col p-4">
                                {(() => {
                                    const cvPath = getCvUrl(selectedCandidate, detailApp);
                                    if (cvPath) {
                                        const rawUrl = cvPath.startsWith('http') ? cvPath : `http://localhost:3000/${cvPath.replace(/\\/g, '/')}`;
                                        const previewUrl = toGoogleDrivePreviewUrl(rawUrl);
                                        return (
                                            <>
                                                <div className="flex justify-between items-center mb-2 px-2">
                                                    <h3 className="text-sm font-bold text-slate-700"><i className="fa-solid fa-file-pdf text-rose-500 mr-2"></i> CV ứng viên</h3>
                                                    <a href={rawUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1">
                                                        Mở tab mới <i className="fa-solid fa-arrow-up-right-from-square"></i>
                                                    </a>
                                                </div>
                                                <iframe src={previewUrl} className="w-full flex-1 rounded-xl border border-slate-200 bg-white shadow-inner" title="CV"></iframe>
                                            </>
                                        );
                                    }
                                    return (
                                        <div className="flex-1 flex items-center justify-center">
                                            <div className="text-center text-slate-400">
                                                <i className="fa-solid fa-file-circle-xmark text-4xl mb-3"></i>
                                                <p className="text-sm font-medium">Chưa có CV</p>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
