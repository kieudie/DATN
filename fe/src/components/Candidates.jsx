import React, { useEffect, useState, useRef, useMemo } from 'react';
import { message, Tabs, DatePicker, Select, Tag, Button, Space } from 'antd';
import dayjs from 'dayjs';
import { debounce } from 'lodash';

const { RangePicker } = DatePicker;

const Candidates = ({ menus, user }) => {
    const [candidates, setCandidates] = useState([]);
    const [pipelineStages, setPipelineStages] = useState([]);
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalItems, setTotalItems] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingIds, setEditingIds] = useState({ candidateId: null, applicationId: null });
    const [previewCV, setPreviewCV] = useState(null);

    const [filters, setFilters] = useState({
        positions: [],
        statuses: [],
        pipelines: [{ code: null, results: [] }],
        levels: [],
        departments: [],
        sources: [],
        genders: [],
        schools: [],
        startDate: null,
        endDate: null,
        search: ''
    });

    const displayActiveFilters = useMemo(() => {
        const list = [];
        if (filters.positions?.length) list.push({ key: 'positions', label: 'Vị trí', value: filters.positions.join(', ') });
        if (filters.levels?.length) list.push({ key: 'levels', label: 'Level', value: filters.levels.join(', ') });
        if (filters.sources?.length) list.push({ key: 'sources', label: 'Nguồn', value: filters.sources.join(', ') });
        if (filters.schools?.length) list.push({ key: 'schools', label: 'Trường', value: filters.schools.join(', ') });
        if (filters.statuses?.length) list.push({ key: 'statuses', label: 'Trạng thái', value: filters.statuses.join(', ') });
        if (filters.pipelines?.length) {
            const codes = filters.pipelines.map(p => {
                const stage = pipelineStages.find(s => s.code === p.code);
                return stage ? stage.name : null;
            }).filter(Boolean);
            if (codes.length) list.push({ key: 'pipelineCodes', label: 'Pipeline', value: codes.join(', ') });
            
            const results = filters.pipelines.flatMap(p => p.results).filter(Boolean);
            if (results.length) list.push({ key: 'pipelineResults', label: 'Kết quả pipeline', value: results.join(', ') });
        }
        if (filters.genders?.length) list.push({ key: 'genders', label: 'Giới tính', value: filters.genders.map(g => g === 'male' ? 'Nam' : 'Nữ').join(', ') });
        if (filters.startDate && filters.endDate) list.push({ key: 'date', label: 'Ngày apply', value: `${filters.startDate} - ${filters.endDate}` });
        return list;
    }, [filters]);

    const [quickCreateForm, setQuickCreateForm] = useState({
        fullName: '',
        email: '',
        phone: '',
        universitySchool: '',
        gender: 'male',
        birthday: '',
        appliedDate: new Date().toISOString(),
        position: '',
        level: '',
        department: '',
        source: '',
        status: 'received_cv',
        filePath: '',
        productLinks: '',
        note: '',
        gpa: '',
        iqTest: '',
        techTest: '',
        thinkingTest: ''
    });

    const filterOptions = {
        pipelineResults: [
            { value: "pass", label: "Pass" },
            { value: "fail", label: "Fail" },
            { value: "pending", label: "Pending" },
        ],
        levels: ["CTV", "Intern", "Fresher", "Junior", "Middle", "Senior", "NextGen", "Leader", "Manager", "Freelancer"],
        departments: ["HR", "KT", "Atomic", "Marketing", "Data", "Hypercat", "Unicorn", "Galaxy", "Lab"],
        sources: [
            "Vietnamwork", "TOPCV - topmax", "Hunt", "Website", "Fanpage", "Nội bộ giới thiệu",
            "TOPCV - ứng tuyển", "TTS", "Ybox", "Linkedin", "NextGen Intern", "Đăng tuyển",
            "Ads", "Search TopCV", "Đăng ký qua trường", "HB",
        ],
        genders: [
            { value: "male", label: "Nam" },
            { value: "female", label: "Nữ" },
        ],
        schools: [
            "ĐH Bách Khoa", "ĐH Công nghệ", "ĐH Khoa học Tự nhiên", "ĐH Kinh tế Quốc dân",
            "ĐH Ngoại thương", "ĐH FPT", "Học viện Công nghệ Bưu chính Viễn thông",
            "ĐH Giao thông vận tải", "Khác"
        ],
        positionsList: [
            "Unity Developer", "2D Artist", "3D Artist", "Game Designer", "UI/UX Designer",
            "Backend Developer", "Frontend Developer", "Android Developer - Native",
            "Store Policy", "Tester", "TA", "BA", "Product Owner", "UA Marketing",
            "VFX", "Playable Ads", "Video Editor", "Data Analyst", "Animation",
            "Finance Leader", "IC", "CTV Level Game Design", "AI Engineer",
            "Flutter Developer", "OS 2D Artist", "Business Development",
            "Accountant", "HRM", "MO"
        ],
        noteSuggestions: [
            "HS_Kinh nghiệm không phù hợp", "HS_Thời gian đi làm", "HS_Lý do khác", "HS_Độ tuổi không phù hợp",
            "HS_Ngoại ngữ không đạt", "HS_Địa điểm không phù hợp", "HS_Không có nhu cầu ứng tuyển", "HS_Trường học chưa phù hợp",
            "Scan_Chưa gửi review", "Scan_Đã có công việc khác", "Scan_Địa điểm không phù hợp", "Scan_Không có nhu cầu ứng tuyển"
        ]
    };

    useEffect(() => {
        fetchCandidates();
        fetchPipelineStages();
        fetchPositions();
    }, []);

    const fetchCandidates = async (currentFilters = filters) => {
        setLoading(true);
        const token = localStorage.getItem('access_token');
        const queryParams = new URLSearchParams();
        
        if (currentFilters.positions?.length) queryParams.append('position', currentFilters.positions.join(','));
        
        const pCodes = currentFilters.pipelines?.map(p => p.code).filter(Boolean);
        const pResults = currentFilters.pipelines?.flatMap(p => p.results).filter(Boolean);
        if (pCodes?.length) queryParams.append('pipelineCode', pCodes.join(','));
        if (pResults?.length) queryParams.append('pipelineResult', pResults.join(','));

        if (currentFilters.departments?.length) queryParams.append('department', currentFilters.departments.join(','));
        if (currentFilters.levels?.length) queryParams.append('level', currentFilters.levels.join(','));
        if (currentFilters.sources?.length) queryParams.append('source', currentFilters.sources.join(','));
        if (currentFilters.schools?.length) queryParams.append('universitySchool', currentFilters.schools.join(','));
        if (currentFilters.genders?.length) queryParams.append('gender', currentFilters.genders.join(','));
        if (currentFilters.statuses?.length) queryParams.append('status', currentFilters.statuses.join(','));
        if (currentFilters.startDate) queryParams.append('startDate', currentFilters.startDate);
        if (currentFilters.endDate) queryParams.append('endDate', currentFilters.endDate);
        if (currentFilters.search) queryParams.append('fullName', currentFilters.search);

        try {
            const response = await fetch(`http://localhost:8086/api/recruitment/candidates?${queryParams.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            if (response.ok) {
                const result = await response.json();
                setCandidates(result.data || []);
                setTotalItems(result.totalItems || 0);
            }
        } catch (error) {
            console.error('Error fetching candidates:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPipelineStages = async () => {
        const token = localStorage.getItem('access_token');
        try {
            const response = await fetch('http://localhost:8086/api/recruitment/pipeline-stages', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const result = await response.json();
                setPipelineStages(result.data || []);
            }
        } catch (error) {
            console.error('Error fetching stages:', error);
        }
    };

    const fetchPositions = async () => {
        const token = localStorage.getItem('access_token');
        try {
            const response = await fetch('http://localhost:8086/api/recruitment-order/manager/all?status=inprogress', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const result = await response.json();
                setPositions(result.data || []);
            }
        } catch (error) {
            console.error('Error fetching positions:', error);
        }
    };

    const debouncedFetch = useRef(
        debounce((currentFilters) => {
            fetchCandidates(currentFilters);
        }, 300)
    ).current;

    const handleFilterChange = (name, value) => {
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        if (name === 'search') {
            debouncedFetch(newFilters);
        }
    };

    const applyFilters = () => {
        fetchCandidates();
        setIsModalOpen(false);
    };

    const resetFilters = () => {
        setFilters({
            positions: [], statuses: [], pipelines: [{ code: null, results: [] }],
            levels: [], departments: [], sources: [], genders: [], schools: [],
            startDate: null, endDate: null, search: ''
        });
        fetchCandidates({
            positions: [], statuses: [], pipelines: [{ code: null, results: [] }],
            levels: [], departments: [], sources: [], genders: [], schools: [],
            startDate: null, endDate: null, search: ''
        });
    };

    const addPipeline = () => {
        setFilters(prev => ({
            ...prev,
            pipelines: [...prev.pipelines, { code: null, results: [] }]
        }));
    };

    const removePipeline = (index) => {
        setFilters(prev => ({
            ...prev,
            pipelines: prev.pipelines.filter((_, i) => i !== index)
        }));
    };

    const updatePipeline = (index, field, value) => {
        setFilters(prev => {
            const newPipelines = [...prev.pipelines];
            newPipelines[index] = { ...newPipelines[index], [field]: value };
            return { ...prev, pipelines: newPipelines };
        });
    };

    const checkCandidate = async (email) => {
        if (!email || !email.includes('@') || isEditing) return;
        const token = localStorage.getItem('access_token');
        try {
            const response = await fetch(`http://localhost:8086/api/recruitment/candidate/check`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            if (response.ok) {
                const result = await response.json();
                if (result.data && result.data.exists) {
                    const c = result.data;
                    setQuickCreateForm(prev => ({
                        ...prev,
                        fullName: c.fullName || prev.fullName,
                        phone: c.phone || prev.phone,
                        universitySchool: c.universitySchool || prev.universitySchool,
                        gender: c.gender || prev.gender,
                        birthday: c.birthday || prev.birthday
                    }));
                }
            }
        } catch (error) {
            console.error('Error checking candidate:', error);
        }
    };

    const handleQuickCreateChange = (name, value) => {
        setQuickCreateForm(prev => ({ ...prev, [name]: value }));
        if (name === 'email') {
            const timer = setTimeout(() => checkCandidate(value), 1000);
            return () => clearTimeout(timer);
        }
    };

    const handleEdit = async (candidate) => {
        const token = localStorage.getItem('access_token');
        try {
            const response = await fetch(`http://localhost:8086/api/recruitment/candidate/${candidate.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const app = data.applications?.[0] || {};
                const cv = app.cvs?.[0] || {};
                
                setEditingIds({ candidateId: data.id, applicationId: app.id });
                setQuickCreateForm({
                    fullName: data.fullName || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    universitySchool: data.universitySchool || '',
                    gender: data.gender || 'male',
                    birthday: data.birthday || '',
                    appliedDate: app.appliedDate || new Date().toISOString(),
                    position: app.position || '',
                    level: app.level || '',
                    department: app.department || '',
                    source: app.source || '',
                    status: app.status || 'received_cv',
                    filePath: cv.filePath || '',
                    productLinks: cv.productLinks || '',
                    note: app.note || '',
                    gpa: app.gpa || '',
                    iqTest: app.iqTest || '',
                    techTest: app.techTest || '',
                    thinkingTest: app.thinkingTest || ''
                });
                setIsEditing(true);
                setIsQuickCreateOpen(true);
            }
        } catch (error) {
            console.error('Error fetching candidate details:', error);
        }
    };

    const submitQuickCreate = async () => {
        const token = localStorage.getItem('access_token');
        try {
            if (isEditing) {
                // Update Candidate
                const candRes = await fetch(`http://localhost:8086/api/recruitment/candidate/${editingIds.candidateId}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fullName: quickCreateForm.fullName,
                        email: quickCreateForm.email,
                        phone: quickCreateForm.phone,
                        universitySchool: quickCreateForm.universitySchool,
                        gender: quickCreateForm.gender,
                        birthday: quickCreateForm.birthday
                    })
                });

                // Update Application
                const appRes = await fetch(`http://localhost:8086/api/recruitment/application/${editingIds.applicationId}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        appliedDate: quickCreateForm.appliedDate,
                        position: quickCreateForm.position,
                        level: quickCreateForm.level,
                        department: quickCreateForm.department,
                        source: quickCreateForm.source,
                        filePath: quickCreateForm.filePath,
                        productLinks: quickCreateForm.productLinks,
                        note: quickCreateForm.note,
                        gpa: quickCreateForm.gpa,
                        iqTest: quickCreateForm.iqTest,
                        techTest: quickCreateForm.techTest,
                        thinkingTest: quickCreateForm.thinkingTest
                    })
                });

                if (candRes.ok && appRes.ok) {
                    message.success('Cập nhật thành công!');
                    setIsQuickCreateOpen(false);
                    fetchCandidates();
                } else {
                    message.error('Lỗi khi cập nhật thông tin');
                }
            } else {
                // Create New
                const response = await fetch('http://localhost:8086/api/recruitment/candidate', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(quickCreateForm)
                });
                if (response.ok) {
                    message.success('Thêm ứng viên thành công!');
                    setIsQuickCreateOpen(false);
                    fetchCandidates();
                } else {
                    const err = await response.json();
                    message.error('Lỗi: ' + (err.message || 'Không thể tạo ứng viên'));
                }
            }
        } catch (error) {
            console.error('Error submitting form:', error);
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

    const getDrivePreviewUrl = (url) => {
        if (!url) return null;
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
            return `https://drive.google.com/file/d/${match[1]}/preview`;
        }
        return null;
    };

    return (
        <div className="p-8 lg:p-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Thông tin ứng viên</h1>
                    <p className="text-gray-500 font-medium">{totalItems} ứng viên</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm ứng viên..." 
                            className="pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl w-64 focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none transition-all"
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchCandidates()}
                        />
                    </div>
                    <button className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition-all">
                        <i className="fa-solid fa-file-export"></i>
                        Export
                    </button>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition-all"
                    >
                        <i className="fa-solid fa-sliders"></i>
                        Customize
                    </button>
                    
                    <button 
                        onClick={() => { 
                            setIsEditing(false); 
                            setQuickCreateForm({
                                fullName: '', email: '', phone: '', universitySchool: '', gender: 'male', birthday: '',
                                appliedDate: new Date().toISOString(), position: '', level: '', department: '', source: '',
                                status: 'received_cv', filePath: '', productLinks: '', note: '', gpa: '', iqTest: '', techTest: '', thinkingTest: ''
                            });
                            setIsQuickCreateOpen(true); 
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-bold rounded-2xl hover:bg-brand-700 shadow-lg shadow-brand-600/20 transition-all"
                    >
                        <i className="fa-solid fa-plus"></i>
                        Tạo ứng viên
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-50">
                                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">STT</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Họ và tên</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Trường học</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">Giới tính</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Vị trí ứng tuyển</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Level</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Phòng ban</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Nguồn</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">Trạng thái</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">Ngày ứng tuyển</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="11" className="px-6 py-8"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : candidates.map((candidate, index) => {
                                const app = candidate.applications?.[0] || {};
                                return (
                                    <tr key={candidate.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-5 text-sm font-medium text-gray-400">{index + 1}</td>
                                        <td className="px-6 py-5">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 group-hover:text-brand-600 transition-colors">{candidate.fullName}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">ID: {candidate.id}</p>
                                                <p className="text-[10px] text-gray-400">{candidate.phone} • {candidate.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-sm text-gray-600">{candidate.universitySchool || '—'}</td>
                                        <td className="px-6 py-5 text-center text-sm text-gray-600 uppercase text-[10px] font-bold">{candidate.gender === 'male' ? 'Nam' : 'Nữ'}</td>
                                        <td className="px-6 py-5 text-sm text-gray-600 font-medium">{app.orderInfo?.position || app.position || '—'}</td>
                                        <td className="px-6 py-5 text-sm text-gray-600">{app.level || '—'}</td>
                                        <td className="px-6 py-5 text-sm text-gray-600">{app.department || '—'}</td>
                                        <td className="px-6 py-5 text-sm text-gray-600">{app.source || '—'}</td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(app.status)}`}>
                                                {app.pipelineInfo?.name || app.status || '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-sm text-gray-600 text-center">{app.appliedDate ? new Date(app.appliedDate).toLocaleDateString('vi-VN') : '—'}</td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => setPreviewCV({ url: app.cvs?.[0]?.filePath, name: candidate.fullName })}
                                                    className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center hover:bg-brand-100 transition-all"
                                                    title="Xem CV"
                                                >
                                                    <i className="fa-solid fa-eye text-xs"></i>
                                                </button>
                                                <button 
                                                    onClick={() => handleEdit(candidate)}
                                                    className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center hover:bg-orange-100 transition-all"
                                                    title="Chỉnh sửa"
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
            </div>

            {/* Quick Create / Edit Modal */}
            {isQuickCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-end">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsQuickCreateOpen(false)}></div>
                    <div className="bg-white w-full max-w-5xl h-screen shadow-2xl relative flex flex-col animate-slide-left">
                        <div className="p-6 bg-brand-600 text-white flex items-center justify-between">
                            <h2 className="text-xl font-bold">{isEditing ? 'Chỉnh sửa thông tin' : 'Thêm ứng viên mới'}</h2>
                            <button onClick={() => setIsQuickCreateOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-all">
                                <i className="fa-solid fa-xmark text-xl"></i>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 pb-32">
                            <div className="grid grid-cols-12 gap-10">
                                <div className="col-span-12 lg:col-span-7 space-y-10">
                                    <section>
                                        <h3 className="text-sm font-bold text-orange-500 mb-6 flex items-center gap-2">
                                            <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                                            Thông tin cá nhân
                                        </h3>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="col-span-2 md:col-span-1 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Họ và tên *</label>
                                                <input type="text" value={quickCreateForm.fullName} onChange={(e) => handleQuickCreateChange('fullName', e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm" placeholder="Nhập họ và tên" />
                                            </div>
                                            <div className="col-span-2 md:col-span-1 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Email *</label>
                                                <input type="email" value={quickCreateForm.email} onChange={(e) => handleQuickCreateChange('email', e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm" placeholder="example@gmail.com" />
                                            </div>
                                            <div className="col-span-2 md:col-span-1 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Số điện thoại *</label>
                                                <input type="text" value={quickCreateForm.phone} onChange={(e) => handleQuickCreateChange('phone', e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm" placeholder="09xxxxxxx" />
                                            </div>
                                            <div className="col-span-2 md:col-span-1 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Trường học</label>
                                                <select value={quickCreateForm.universitySchool} onChange={(e) => handleQuickCreateChange('universitySchool', e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm appearance-none cursor-pointer">
                                                    <option value="">Chọn trường</option>
                                                    {filterOptions.schools.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-2 md:col-span-1 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">GPA</label>
                                                <input type="text" value={quickCreateForm.gpa} onChange={(e) => handleQuickCreateChange('gpa', e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm" placeholder="Ví dụ: 3.5" />
                                            </div>
                                            <div className="col-span-2 md:col-span-1 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Giới tính</label>
                                                <select value={quickCreateForm.gender} onChange={(e) => handleQuickCreateChange('gender', e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm appearance-none cursor-pointer">
                                                    {filterOptions.genders.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-2 md:col-span-1 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Năm sinh</label>
                                                <input type="text" value={quickCreateForm.birthday} onChange={(e) => handleQuickCreateChange('birthday', e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm" placeholder="Ví dụ: 2000" />
                                            </div>
                                        </div>
                                    </section>

                                    <section>
                                        <h3 className="text-sm font-bold text-orange-500 mb-6 flex items-center gap-2">
                                            <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                                            Thông tin ứng tuyển
                                        </h3>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="col-span-2 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Vị trí ứng tuyển *</label>
                                                <select value={quickCreateForm.position} onChange={(e) => handleQuickCreateChange('position', e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm">
                                                    <option value="">Chọn vị trí</option>
                                                    {positions.map(p => <option key={p.id} value={p.id}>{p.position} ({p.team})</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-1 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Level</label>
                                                <select value={quickCreateForm.level} onChange={(e) => handleQuickCreateChange('level', e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm">
                                                    <option value="">Chọn level</option>
                                                    {filterOptions.levels.map(l => <option key={l} value={l}>{l}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-1 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Phòng ban</label>
                                                <select value={quickCreateForm.department} onChange={(e) => handleQuickCreateChange('department', e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm">
                                                    <option value="">Chọn phòng ban</option>
                                                    {filterOptions.departments.map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-1 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Nguồn</label>
                                                <select value={quickCreateForm.source} onChange={(e) => handleQuickCreateChange('source', e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm">
                                                    <option value="">Chọn nguồn</option>
                                                    {filterOptions.sources.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-1 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Trạng thái *</label>
                                                <select value={quickCreateForm.status} onChange={(e) => handleQuickCreateChange('status', e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm">
                                                    {pipelineStages.map(s => <option key={s.id} value={s.code}>{s.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </section>
                                    
                                    <section>
                                        <h3 className="text-sm font-bold text-orange-500 mb-6 flex items-center gap-2">
                                            <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                                            Kết quả đánh giá
                                        </h3>
                                        <div className="grid grid-cols-3 gap-4 mb-6">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">IQ Test</label>
                                                <input type="text" value={quickCreateForm.iqTest} onChange={(e) => handleQuickCreateChange('iqTest', e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm" placeholder="X/Y" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Technical</label>
                                                <input type="text" value={quickCreateForm.techTest} onChange={(e) => handleQuickCreateChange('techTest', e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm" placeholder="X/Y" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Thinking</label>
                                                <input type="text" value={quickCreateForm.thinkingTest} onChange={(e) => handleQuickCreateChange('thinkingTest', e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm" placeholder="X/Y" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</label>
                                            <textarea value={quickCreateForm.note} onChange={(e) => handleQuickCreateChange('note', e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm min-h-[100px]" placeholder="Nhập ghi chú..."></textarea>
                                        </div>
                                    </section>
                                </div>

                                <div className="col-span-12 lg:col-span-5 space-y-10">
                                    <section className="space-y-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Link CV *</label>
                                            <div className="relative">
                                                <input type="text" value={quickCreateForm.filePath} onChange={(e) => handleQuickCreateChange('filePath', e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm pr-10" placeholder="https://drive.google.com/..." />
                                                <i className="fa-solid fa-link absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 rounded-[2rem] border border-gray-100 overflow-hidden flex flex-col min-h-[650px]">
                                            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white/50">
                                                <div className="flex items-center gap-2">
                                                    <i className="fa-solid fa-file-pdf text-red-500"></i>
                                                    <span className="text-xs font-bold text-gray-700 uppercase tracking-tight">Preview CV (AI)</span>
                                                </div>
                                            </div>
                                            <div className="flex-1 bg-gray-100 relative">
                                                {getDrivePreviewUrl(quickCreateForm.filePath) ? (
                                                    <iframe 
                                                        src={getDrivePreviewUrl(quickCreateForm.filePath)} 
                                                        className="absolute inset-0 w-full h-full border-none" 
                                                        title="CV Preview"
                                                    ></iframe>
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                                                        <i className="fa-solid fa-cloud-arrow-up text-2xl text-gray-300 mb-4"></i>
                                                        <p className="text-xs text-gray-400 font-medium">Dán link Drive để xem CV</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Link Sản phẩm</label>
                                            <textarea value={quickCreateForm.productLinks} onChange={(e) => handleQuickCreateChange('productLinks', e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm min-h-[80px]" placeholder="Nhập link sản phẩm..."></textarea>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>

                        <div className="absolute bottom-0 inset-x-0 p-6 bg-white border-t border-gray-100 flex items-center justify-end gap-3 z-10">
                            <button onClick={() => setIsQuickCreateOpen(false)} className="px-8 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-2xl transition-all border border-gray-200">Hủy</button>
                            <button onClick={submitQuickCreate} className="px-10 py-3 text-sm font-bold bg-brand-600 text-white rounded-2xl shadow-xl shadow-brand-600/20 hover:bg-brand-700 transition-all">
                                {isEditing ? 'Cập nhật' : 'Thêm mới'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Standalone CV Preview Modal */}
            {previewCV && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setPreviewCV(null)}></div>
                    <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col animate-zoom-in">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
                                    <i className="fa-solid fa-file-pdf"></i>
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">Xem CV - {previewCV.name}</h2>
                            </div>
                            <button onClick={() => setPreviewCV(null)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        <div className="flex-1 bg-gray-100">
                            <iframe src={getDrivePreviewUrl(previewCV.url)} className="w-full h-full border-none" title="CV Full Preview"></iframe>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Modal (Customize) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                                    <i className="fa-solid fa-sliders"></i>
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Customize</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={resetFilters} className="px-6 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100">Xóa bộ lọc</button>
                                <button onClick={applyFilters} className="px-8 py-2.5 text-sm font-bold bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition-all">Áp dụng</button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-8 pb-12">
                            {displayActiveFilters.length > 0 && (
                                <section className="p-6 bg-blue-50/30 rounded-[2rem] border border-blue-100/50">
                                    <h4 className="text-[10px] font-bold text-brand-600 uppercase mb-4">Đang áp dụng bộ lọc</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {displayActiveFilters.map(f => (
                                            <Tag key={f.key} closable onClose={() => {
                                                const newFilters = { ...filters };
                                                if (f.key === 'date') {
                                                    newFilters.startDate = null;
                                                    newFilters.endDate = null;
                                                } else {
                                                    newFilters[f.key] = [];
                                                }
                                                setFilters(newFilters);
                                            }} className="px-4 py-1.5 rounded-full bg-white border-blue-100 text-brand-700 text-xs font-medium m-0">
                                                <span className="opacity-60">{f.label}:</span> {f.value}
                                            </Tag>
                                        ))}
                                    </div>
                                </section>
                            )}

                            <section>
                                <h3 className="text-[10px] font-bold text-brand-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    THÔNG TIN TUYỂN DỤNG
                                </h3>
                                
                                <div className="mb-8 space-y-4">
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-brand-600 uppercase">
                                        <i className="fa-regular fa-calendar"></i>
                                        KHOẢNG THỜI GIAN ỨNG TUYỂN (APPLY DATE RANGE)
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <RangePicker 
                                            className="h-12 rounded-xl border-gray-300 w-full"
                                            placeholder={['Từ ngày', 'Đến ngày']}
                                            format="DD/MM/YYYY"
                                            value={filters.startDate ? [dayjs(filters.startDate), dayjs(filters.endDate)] : null}
                                            onChange={(dates) => {
                                                setFilters(prev => ({
                                                    ...prev,
                                                    startDate: dates ? dates[0].format('YYYY-MM-DD') : null,
                                                    endDate: dates ? dates[1].format('YYYY-MM-DD') : null
                                                }));
                                            }}
                                        />
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setFilters(p => ({ ...p, startDate: dayjs().format('YYYY-MM-DD'), endDate: dayjs().format('YYYY-MM-DD') }))} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Hôm nay</button>
                                            <button onClick={() => setFilters(p => ({ ...p, startDate: dayjs().startOf('month').format('YYYY-MM-DD'), endDate: dayjs().endOf('month').format('YYYY-MM-DD') }))} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Tháng này</button>
                                            <button onClick={() => setFilters(p => ({ ...p, startDate: null, endDate: null }))} className="px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg">Xóa</button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium italic">
                                        <i className="fa-solid fa-circle-info mr-1"></i>
                                        Hệ thống sẽ lấy dữ liệu các ứng viên có appliedDate nằm trong khoảng trên.
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-brand-600 uppercase">
                                        <i className="fa-solid fa-diagram-project"></i>
                                        CHI TIẾT PIPELINE
                                    </div>
                                    
                                    <div className="p-6 bg-gray-50/50 border border-gray-200 rounded-[2rem] space-y-6">
                                        {filters.pipelines.map((p, idx) => (
                                            <div key={idx} className="grid grid-cols-2 gap-8 relative items-end">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">VÒNG TUYỂN DỤNG</label>
                                                    <Select 
                                                        placeholder="Chọn vòng"
                                                        className="w-full h-12"
                                                        value={p.code}
                                                        onChange={(val) => updatePipeline(idx, 'code', val)}
                                                        options={pipelineStages.map(s => ({ 
                                                            value: s.code, 
                                                            label: s.name,
                                                            disabled: filters.pipelines.some((other, oIdx) => oIdx !== idx && other.code === s.code)
                                                        }))}
                                                    />
                                                </div>
                                                <div className="space-y-2 pr-10 relative">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">KẾT QUẢ</label>
                                                    <Select 
                                                        mode="multiple"
                                                        maxTagCount={2}
                                                        placeholder="Tất cả"
                                                        className="w-full h-12"
                                                        value={p.results}
                                                        onChange={(val) => updatePipeline(idx, 'results', val)}
                                                        options={filterOptions.pipelineResults}
                                                    />
                                                    {filters.pipelines.length > 1 && (
                                                        <button 
                                                            onClick={() => removePipeline(idx)} 
                                                            className="absolute right-0 top-1/2 translate-y-[-5px] w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors"
                                                        >
                                                            <i className="fa-solid fa-trash-can"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        
                                        <button 
                                            onClick={addPipeline} 
                                            className="text-brand-600 text-[11px] font-bold uppercase flex items-center gap-2 hover:opacity-70 transition-opacity"
                                        >
                                            <i className="fa-solid fa-plus"></i> THÊM VÒNG TUYỂN DỤNG
                                        </button>
                                    </div>
                                </div>
                            </section>

                            <section className="grid grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-gray-600 flex items-center gap-2">
                                        <i className="fa-solid fa-briefcase text-blue-500"></i> Vị trí ứng tuyển
                                    </label>
                                    <Select mode="multiple" maxTagCount={2} className="w-full h-11" placeholder="Tất cả" value={filters.positions} onChange={v => setFilters(prev => ({ ...prev, positions: v }))} options={filterOptions.positionsList.map(p => ({ value: p, label: p }))} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-gray-600 flex items-center gap-2">
                                        <i className="fa-solid fa-flag text-green-500"></i> Trạng thái
                                    </label>
                                    <Select mode="multiple" maxTagCount={2} className="w-full h-11" placeholder="Tất cả" value={filters.statuses} onChange={v => setFilters(prev => ({ ...prev, statuses: v }))} options={pipelineStages.map(s => ({ value: s.code, label: s.name }))} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-gray-600 flex items-center gap-2">
                                        <i className="fa-solid fa-layer-group text-purple-500"></i> Level
                                    </label>
                                    <Select mode="multiple" maxTagCount={2} className="w-full h-11" placeholder="Tất cả" value={filters.levels} onChange={v => setFilters(prev => ({ ...prev, levels: v }))} options={filterOptions.levels.map(l => ({ value: l, label: l }))} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-gray-600 flex items-center gap-2">
                                        <i className="fa-solid fa-building text-cyan-500"></i> Phòng ban
                                    </label>
                                    <Select mode="multiple" maxTagCount={2} className="w-full h-11" placeholder="Tất cả" value={filters.departments} onChange={v => setFilters(prev => ({ ...prev, departments: v }))} options={filterOptions.departments.map(d => ({ value: d, label: d }))} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-gray-600 flex items-center gap-2">
                                        <i className="fa-solid fa-bullhorn text-orange-500"></i> Nguồn
                                    </label>
                                    <Select mode="multiple" maxTagCount={2} className="w-full h-11" placeholder="Tất cả" value={filters.sources} onChange={v => setFilters(prev => ({ ...prev, sources: v }))} options={filterOptions.sources.map(s => ({ value: s, label: s }))} />
                                </div>
                            </section>

                            <section className="border-t border-gray-100 pt-8">
                                <h3 className="text-[10px] font-bold text-brand-600 uppercase tracking-widest mb-6">HỌC VẤN & ĐÁNH GIÁ</h3>
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-gray-600 flex items-center gap-2">
                                            <i className="fa-solid fa-venus-mars text-pink-500"></i> Giới tính
                                        </label>
                                        <Select mode="multiple" maxTagCount={2} className="w-full h-11" placeholder="Tất cả" value={filters.genders} onChange={v => setFilters(prev => ({ ...prev, genders: v }))} options={filterOptions.genders} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-gray-600 flex items-center gap-2">
                                            <i className="fa-solid fa-graduation-cap text-indigo-500"></i> Trường học
                                        </label>
                                        <Select mode="multiple" maxTagCount={2} className="w-full h-11" placeholder="Tất cả" value={filters.schools} onChange={v => setFilters(prev => ({ ...prev, schools: v }))} options={filterOptions.schools.map(s => ({ value: s, label: s }))} />
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slide-left { from { transform: translateX(100%); } to { transform: translateX(0); } }
                @keyframes zoom-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .animate-slide-left { animation: slide-left 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
                .animate-zoom-in { animation: zoom-in 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
            `}</style>
        </div>
    );
};

export default Candidates;
