import { DatePicker, message, Select, Tag } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

const { RangePicker } = DatePicker;

const PIPELINE_LABELS = {
  received_cv: "Tiếp nhận hồ sơ",
  hr_scan: "HR lọc hồ sơ",
  iq_test: "Test IQ Online",
  technical_test: "Test offline/Chuyên môn",
  department_review: "Bộ phận chọn hồ sơ",
  interview_round_1: "Phỏng vấn vòng 1",
  interview_round_2: "Phỏng vấn vòng 2",
  offer: "Offer",
  onboarding: "Onboarding",
  fail: "Không phù hợp",
};

const RESULT_LABELS = {
  pending: "Đang xử lý",
  pass: "Đạt",
  fail: "Không đạt",
};

const formatDateTime = (value) => {
  if (!value) return "--";
  return new Date(value).toLocaleString("vi-VN");
};

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
    const [syncingSheet, setSyncingSheet] = useState(false);
    const [lastSyncedAt, setLastSyncedAt] = useState(null);
    /* ── Client-side pagination ── */
    const [uiPage, setUiPage] = useState(1);
    const [uiPageSize, setUiPageSize] = useState(10);

    const [searchParams, setSearchParams] = useSearchParams();

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
        search: searchParams.get('search') || '',
        candidateId: searchParams.get('candidateId') || null
    });

    const displayActiveFilters = useMemo(() => {
        const list = [];
        if (filters.positions?.length) {
            const positionLabels = filters.positions.map(positionId => {
                const position = positions.find(item => String(item.id) === String(positionId) || String(item.orderId) === String(positionId) || String(item.recruitmentOrderId) === String(positionId));
                if (!position) return positionId;
                return position.team ? `${position.position} - ${position.team}` : position.position;
            });
            list.push({ key: 'positions', label: 'Vị trí', value: positionLabels.join(', ') });
        }
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
        if (filters.candidateId) list.push({ key: 'candidateId', label: 'ID Ứng viên', value: filters.candidateId });
        return list;
    }, [filters, positions, pipelineStages]);

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
        thinkingTest: '',
        testOnlineStatus: '',
        pipelineHistory: [],
        managerReview: null
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
const parseCandidateList = (result) => {
        if (Array.isArray(result)) return result;
        if (Array.isArray(result?.data)) return result.data;
        if (Array.isArray(result?.data?.data)) return result.data.data;
        if (Array.isArray(result?.data?.items)) return result.data.items;
        if (Array.isArray(result?.data?.candidates)) return result.data.candidates;
        if (Array.isArray(result?.items)) return result.items;
        if (Array.isArray(result?.result)) return result.result;
        if (Array.isArray(result?.candidates)) return result.candidates;
        return [];
    };

    const getResponseTotal = (result, fallback = 0) => {
        return (
            result?.totalItems ||
            result?.total ||
            result?.count ||
            result?.data?.totalItems ||
            result?.data?.total ||
            result?.data?.count ||
            result?.meta?.totalItems ||
            result?.meta?.total ||
            result?.data?.meta?.totalItems ||
            result?.data?.meta?.total ||
            fallback
        );
    };

    const buildCandidateQuery = (currentFilters = filters) => {
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

        return queryParams;
    };

    const mergeCandidatesById = (list) => {
        const uniqueMap = new Map();

        list.forEach((candidate) => {
            const key = candidate?.id ?? candidate?.candidateId ?? candidate?.email ?? candidate?.phone;
            if (key !== undefined && key !== null && String(key) !== '') {
                uniqueMap.set(String(key), candidate);
            }
        });

        return Array.from(uniqueMap.values());
    };

    const fetchCandidates = async (currentFilters = filters) => {
        setLoading(true);
        setUiPage(1);

        const token   = localStorage.getItem('access_token');
        const baseUrl = 'http://localhost:3000/api/recruitment/candidates';

        /* ── Backend đọc page/size từ HTTP HEADER (BaseHeaderDTO), không phải query param ── */
        const makeHeaders = (page, size) => ({
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            page: String(page),
            size: String(size),
        });

        try {
            /* ── Page 1: lấy tổng số ── */
            const q1 = buildCandidateQuery(currentFilters);
            const r1 = await fetch(`${baseUrl}?${q1}`, { headers: makeHeaders(1, 12) });

            if (r1.status === 401) {
                localStorage.removeItem('access_token');
                message.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                window.location.href = '/login';
                return;
            }
            if (!r1.ok) throw new Error('Không thể tải danh sách ứng viên');

            const d1    = await r1.json();
            const list1 = parseCandidateList(d1);
            const total = getResponseTotal(d1, list1.length);

            console.log('[Candidates] page=1 items:', list1.length, '| total:', total);

            /* ── Nếu đã đủ → dừng ── */
            if (list1.length === 0 || list1.length >= total) {
                setCandidates(mergeCandidatesById(list1));
                setTotalItems(total || list1.length);
                return;
            }

            /* ── Fetch các page còn lại song song với header page/size ── */
            const pageSize   = list1.length || 12;
            const totalPages = Math.min(50, Math.ceil(total / pageSize));

            const restPromises = [];
            for (let p = 2; p <= totalPages; p++) {
                const q = buildCandidateQuery(currentFilters);
                restPromises.push(
                    fetch(`${baseUrl}?${q}`, { headers: makeHeaders(p, pageSize) })
                        .then(r => {
                            if (r.status === 401) {
                                localStorage.removeItem('access_token');
                                window.location.href = '/login';
                                return [];
                            }
                            return r.ok ? r.json() : null;
                        })
                        .then(d => {
                            const l = parseCandidateList(d);
                            console.log(`[Candidates] page=${p} items:`, l.length);
                            return l;
                        })
                        .catch(err => { console.error(`page ${p} error:`, err); return []; })
                );
            }

            const restPages = await Promise.all(restPromises);
            const allItems  = [list1, ...restPages].flat();
            const finalList = mergeCandidatesById(allItems);

            console.log('[Candidates] Tổng sau gộp:', finalList.length, '| total backend:', total);

            setCandidates(finalList);
            setTotalItems(total || finalList.length);
        } catch (error) {
            console.error('fetchCandidates error:', error);
            message.error(error.message || 'Không thể tải danh sách ứng viên');
        } finally {
            setLoading(false);
        }
    };



    const fetchPipelineStages = async () => {
        const token = localStorage.getItem('access_token');
        try {
            const response = await fetch('http://localhost:3000/api/recruitment/pipeline-stages', {
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
            const response = await fetch('http://localhost:3000/api/recruitment-order/manager/all?status=inprogress', {
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

    const handleSyncGoogleSheet = async (silent = false) => {
        if (syncingSheet) return;

        const token = localStorage.getItem('access_token');
        setSyncingSheet(true);

        try {
            const response = await fetch('http://localhost:3000/api/recruitment/candidate/google-sheet/sync', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 401) {
                localStorage.removeItem('access_token');
                message.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                window.location.href = '/login';
                return;
            }

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(result?.message || 'Đồng bộ Google Sheet thất bại');
            }

            const syncedAt = new Date();
setLastSyncedAt(syncedAt);
localStorage.setItem('candidates_last_synced_at', syncedAt.toISOString());
            if (!silent) {
                message.success(result?.message || 'Đồng bộ ứng viên từ Google Sheet thành công');
            }

            // Không dùng response sync để setCandidates, vì response sync có thể chỉ là dữ liệu mới.
            // Luôn gọi lại API danh sách để không làm mất dữ liệu cũ trên FE.
            await fetchCandidates();
        } catch (error) {
            console.error('Sync Google Sheet error:', error);
            if (!silent) message.error(error.message || 'Không thể đồng bộ Google Sheet');
        } finally {
            setSyncingSheet(false);
        }
    };

    useEffect(() => {
        const savedSyncedAt = localStorage.getItem('candidates_last_synced_at');
        if (savedSyncedAt) {
            setLastSyncedAt(new Date(savedSyncedAt));
        }
    }, []);

    const syncRef = useRef(handleSyncGoogleSheet);
    useEffect(() => {
        syncRef.current = handleSyncGoogleSheet;
    }, [handleSyncGoogleSheet]);

    /* Auto-sync mỗi 60 phút — sử dụng ref để tránh stale closure và tránh reset interval liên tục */
    useEffect(() => {
        const intervalId = window.setInterval(() => {
            syncRef.current(true);
        }, 60 * 60 * 1000);

        return () => window.clearInterval(intervalId);
    }, []);


    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const applyFilters = () => {
        setIsModalOpen(false);
    };

    const resetFilters = () => {
        setFilters({
            positions: [], statuses: [], pipelines: [{ code: null, results: [] }],
            levels: [], departments: [], sources: [], genders: [], schools: [],
            startDate: null, endDate: null, search: '', candidateId: null
        });
        setSearchParams({});
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
            const response = await fetch(`http://localhost:3000/api/recruitment/candidate/check`, {
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
            const [response, reviewRes] = await Promise.all([
                fetch(`http://localhost:3000/api/recruitment/candidate/${candidate.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`http://localhost:3000/api/recruitment-manager/candidate`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);
            
            if (response.ok) {
                const data = await response.json();
                const app = data.applications?.[0] || {};
                const cv = app.cvs?.[0] || {};
                
                let mgrReview = null;
                if (reviewRes.ok) {
                    const rData = await reviewRes.json();
                    const groups = rData.data?.candidates || {};
                    const allCands = Object.values(groups).flat();
                    const candReview = allCands.find(c => c.applicationId === app.id);
                    if (candReview && candReview.reviewManager?.length > 0) {
                        mgrReview = candReview.reviewManager[0];
                        const managers = rData.data?.managers || [];
                        const mgr = managers.find(m => m.id === mgrReview.reviewerId);
                        if (mgr) mgrReview.reviewerName = mgr.name;
                    }
                }
                
                const rawGender = String(data.gender || '').toLowerCase();
                const normalizedGender = (rawGender === 'female' || rawGender === 'nu' || rawGender === 'nữ') ? 'female' : 'male';

                setEditingIds({ candidateId: data.id, applicationId: app.id });
                setQuickCreateForm({
                    fullName: data.fullName || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    universitySchool: data.universitySchool || '',
                    gender: normalizedGender,
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
                    thinkingTest: app.thinkingTest || '',
                    testOnlineStatus: app.testOnlineStatus || '',
                    pipelineHistory: app.pipelineHistory || [],
                    managerReview: mgrReview
                });
                setIsEditing(true);
                setIsQuickCreateOpen(true);
            }
        } catch (error) {
            console.error('Error fetching candidate details:', error);
        }
    };

    const submitQuickCreate = async () => {
        const normalizeOptional = (value) => {
            if (value === "" || value === null || value === undefined) return undefined;
            return value;
        };

        if (!quickCreateForm.email || quickCreateForm.email.trim() === '') {
            message.error('Vui lòng nhập email hợp lệ');
            return;
        }

        const token = localStorage.getItem('access_token');
        try {
            if (isEditing) {
                // Update Candidate
                const candRes = await fetch(`http://localhost:3000/api/recruitment/candidate/${editingIds.candidateId}`, {
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
                const appRes = await fetch(`http://localhost:3000/api/recruitment/application/${editingIds.applicationId}`, {
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
                        thinkingTest: quickCreateForm.thinkingTest,
                        testOnlineStatus: normalizeOptional(quickCreateForm.testOnlineStatus)
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
                const payload = {
                    ...quickCreateForm,
                    testOnlineStatus: normalizeOptional(quickCreateForm.testOnlineStatus)
                };

                const response = await fetch('http://localhost:3000/api/recruitment/candidate', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
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

    const getPrimaryApplication = (candidate) => {
        return candidate?.applications?.[0] || candidate?.application || candidate?.latestApplication || {};
    };

    const getPositionLabelFromOrder = (order) => {
        if (!order) return '';

        const positionName = order.position || order.name || order.title || order.code || '';
        const teamName = order.team || order.department || '';

        if (positionName && teamName) return `${positionName} - ${teamName}`;
        return positionName;
    };

    const findPositionById = (id) => {
        if (id === undefined || id === null || id === '') return null;

        return positions.find(item => {
            return String(item.id) === String(id)
                || String(item.orderId) === String(id)
                || String(item.recruitmentOrderId) === String(id);
        });
    };

    const getPositionDisplay = (application) => {
        const order = application?.orderInfo || application?.recruitmentOrder || application?.order;
        if (order) {
            return order.position || order.name || order.title || order.code || '';
        }

        const positionId = application?.position || application?.positionId || application?.recruitmentOrderId || application?.orderId;
        const position = findPositionById(positionId);
        if (position) {
            return position.position || position.name || position.title || position.code || '';
        }

        if (positionId) {
            const posString = String(positionId);
            if (posString.includes('-')) {
                return posString.split('-')[0].trim();
            }
            return posString;
        }

        return '—';
    };

    const getGenderDisplay = (gender) => {
        const normalized = String(gender || '').toLowerCase();
        if (normalized === 'male' || normalized === 'nam') return 'Nam';
        if (normalized === 'female' || normalized === 'nu' || normalized === 'nữ') return 'Nữ';
        return gender || '—';
    };

    const getCandidateCvUrl = (application) => {
        return application?.cvs?.[0]?.filePath || application?.cv?.filePath || application?.filePath || application?.cvUrl || '';
    };

    const positionFilterOptions = positions.map(position => ({
        value: String(position.id),
        label: getPositionLabelFromOrder(position) || `Order #${position.id}`
    }));


    const filteredCandidates = useMemo(() => {
        const keyword = String(filters.search || '').trim().toLowerCase();
        const candIdFilter = filters.candidateId ? String(filters.candidateId) : null;

        return candidates.filter(candidate => {
            const appId = candidate.id || candidate.candidateId;
            if (candIdFilter && String(appId) !== candIdFilter && String(candidate.candidateId) !== candIdFilter) {
                return false;
            }

            const app = getPrimaryApplication(candidate);
            const positionLabel = getPositionDisplay(app);
            const positionId = app?.position || app?.positionId || app?.recruitmentOrderId || app?.orderId;
            const statusCode = app?.pipelineInfo?.code || app?.pipelineCode || app?.status || '';
            const appliedDate = app?.appliedDate ? dayjs(app.appliedDate) : null;

            const searchText = [
                candidate?.fullName,
                candidate?.email,
                candidate?.phone,
                candidate?.universitySchool,
                positionLabel,
                app?.level,
                app?.department,
                app?.source,
                statusCode,
                app?.pipelineInfo?.name
            ].filter(Boolean).join(' ').toLowerCase();

            const matchSearch = !keyword || searchText.includes(keyword);
            const matchPosition = !filters.positions?.length || filters.positions.some(value => {
                return String(value) === String(positionId) || String(value) === String(positionLabel);
            });
            const matchStatus = !filters.statuses?.length || filters.statuses.includes(statusCode);
            const matchLevel = !filters.levels?.length || filters.levels.includes(app?.level);
            const matchDepartment = !filters.departments?.length || filters.departments.includes(app?.department);
            const matchSource = !filters.sources?.length || filters.sources.includes(app?.source);
            const matchSchool = !filters.schools?.length || filters.schools.includes(candidate?.universitySchool);
            const matchGender = !filters.genders?.length || filters.genders.some(gender => {
                return String(gender).toLowerCase() === String(candidate?.gender || '').toLowerCase();
            });
            const matchStartDate = !filters.startDate || (appliedDate && !appliedDate.isBefore(dayjs(filters.startDate), 'day'));
            const matchEndDate = !filters.endDate || (appliedDate && !appliedDate.isAfter(dayjs(filters.endDate), 'day'));

            const pipelineCodes = filters.pipelines?.map(p => p.code).filter(Boolean) || [];
            const pipelineResults = filters.pipelines?.flatMap(p => p.results).filter(Boolean) || [];
            const matchPipelineCode = !pipelineCodes.length || pipelineCodes.includes(statusCode);
            const matchPipelineResult = !pipelineResults.length || pipelineResults.includes(app?.pipelineResult || app?.result || app?.statusResult);

            return matchSearch
                && matchPosition
                && matchStatus
                && matchLevel
                && matchDepartment
                && matchSource
                && matchSchool
                && matchGender
                && matchStartDate
                && matchEndDate
                && matchPipelineCode
                && matchPipelineResult;
        });
    }, [candidates, filters, positions]);

    /* ── Phân trang client-side ── */
    const totalFiltered = filteredCandidates.length;
    const totalUiPages  = Math.max(1, Math.ceil(totalFiltered / uiPageSize));
    const pagedCandidates = filteredCandidates.slice(
        (uiPage - 1) * uiPageSize,
        uiPage * uiPageSize
    );

    /* Reset về trang 1 khi filter hoặc pageSize thay đổi */
    const handleUiPageSizeChange = (newSize) => {
        setUiPageSize(newSize);
        setUiPage(1);
    };

    useEffect(() => {
        const cId = searchParams.get('candidateId');
        if (cId) {
            handleEdit({ id: cId });
            setFilters(prev => ({ ...prev, candidateId: cId }));
        } else {
            setFilters(prev => ({ ...prev, candidateId: null }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

  return (
    <div className="p-8 lg:p-12">
        <div className="mb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
                        Thông tin ứng viên
                    </h1>
                    <p className="text-gray-500 font-medium">
                        {filteredCandidates.length}/{totalItems || candidates.length} ứng viên
                    </p>
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

                    <button
                        onClick={() => handleSyncGoogleSheet(false)}
                        disabled={syncingSheet}
                        className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-green-600/20 transition-all"
                    >
                        <i className={`fa-solid ${syncingSheet ? 'fa-spinner fa-spin' : 'fa-rotate'}`}></i>
                        {syncingSheet ? 'Đang đồng bộ...' : 'Đồng bộ ứng viên'}
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
                                thinkingTest: '',
                                testOnlineStatus: '',
                                managerReview: null
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

            {filters.candidateId && (
                <div className="mt-3 flex items-center gap-2">
                    <span className="px-3 py-1 bg-brand-50 text-brand-700 text-xs font-bold rounded-lg border border-brand-100 flex items-center gap-1.5 shadow-sm">
                        Đang lọc theo ID ứng viên: {filters.candidateId}
                        <button onClick={resetFilters} className="text-red-500 hover:text-red-700 font-black ml-1">✕</button>
                    </span>
                </div>
            )}

            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-blue-600">
                <i className="fa-solid fa-clock-rotate-left"></i>
                <span>
                    Tự động đồng bộ mỗi 60 phút
                    {lastSyncedAt && (
                        <>
                            {' '}· Lần đồng bộ gần nhất:{' '}
                            {lastSyncedAt.toLocaleTimeString('vi-VN')} {lastSyncedAt.toLocaleDateString('vi-VN')}
                        </>
                    )}
                </span>
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
                            ) : pagedCandidates.map((candidate, index) => {
                                const globalIndex = (uiPage - 1) * uiPageSize + index;
                                const app = getPrimaryApplication(candidate);
                                return (
                                    <tr key={candidate.id ?? index} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-5 text-sm font-medium text-gray-400">{globalIndex + 1}</td>
                                        <td className="px-6 py-5">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 group-hover:text-brand-600 transition-colors">{candidate.fullName}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">ID: {candidate.id}</p>
                                                <p className="text-[10px] text-gray-400">{candidate.phone} • {candidate.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-sm text-gray-600">{candidate.universitySchool || '—'}</td>
                                        <td className="px-6 py-5 text-center text-sm text-gray-600 uppercase text-[10px] font-bold">{getGenderDisplay(candidate.gender)}</td>
                                        <td className="px-6 py-5 text-sm text-gray-600 font-medium">{getPositionDisplay(app)}</td>
                                        <td className="px-6 py-5 text-sm text-gray-600">{app.level || '—'}</td>
                                        <td className="px-6 py-5 text-sm text-gray-600">{app.department || '—'}</td>
                                        <td className="px-6 py-5 text-sm text-gray-600">{app.source || '—'}</td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`inline-flex min-w-[112px] items-center justify-center rounded-full border px-3 py-1.5 text-xs font-bold leading-none whitespace-nowrap ${getStatusColor(app.status)}`}>
                                              {app.pipelineInfo?.name || app.status || '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-sm text-gray-600 text-center">{app.appliedDate ? new Date(app.appliedDate).toLocaleDateString('vi-VN') : '—'}</td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => setPreviewCV({ url: getCandidateCvUrl(app), name: candidate.fullName })}
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

            {/* ── Pagination footer ── */}
            {!loading && totalFiltered > 0 && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px', background: '#fff',
                    border: '1px solid #F1F5F9', borderTop: '1px solid #E2E8F0',
                    borderRadius: '0 0 24px 24px', marginTop: -1,
                    flexWrap: 'wrap', gap: 10,
                }}>
                    {/* Left: rows per page + count */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>Số dòng/trang:</span>
                        <select
                            value={uiPageSize}
                            onChange={e => handleUiPageSizeChange(Number(e.target.value))}
                            style={{
                                fontSize: 12, padding: '4px 8px', border: '1px solid #E2E8F0',
                                borderRadius: 8, outline: 'none', color: '#0F172A',
                                background: '#F8FAFC', cursor: 'pointer',
                            }}
                        >
                            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 4 }}>
                            {(uiPage - 1) * uiPageSize + 1}–{Math.min(uiPage * uiPageSize, totalFiltered)} / {totalFiltered} ứng viên
                        </span>
                    </div>

                    {/* Right: page navigation */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, color: '#64748B', marginRight: 6, whiteSpace: 'nowrap' }}>
                            Trang {uiPage}/{totalUiPages}
                        </span>
                        {[
                            { icon: 'fa-angles-left',  action: () => setUiPage(1),            disabled: uiPage === 1, title: 'Trang đầu' },
                            { icon: 'fa-chevron-left', action: () => setUiPage(p => p - 1),   disabled: uiPage === 1, title: 'Trang trước' },
                        ].map(btn => (
                            <button key={btn.icon} onClick={btn.action} disabled={btn.disabled} title={btn.title} style={{
                                width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0',
                                background: btn.disabled ? '#F8FAFC' : '#fff',
                                color: btn.disabled ? '#CBD5E1' : '#475569',
                                cursor: btn.disabled ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
                            }}>
                                <i className={`fa-solid ${btn.icon}`}></i>
                            </button>
                        ))}
                        {/* Page numbers: show up to 5 centered around current */}
                        {(() => {
                            const range = [];
                            let start = Math.max(1, uiPage - 2);
                            let end   = Math.min(totalUiPages, start + 4);
                            if (end - start < 4) start = Math.max(1, end - 4);
                            for (let p = start; p <= end; p++) range.push(p);
                            return range.map(p => (
                                <button key={p} onClick={() => setUiPage(p)} style={{
                                    width: 30, height: 30, borderRadius: 8, fontSize: 12,
                                    fontWeight: p === uiPage ? 700 : 400,
                                    border: p === uiPage ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                                    background: p === uiPage ? '#EFF6FF' : '#fff',
                                    color: p === uiPage ? '#2563EB' : '#475569',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>{p}</button>
                            ));
                        })()}
                        {[
                            { icon: 'fa-chevron-right', action: () => setUiPage(p => p + 1),     disabled: uiPage === totalUiPages, title: 'Trang sau' },
                            { icon: 'fa-angles-right',  action: () => setUiPage(totalUiPages),   disabled: uiPage === totalUiPages, title: 'Trang cuối' },
                        ].map(btn => (
                            <button key={btn.icon} onClick={btn.action} disabled={btn.disabled} title={btn.title} style={{
                                width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0',
                                background: btn.disabled ? '#F8FAFC' : '#fff',
                                color: btn.disabled ? '#CBD5E1' : '#475569',
                                cursor: btn.disabled ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
                            }}>
                                <i className={`fa-solid ${btn.icon}`}></i>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Create / Edit Modal */}
            {isQuickCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-end">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsQuickCreateOpen(false)}></div>
                    <div className="bg-white w-full max-w-6xl h-screen shadow-2xl relative flex flex-col animate-slide-left">
                        {/* Header */}
                        <div className="p-6 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-20">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold">
                                    {(quickCreateForm.fullName || 'U')[0]}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">
                                        {isEditing ? 'Chỉnh sửa thông tin ứng viên' : 'Thêm ứng viên mới'} 
                                        {isEditing && <span className="ml-2 text-sm font-medium text-gray-500">#{editingIds.candidateId}</span>}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        {quickCreateForm.fullName || 'Chưa có tên'} {quickCreateForm.email && `· ${quickCreateForm.email}`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {isEditing && (
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Trạng thái:</label>
                                        <select value={quickCreateForm.status} onChange={(e) => handleQuickCreateChange('status', e.target.value)} className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-600 outline-none text-sm font-bold text-brand-700">
                                            {pipelineStages.map(s => <option key={s.id} value={s.code}>{s.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                <button onClick={() => setIsQuickCreateOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all">
                                    <i className="fa-solid fa-xmark text-xl"></i>
                                </button>
                            </div>
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
                                            <div className="col-span-2 md:col-span-1 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Họ và tên *</label>
                                                <input type="text" value={quickCreateForm.fullName} onChange={(e) => handleQuickCreateChange('fullName', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm" placeholder="Nhập họ và tên" />
                                            </div>
                                            <div className="col-span-2 md:col-span-1 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Email *</label>
                                                <input type="email" value={quickCreateForm.email} onChange={(e) => handleQuickCreateChange('email', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm" placeholder="example@gmail.com" />
                                            </div>
                                            <div className="col-span-2 md:col-span-1 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Số điện thoại *</label>
                                                <input type="text" value={quickCreateForm.phone} onChange={(e) => handleQuickCreateChange('phone', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm" placeholder="09xxxxxxx" />
                                            </div>
                                            <div className="col-span-2 md:col-span-1 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Trường học</label>
                                                <select value={quickCreateForm.universitySchool} onChange={(e) => handleQuickCreateChange('universitySchool', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm appearance-none cursor-pointer">
                                                    <option value="">Chọn trường</option>
                                                    {filterOptions.schools.map(s => <option key={s} value={s}>{s}</option>)}
                                                    {quickCreateForm.universitySchool && !filterOptions.schools.includes(quickCreateForm.universitySchool) && (
                                                        <option value={quickCreateForm.universitySchool}>{quickCreateForm.universitySchool}</option>
                                                    )}
                                                </select>
                                            </div>
                                            <div className="col-span-2 md:col-span-1 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">GPA</label>
                                                <input type="text" value={quickCreateForm.gpa} onChange={(e) => handleQuickCreateChange('gpa', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm" placeholder="Ví dụ: 3.5" />
                                            </div>
                                            <div className="col-span-2 md:col-span-1 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Giới tính</label>
                                                <select value={quickCreateForm.gender} onChange={(e) => handleQuickCreateChange('gender', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm appearance-none cursor-pointer">
                                                    {filterOptions.genders.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-2 md:col-span-1 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Năm sinh</label>
                                                <input type="text" value={quickCreateForm.birthday} onChange={(e) => handleQuickCreateChange('birthday', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm" placeholder="Ví dụ: 2000" />
                                            </div>
                                        </div>
                                    </section>

                                    {/* 2. Thông tin ứng tuyển */}
                                    <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                        <h3 className="text-sm font-bold text-blue-600 mb-6 flex items-center gap-2">
                                            <i className="fa-solid fa-briefcase"></i>
                                            Thông tin ứng tuyển
                                        </h3>
                                        <div className="grid grid-cols-2 gap-5">
                                            <div className="col-span-2 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Vị trí ứng tuyển *</label>
                                                <select 
                                                    value={quickCreateForm.position} 
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const order = positions.find(p => String(p.id) === String(val));
                                                        if (order) {
                                                            setQuickCreateForm(prev => ({
                                                                ...prev,
                                                                position: String(order.id),
                                                                department: order.team || ''
                                                            }));
                                                        } else {
                                                            handleQuickCreateChange('position', val);
                                                        }
                                                    }} 
                                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm"
                                                >
                                                    <option value="">Chọn vị trí (từ Order)</option>
                                                    {positions.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.position} {p.team && `- ${p.team}`}
                                                        </option>
                                                    ))}
                                                    {quickCreateForm.position && !positions.find(p => String(p.id) === String(quickCreateForm.position)) && (
                                                        <option value={quickCreateForm.position}>
                                                            {quickCreateForm.position}
                                                        </option>
                                                    )}
                                                </select>
                                                {quickCreateForm.position && !positions.find(p => String(p.id) === String(quickCreateForm.position)) && (
                                                    <p className="text-[10px] text-red-500 italic mt-1">
                                                        * Dữ liệu cũ chưa gắn với order, vui lòng chọn lại vị trí
                                                    </p>
                                                )}
                                            </div>
                                            <div className="col-span-1 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Level</label>
                                                <select value={quickCreateForm.level} onChange={(e) => handleQuickCreateChange('level', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm">
                                                    <option value="">Chọn level</option>
                                                    {filterOptions.levels.map(l => <option key={l} value={l}>{l}</option>)}
                                                    {quickCreateForm.level && !filterOptions.levels.includes(quickCreateForm.level) && (
                                                        <option value={quickCreateForm.level}>{quickCreateForm.level}</option>
                                                    )}
                                                </select>
                                            </div>
                                            <div className="col-span-1 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Phòng ban</label>
                                                <div className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 text-sm truncate flex flex-col justify-center min-h-[42px]">
                                                    {quickCreateForm.department ? (
                                                        <>
                                                            <div className="font-medium text-gray-700">{quickCreateForm.department}</div>
                                                        </>
                                                    ) : '—'}
                                                </div>
                                            </div>
                                            <div className="col-span-1 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Nguồn</label>
                                                <select value={quickCreateForm.source} onChange={(e) => handleQuickCreateChange('source', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm">
                                                    <option value="">Chọn nguồn</option>
                                                    {filterOptions.sources.map(s => <option key={s} value={s}>{s}</option>)}
                                                    {quickCreateForm.source && !filterOptions.sources.includes(quickCreateForm.source) && (
                                                        <option value={quickCreateForm.source}>{quickCreateForm.source}</option>
                                                    )}
                                                </select>
                                            </div>
                                            {!isEditing && (
                                                <div className="col-span-1 space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Trạng thái *</label>
                                                    <select value={quickCreateForm.status} onChange={(e) => handleQuickCreateChange('status', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm">
                                                        {pipelineStages.map(s => <option key={s.id} value={s.code}>{s.name}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    {/* 3. Kết quả đánh giá */}
                                    <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                        <h3 className="text-sm font-bold text-blue-600 mb-6 flex items-center gap-2">
                                            <i className="fa-solid fa-star"></i>
                                            Kết quả đánh giá
                                        </h3>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="col-span-3 space-y-1 mb-2">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Trạng thái test online</label>
                                                <select value={quickCreateForm.testOnlineStatus || ''} onChange={(e) => handleQuickCreateChange('testOnlineStatus', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm">
                                                    <option value="">-- Chưa có --</option>
                                                    <option value="sent">Đã gửi test</option>
                                                    <option value="passed">Qua test</option>
                                                    <option value="not_attempt">Không làm test</option>
                                                    <option value="failed">Không qua test</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">IQ Test</label>
                                                <input type="text" value={quickCreateForm.iqTest} onChange={(e) => handleQuickCreateChange('iqTest', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm" placeholder="X/Y" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Technical</label>
                                                <input type="text" value={quickCreateForm.techTest} onChange={(e) => handleQuickCreateChange('techTest', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm" placeholder="X/Y" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Thinking</label>
                                                <input type="text" value={quickCreateForm.thinkingTest} onChange={(e) => handleQuickCreateChange('thinkingTest', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm" placeholder="X/Y" />
                                            </div>
                                        </div>
                                    </section>

                                    {/* 4. Ghi chú */}
                                    <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                        <h3 className="text-sm font-bold text-blue-600 mb-6 flex items-center gap-2">
                                            <i className="fa-solid fa-note-sticky"></i>
                                            Ghi chú
                                        </h3>
                                        <div className="space-y-1">
                                            <textarea value={quickCreateForm.note} onChange={(e) => handleQuickCreateChange('note', e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm min-h-[100px]" placeholder="Nhập ghi chú HR..."></textarea>
                                        </div>
                                    </section>

                                    {/* 5. Đánh giá bộ phận */}
                                    {isEditing && (
                                        <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                            <h3 className="text-sm font-bold text-blue-600 mb-6 flex items-center gap-2">
                                                <i className="fa-solid fa-users-viewfinder"></i>
                                                Đánh giá bộ phận
                                            </h3>
                                            {!quickCreateForm.managerReview ? (
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
                                                                        {quickCreateForm.managerReview.reviewerName || `Manager #${quickCreateForm.managerReview.reviewerId}`}
                                                                        <span className="text-xs text-gray-500 font-normal ml-2">
                                                                            (Bộ phận chọn hồ sơ)
                                                                        </span>
                                                                    </h4>
                                                                    <div className="text-[11px] text-gray-500 font-medium flex items-center gap-2 mt-1">
                                                                        <span className="flex items-center gap-1">
                                                                            <i className="fa-regular fa-clock"></i> 
                                                                            {quickCreateForm.managerReview.reviewedAt ? new Date(quickCreateForm.managerReview.reviewedAt).toLocaleDateString('vi-VN') : '—'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border ${
                                                                    quickCreateForm.managerReview.status === 'APPROVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                    quickCreateForm.managerReview.status === 'REJECT' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                    'bg-amber-50 text-amber-600 border-amber-100'
                                                                }`}>
                                                                    {quickCreateForm.managerReview.status === 'APPROVE' ? 'Đã duyệt' :
                                                                     quickCreateForm.managerReview.status === 'REJECT' ? 'Đã loại' :
                                                                     'Chờ đánh giá'}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-gray-600 mt-3 p-2.5 bg-white rounded-lg border border-gray-100">
                                                                <span className="font-semibold text-gray-700">Ghi chú: </span>
                                                                {quickCreateForm.managerReview.note || 'Không có ghi chú'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </section>
                                    )}

                                    {/* 6. Lịch sử tuyển dụng */}
                                    {isEditing && (
                                        <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                            <h3 className="text-sm font-bold text-blue-600 mb-6 flex items-center gap-2">
                                                <i className="fa-solid fa-clock-rotate-left"></i>
                                                Lịch sử tuyển dụng
                                            </h3>
                                            {(!quickCreateForm.pipelineHistory || quickCreateForm.pipelineHistory.length === 0) ? (
                                                <div className="p-6 bg-slate-50 border border-gray-100 rounded-xl text-center">
                                                    <p className="text-sm text-gray-400 font-medium italic">Chưa có lịch sử tuyển dụng</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {quickCreateForm.pipelineHistory.map((history, idx) => (
                                                        <div key={idx} className="flex gap-4">
                                                            <div className="flex flex-col items-center">
                                                                <div className="w-3 h-3 rounded-full bg-blue-500 mt-1.5 shadow-[0_0_0_4px_rgba(37,99,235,0.1)]"></div>
                                                                {idx < quickCreateForm.pipelineHistory.length - 1 && (
                                                                    <div className="w-px h-full bg-gray-200 mt-2"></div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 bg-slate-50 border border-gray-100 rounded-xl p-4 shadow-sm pb-4">
                                                                <div className="flex items-start justify-between gap-4 mb-2">
                                                                    <div>
                                                                        <h4 className="text-sm font-bold text-gray-800">
                                                                            {PIPELINE_LABELS[history.recruitmentPipelineCode] || history.recruitmentPipelineCode}
                                                                        </h4>
                                                                        <div className="text-[11px] text-gray-500 font-medium flex items-center gap-2 mt-1">
                                                                            <span className="flex items-center gap-1"><i className="fa-regular fa-clock"></i> {formatDateTime(history.startTime)}</span>
                                                                            <span>-</span>
                                                                            <span>{history.endTime ? formatDateTime(history.endTime) : 'Đang xử lý'}</span>
                                                                        </div>
                                                                    </div>
                                                                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border ${
                                                                        history.result === 'pass' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                        history.result === 'fail' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                        'bg-amber-50 text-amber-600 border-amber-100'
                                                                    }`}>
                                                                        {RESULT_LABELS[history.result] || history.result || 'Đang xử lý'}
                                                                    </span>
                                                                </div>
                                                                {history.note && (
                                                                    <div className="text-xs text-gray-600 mt-3 p-2.5 bg-white rounded-lg border border-gray-100">
                                                                        <span className="font-semibold text-gray-700">Ghi chú: </span>
                                                                        {history.note}
                                                                    </div>
                                                                )}
                                                                {(history.creator || history.createdBy) && (
                                                                    <div className="text-[10px] text-gray-400 mt-3 flex items-center gap-1.5 font-medium">
                                                                        <i className="fa-solid fa-user-pen"></i> Người cập nhật: {history.creator?.fullName || history.creator?.name || history.createdBy}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </section>
                                    )}

                                </div>

                                {/* Cột phải */}
                                <div className="col-span-12 lg:col-span-5 space-y-6">
                                    <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col h-full min-h-[750px] sticky top-8">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold text-orange-500 flex items-center gap-2">
                                                <i className="fa-solid fa-file-pdf"></i>
                                                Preview CV
                                            </h3>
                                            {quickCreateForm.filePath && (
                                                <a href={quickCreateForm.filePath} target="_blank" rel="noreferrer" className="px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors flex items-center gap-1">
                                                    Mở tab mới <i className="fa-solid fa-arrow-up-right-from-square"></i>
                                                </a>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-4 mb-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Link CV *</label>
                                                <div className="relative">
                                                    <input type="text" value={quickCreateForm.filePath} onChange={(e) => handleQuickCreateChange('filePath', e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm pr-10" placeholder="https://drive.google.com/..." />
                                                    <i className="fa-solid fa-link absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Link Sản phẩm</label>
                                                <div className="relative">
                                                    <input type="text" value={quickCreateForm.productLinks} onChange={(e) => handleQuickCreateChange('productLinks', e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm pr-10" placeholder="Link Sản phẩm..." />
                                                    <i className="fa-solid fa-globe absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 bg-slate-50 rounded-xl border border-gray-200 relative overflow-hidden mt-2">
                                            {getDrivePreviewUrl(quickCreateForm.filePath) ? (
                                                <iframe 
                                                    src={getDrivePreviewUrl(quickCreateForm.filePath)} 
                                                    className="absolute inset-0 w-full h-full border-none" 
                                                    title="CV Preview"
                                                ></iframe>
                                            ) : (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                                                    <i className="fa-solid fa-cloud-arrow-up text-3xl text-gray-300 mb-4"></i>
                                                    <p className="text-sm text-gray-400 font-medium">Dán link Drive để xem CV</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>

                        <div className="absolute bottom-0 inset-x-0 p-5 bg-white border-t border-gray-100 flex items-center justify-end gap-3 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <button onClick={() => setIsQuickCreateOpen(false)} className="px-8 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all">Hủy</button>
                            <button onClick={submitQuickCreate} className="px-10 py-2.5 text-sm font-bold bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition-all flex items-center gap-2">
                                <i className="fa-solid fa-floppy-disk"></i> {isEditing ? 'Cập nhật' : 'Thêm mới'}
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
                                                } else if (f.key === 'candidateId') {
                                                    newFilters.candidateId = null;
                                                    setSearchParams({});
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
                                    <Select mode="multiple" maxTagCount={2} className="w-full h-11" placeholder="Tất cả" value={filters.positions} onChange={v => setFilters(prev => ({ ...prev, positions: v }))} options={positionFilterOptions} />
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

