import { UploadOutlined } from '@ant-design/icons';
import { Button, ConfigProvider, DatePicker, Input, message, Modal, Select, Tooltip, Upload } from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:3000/api/recruitment';
const MGR_API_BASE = 'http://localhost:3000/api/recruitment-manager';

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

const getDrivePreviewUrl = (url) => {
    if (!url) return null;
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    return null;
};

// --- HELPERS ---
const normalizeText = (value) => String(value ?? '').trim().toLowerCase();
const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== '';
const toIdString = (value) => (hasValue(value) ? String(value).trim() : null);

export function getCandidateApplicationId(candidate) {
  return toIdString(
    candidate?.applicationId ??
    candidate?.application_id ??
    candidate?.appId ??
    candidate?.app_id ??
    candidate?.recruitmentApplicationId ??
    candidate?.recruitment_application_id ??
    candidate?.application?.id ??
    candidate?.application?.applicationId ??
    candidate?.candidateApplication?.id ??
    candidate?.candidate_application?.id ??
    candidate?.pipeline?.applicationId ??
    candidate?.pipeline?.application_id ??
    candidate?.pipelineHistory?.[0]?.applicationId ??
    candidate?.pipelineHistory?.[0]?.application_id ??
    candidate?.id ??
    null
  );
}

function normalizeStageCode(value) {
  const raw = normalizeText(value);
  if (!raw) return '';
  const aliases = {
    received: 'received_cv',
    receive_cv: 'received_cv',
    received_cv: 'received_cv',
    hr_scan: 'hr_scan',
    scan: 'hr_scan',
    iq_test: 'iq_test',
    test_iq: 'iq_test',
    online_test: 'iq_test',
    test_online: 'iq_test',
    technical_test: 'technical_test',
    offline_test: 'technical_test',
    test_offline: 'technical_test',
    department_review: 'department_review',
    interview_round_1: 'interview_round_1',
    interview_round_2: 'interview_round_2',
    offer: 'offer',
    onboarding: 'onboarding',
    hired: 'onboarding',
    rejected: 'fail',
    reject: 'fail',
    fail: 'fail',
  };
  return aliases[raw] || raw;
}

export function getCandidateCurrentStatus(candidate) {
  return normalizeStageCode(
    candidate?.status ??
    candidate?.applicationStatus ??
    candidate?.application_status ??
    candidate?.currentStatus ??
    candidate?.current_status ??
    candidate?.application?.status ??
    candidate?.application?.currentStatus ??
    candidate?.application?.current_status ??
    candidate?.pipelineInfo?.currentStatus ??
    candidate?.pipelineInfo?.current_status ??
    candidate?.pipeline?.currentStatus ??
    candidate?.pipeline?.current_status ??
    candidate?._sourceStageCode ??
    candidate?.pipelineInfo?.code ??
    candidate?.pipelineCode ??
    candidate?.recruitmentPipelineCode ??
    candidate?.recruitment_pipeline_code ??
    ''
  );
}

function getCandidateId(candidate) {
  return toIdString(
    candidate?.candidateId ??
    candidate?.candidate_id ??
    candidate?.candidate?.id ??
    candidate?.candidateInfo?.id ??
    candidate?.candidate_info?.id ??
    null
  ) || getCandidateApplicationId(candidate) || '';
}

function getCandidateRenderKey(candidate, index, stageCode) {
  const applicationId = getCandidateApplicationId(candidate);
  const candidateId = getCandidateId(candidate);

  if (applicationId) return `app-${applicationId}`;
  if (candidateId) return `candidate-${candidateId}-${stageCode || 'unknown'}`;
  return `fallback-${stageCode || 'unknown'}-${index}`;
}

export function getCandidatePositionText(candidate) {
  const rawPosition = candidate?.position;
  const positionText =
    candidate?.orderInfo?.position ??
    candidate?.recruitmentOrder?.position ??
    candidate?.order?.position ??
    candidate?.order_position ??
    candidate?.orderPosition ??
    candidate?.position_name ??
    candidate?.positionName ??
    candidate?.job_position ??
    candidate?.jobPosition ??
    candidate?.jobTitle ??
    candidate?.job_title ??
    null;

  if (hasValue(positionText)) return String(positionText).trim();

  if (rawPosition !== null && rawPosition !== undefined) {
    const raw = String(rawPosition).trim();
    if (/^\d+$/.test(raw)) return `Vị trí #${raw}`;
    return raw;
  }

  return '';
}

const getPositionLabel = getCandidatePositionText;

function getCandidatePositionRawIds(candidate) {
  return [
    candidate?.position,
    candidate?.positionId,
    candidate?.position_id,
    candidate?.recruitmentOrderId,
    candidate?.recruitment_order_id,
    candidate?.orderId,
    candidate?.order_id,
    candidate?.orderInfo?.id,
    candidate?.recruitmentOrder?.id,
    candidate?.order?.id,
  ].filter(hasValue).map(value => String(value).trim());
}

function getPositionOptionId(position) {
  return toIdString(
    position?.id ??
    position?.orderId ??
    position?.order_id ??
    position?.recruitmentOrderId ??
    position?.recruitment_order_id ??
    null
  );
}

function getPositionOptionLabel(position) {
  return String(
    position?.position ??
    position?.name ??
    position?.title ??
    position?.label ??
    position?.jobPosition ??
    position?.job_position ??
    ''
  ).trim();
}

function getPositionOptionValue(position, index) {
  const id = getPositionOptionId(position);
  const label = getPositionOptionLabel(position);
  if (id) return `order:${id}`;
  if (label) return `text:${label}`;
  return `unknown:${index}`;
}

function parsePositionFilter(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return { id: '', text: '' };
  if (raw.startsWith('order:')) return { id: raw.slice(6), text: '' };
  if (raw.startsWith('text:')) return { id: '', text: raw.slice(5) };
  return /^\d+$/.test(raw) ? { id: raw, text: '' } : { id: '', text: raw };
}

function candidateMatchesPosition(candidate, selectedValue, positionsList = []) {
  const filter = parsePositionFilter(selectedValue);
  if (!filter.id && !filter.text) return true;

  const rawIds = getCandidatePositionRawIds(candidate);
  const candidatePositionText = normalizeText(getCandidatePositionText(candidate));

  if (filter.id) {
    if (rawIds.includes(String(filter.id))) return true;

    const selectedOption = positionsList.find((item, index) => getPositionOptionValue(item, index) === selectedValue || getPositionOptionId(item) === filter.id);
    const selectedLabel = selectedOption ? normalizeText(getPositionOptionLabel(selectedOption)) : '';
    if (selectedLabel && candidatePositionText && (candidatePositionText === selectedLabel || candidatePositionText.includes(selectedLabel))) return true;
    return false;
  }

  const selectedText = normalizeText(filter.text);
  if (!selectedText) return true;
  return candidatePositionText === selectedText || candidatePositionText.includes(selectedText);
}

const getDepartmentLabel = (candidate) => {
    if (!candidate) return '—';
    const order = candidate.orderInfo || candidate.recruitmentOrder || candidate.order;
    if (order && (order.team || order.department)) return order.team || order.department;
    return candidate.department || candidate.order_team || candidate.orderTeam || candidate.team || '—';
};

const getStageCode = (stage) => stage?.code || stage?.status || stage?.recruitmentPipelineCode || stage?.recruitment_pipeline_code || '';
const getStageName = (stage) => stage?.name || stage?.statusName || stage?.title || stage?.label || stage?.code || '';

const detectStageType = (stage) => {
    if (!stage) return 'generic';
    const code = normalizeText(getStageCode(stage));
    const name = normalizeText(getStageName(stage));
    
    if (code === 'hr_scan' || name.includes('hr scan')) return 'scan';
    if (code === 'received_cv' || name.includes('tiếp nhận')) return 'generic';
    if (code === 'department_review' || name.includes('bộ phận chọn')) return 'department_review';
    if (['iq_test', 'test_iq', 'online_test'].includes(code) || name.includes('test iq')) return 'test_online';
    if (['offline_test', 'technical_test'].includes(code) || name.includes('chuyên môn')) return 'technical_test';
    if (code.includes('interview') || name.includes('phỏng vấn')) return 'interview';
    if (code === 'offer') return 'offer';
    if (['hired', 'onboarding'].includes(code) || name.includes('nhận việc')) return 'hired';
    if (['rejected', 'reject', 'fail'].includes(code) || name.includes('loại')) return 'rejected';
    
    return 'generic';
};

const getStatusTheme = (statusOrCode) => {
    const type = detectStageType({ code: statusOrCode });
    // Match the specific colors from the user's image exactly
    const themes = {
        'generic': { headerBg: '#E2EBFB', text: '#2F54EB', border: '#D6E4FF', columnBg: '#E2EBFB', badgeBg: '#D6E4FF' }, // Tiếp nhận hồ sơ
        'scan': { headerBg: '#E6FBFA', text: '#13C2C2', border: '#B5F5EC', columnBg: '#E6FBFA', badgeBg: '#B5F5EC' }, // HR Scan
        'test_online': { headerBg: '#F4E8FF', text: '#722ED1', border: '#E8CCFF', columnBg: '#F4E8FF', badgeBg: '#E8CCFF' }, // Test IQ Online
        'department_review': { headerBg: '#FFEBD6', text: '#FA8C16', border: '#FFD8BF', columnBg: '#FFEBD6', badgeBg: '#FFD8BF' }, // Bộ phận chọn hồ sơ
        'technical_test': { headerBg: '#FFF1B8', text: '#FAAD14', border: '#FFE58F', columnBg: '#FFF1B8', badgeBg: '#FFE58F' }, // Test offline/Chuyên môn
        'interview': { headerBg: '#D9F7E8', text: '#00A870', border: '#B7EBD0', columnBg: '#D9F7E8', badgeBg: '#B7EBD0' }, // Phỏng vấn
        'offer': { headerBg: '#FCE7F3', text: '#BE185D', border: '#FBCFE8', columnBg: '#FCE7F3', badgeBg: '#FBCFE8' }, // Offer
        'hired': { headerBg: '#DCFCE7', text: '#166534', border: '#BBF7D0', columnBg: '#DCFCE7', badgeBg: '#BBF7D0' }, // Nhận việc
        'rejected': { headerBg: '#FEE2E2', text: '#E11D48', border: '#FECACA', columnBg: '#FEE2E2', badgeBg: '#FECACA' }, // Loại
    };
    return themes[type] || themes['generic'];
};

const getQuickNotes = (stageType) => {
    const notes = {
        'department_review': ['Đánh giá tích cực', 'Chuyển vòng test', 'Chưa phù hợp'],
        'test_online': ['Đã gửi Test IQ', 'Chưa hoàn thành', 'Kết quả tốt', 'Không đạt'],
        'technical_test': ['Đã gửi lịch', 'Kết quả tốt, chuyển PV', 'Không đạt'],
        'interview': ['Đã gửi lịch PV', 'Tiềm năng', 'Không đến PV'],
        'hired': ['Xác nhận đúng hẹn', 'Hoàn thành thủ tục', 'Hoãn nhận việc'],
        'rejected': ['Không phù hợp', 'Không phản hồi', 'Lưu đợt sau']
    };
    return notes[stageType] || ['Tiềm năng tốt', 'Chưa nghe máy'];
};

const normalizeCandidateGroups = (responseData) => {
    const raw = responseData?.data?.candidates ?? responseData?.data ?? responseData?.candidates ?? responseData;
    const flatList = [];

    const pushCandidate = (candidate, sourceStageCode = '') => {
        if (!candidate || typeof candidate !== 'object') return;
        const normalizedSource = normalizeStageCode(sourceStageCode);
        const normalized = {
            ...candidate,
            _sourceStageCode: normalizedSource,
        };
        normalized._resolvedStatus = getCandidateCurrentStatus(normalized) || normalizedSource;
        flatList.push(normalized);
    };

    if (Array.isArray(raw)) {
        const isFlatCandidates = raw.length > 0 && !Array.isArray(raw[0]?.candidates) && (raw[0]?.fullName || raw[0]?.email || raw[0]?.phone || raw[0]?.candidateId || raw[0]?.applicationId);
        if (isFlatCandidates) {
            raw.forEach(candidate => pushCandidate(candidate, candidate?.status || candidate?.pipelineCode || candidate?.recruitmentPipelineCode || candidate?._sourceStageCode));
        } else {
            raw.forEach((group) => {
                const status = group?.status || group?.code || group?.recruitmentPipelineCode || group?.recruitment_pipeline_code || group?.name;
                const candidates = Array.isArray(group?.candidates) ? group.candidates : [];
                candidates.forEach(candidate => pushCandidate(candidate, status));
            });
        }
    } else if (raw && typeof raw === 'object') {
        Object.entries(raw).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach(candidate => pushCandidate(candidate, key));
            } else if (value && Array.isArray(value.candidates)) {
                value.candidates.forEach(candidate => pushCandidate(candidate, value.status || value.code || key));
            }
        });
    }

    const getCandidateTs = (candidate) => {
        const value = candidate?.updatedAt ?? candidate?.updated_at ?? candidate?.statusUpdatedAt ?? candidate?.status_updated_at ?? candidate?.appliedDate ?? candidate?.applied_date ?? candidate?.createdAt ?? candidate?.created_at;
        const ts = value ? new Date(value).getTime() : 0;
        return Number.isFinite(ts) ? ts : 0;
    };

    const getExplicitStatus = (candidate) => normalizeStageCode(
        candidate?.status ??
        candidate?.applicationStatus ??
        candidate?.application_status ??
        candidate?.currentStatus ??
        candidate?.current_status ??
        candidate?.application?.status ??
        candidate?.application?.currentStatus ??
        candidate?.application?.current_status ??
        ''
    );

    const hasExplicitStatus = (candidate) => Boolean(getExplicitStatus(candidate));

    const getResolvedStatus = (candidate) => (
        getExplicitStatus(candidate) ||
        normalizeStageCode(candidate?._resolvedStatus) ||
        normalizeStageCode(candidate?._sourceStageCode) ||
        getCandidateCurrentStatus(candidate) ||
        'received_cv'
    );

    const statusOrder = (stageCode) => {
        const order = {
            received_cv: 1,
            hr_scan: 2,
            iq_test: 3,
            department_review: 4,
            technical_test: 5,
            interview_round_1: 6,
            interview_round_2: 7,
            offer: 8,
            onboarding: 9,
            fail: 10,
        };
        return order[normalizeStageCode(stageCode)] || 0;
    };

    const getDisplayDedupeKey = (candidate) => {
        const email = normalizeText(candidate?.email ?? candidate?.candidate?.email ?? candidate?.candidateInfo?.email);
        if (email) return `email:${email}`;

        const phone = normalizeText(candidate?.phone ?? candidate?.candidate?.phone ?? candidate?.candidateInfo?.phone).replace(/\D/g, '');
        if (phone) return `phone:${phone}`;

        const candidateId = toIdString(
            candidate?.candidateId ??
            candidate?.candidate_id ??
            candidate?.candidate?.id ??
            candidate?.candidateInfo?.id ??
            candidate?.candidate_info?.id ??
            null
        );
        if (candidateId) return `candidate:${candidateId}`;

        const applicationId = toIdString(
            candidate?.applicationId ??
            candidate?.application_id ??
            candidate?.appId ??
            candidate?.app_id ??
            candidate?.recruitmentApplicationId ??
            candidate?.recruitment_application_id ??
            candidate?.application?.id ??
            candidate?.application?.applicationId ??
            candidate?.candidateApplication?.id ??
            candidate?.candidate_application?.id ??
            candidate?.pipeline?.applicationId ??
            candidate?.pipeline?.application_id ??
            candidate?.cvs?.[0]?.applicationId ??
            candidate?.cvs?.[0]?.application_id ??
            candidate?.pipelineHistory?.[0]?.applicationId ??
            candidate?.pipelineHistory?.[0]?.application_id ??
            null
        );
        if (applicationId) return `app:${applicationId}`;

        const name = normalizeText(candidate?.fullName ?? candidate?.full_name ?? candidate?.name);
        return name ? `name:${name}` : '';
    };

    const shouldReplaceCandidate = (current, incoming) => {
        const currentExplicit = hasExplicitStatus(current);
        const incomingExplicit = hasExplicitStatus(incoming);
        if (incomingExplicit !== currentExplicit) return incomingExplicit;

        const currentTs = getCandidateTs(current);
        const incomingTs = getCandidateTs(incoming);
        if (incomingTs !== currentTs) return incomingTs > currentTs;

        return statusOrder(getResolvedStatus(incoming)) > statusOrder(getResolvedStatus(current));
    };

    const dedupeMap = new Map();

    flatList.forEach((candidate, index) => {
        const normalizedCandidate = { ...candidate, _resolvedStatus: getResolvedStatus(candidate) };
        const dedupeKey = getDisplayDedupeKey(normalizedCandidate) || `fallback:${index}`;
        const existing = dedupeMap.get(dedupeKey);
        if (!existing || shouldReplaceCandidate(existing, normalizedCandidate)) {
            dedupeMap.set(dedupeKey, normalizedCandidate);
        }
    });

    const map = {};
    dedupeMap.forEach(candidate => {
        const status = getResolvedStatus(candidate);
        if (!map[status]) map[status] = [];
        map[status].push(candidate);
    });

    Object.keys(map).forEach(status => {
        map[status].sort((a, b) => getCandidateTs(b) - getCandidateTs(a));
    });

    return map;
};

const RecruitmentPipeline = () => {
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [stages, setStages] = useState([]);
    const [candidatesMap, setCandidatesMap] = useState({});
    const [positions, setPositions] = useState([]);
    const [managerReviewMapByApplicationId, setManagerReviewMapByApplicationId] = useState({});
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPosition, setSelectedPosition] = useState('');
    const [dateRange, setDateRange] = useState(null);

    const [transModal, setTransModal] = useState({ open: false, candidate: null, sourceStage: null, targetStage: null });
    const [currentStep, setCurrentStep] = useState(0);

    const [quickReviewModal, setQuickReviewModal] = useState({ open: false, candidateData: null, loading: false, detailError: false });
    const [quickReviewForm, setQuickReviewForm] = useState({
        fullName: '', email: '', phone: '', universitySchool: '', gender: 'male', birthday: '',
        appliedDate: new Date().toISOString(), position: '', level: '', department: '', source: '',
        status: 'received_cv', filePath: '', productLinks: '', note: '', gpa: '', iqTest: '',
        techTest: '', thinkingTest: '', testOnlineStatus: '', pipelineHistory: [], managerReview: null
    });
    const [editingIds, setEditingIds] = useState({ candidateId: null, applicationId: null });

    const handleQuickReviewChange = (name, value) => setQuickReviewForm(prev => ({ ...prev, [name]: value }));

    const submitQuickReview = async () => {
        const normalizeOptional = (value) => {
            if (value === "" || value === null || value === undefined) return undefined;
            return value;
        };

        if (!quickReviewForm.email || quickReviewForm.email.trim() === '') {
            message.error('Vui lòng nhập email hợp lệ');
            return;
        }

        const token = localStorage.getItem('access_token');
        try {
            const candRes = await fetch(`${API_BASE}/candidate/${editingIds.candidateId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: quickReviewForm.fullName, email: quickReviewForm.email,
                    phone: quickReviewForm.phone, universitySchool: quickReviewForm.universitySchool,
                    gender: quickReviewForm.gender, birthday: quickReviewForm.birthday
                })
            });

            const appRes = await fetch(`${API_BASE}/application/${editingIds.applicationId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appliedDate: quickReviewForm.appliedDate, position: quickReviewForm.position,
                    level: quickReviewForm.level, department: quickReviewForm.department,
                    source: quickReviewForm.source, filePath: quickReviewForm.filePath,
                    productLinks: quickReviewForm.productLinks, note: quickReviewForm.note,
                    gpa: quickReviewForm.gpa, iqTest: quickReviewForm.iqTest,
                    techTest: quickReviewForm.techTest, thinkingTest: quickReviewForm.thinkingTest,
                    testOnlineStatus: normalizeOptional(quickReviewForm.testOnlineStatus)
                })
            });

            if (candRes.ok && appRes.ok) {
                message.success('Cập nhật thành công!');
                setQuickReviewModal({ open: false, candidateData: null, loading: false, detailError: false });
                fetchAllData();
            } else {
                message.error('Lỗi khi cập nhật thông tin');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
        }
    };

    const filterOptions = {
        levels: ["CTV", "Intern", "Fresher", "Junior", "Middle", "Senior", "NextGen", "Leader", "Manager", "Freelancer"],
        departments: ["HR", "KT", "Atomic", "Marketing", "Data", "Hypercat", "Unicorn", "Galaxy", "Lab"],
        sources: ["Vietnamwork", "TOPCV - topmax", "Hunt", "Website", "Fanpage", "Nội bộ giới thiệu", "TOPCV - ứng tuyển", "TTS", "Ybox", "Linkedin", "NextGen Intern", "Đăng tuyển", "Ads", "Search TopCV", "Đăng ký qua trường", "HB"],
        genders: [{ value: "male", label: "Nam" }, { value: "female", label: "Nữ" }],
        schools: ["ĐH Bách Khoa", "ĐH Công nghệ", "ĐH Khoa học Tự nhiên", "ĐH Kinh tế Quốc dân", "ĐH Ngoại thương", "ĐH FPT", "Học viện Công nghệ Bưu chính Viễn thông", "ĐH Giao thông vận tải", "Khác"]
    };

    const [submitting, setSubmitting] = useState(false);
    
    // Form States
    const [note, setNote] = useState('');
    const [onboardingDate, setOnboardingDate] = useState('');
    const [sendEmail, setSendEmail] = useState(true);
    const [testType, setTestType] = useState('iq');
    const [testLink, setTestLink] = useState('https://docs.google.com/forms/d/1W7MjtEGNE7jvmTL6ov_EAAyduOc6eakk5SrARw3qnN0/edit?hl=vi');
    const [deadline, setDeadline] = useState('3 ngày từ khi nhận email');
    const [executeAt, setExecuteAt] = useState('');
    const [note1, setNote1] = useState('');
    const [note2, setNote2] = useState('');
    const [note3, setNote3] = useState('');
    const [address, setAddress] = useState('Tầng 12 tòa nhà Nam Cường Building, Phường Dương Nội, Hà Nội');
    const [testDate, setTestDate] = useState('');
    const [interviewDate, setInterviewDate] = useState('');
    const [contact, setContact] = useState('Bộ phận Tuyển dụng HR - SĐT: 0971706853');
    const [mapLink, setMapLink] = useState('https://maps.app.goo.gl/xyz123');
    const [cc, setCc] = useState('');
    const [offerDate, setOfferDate] = useState('');
    const [attachments, setAttachments] = useState([]);

    const [createCalendar, setCreateCalendar] = useState(true);
    const [calSummary, setCalSummary] = useState('');
    const [calStart, setCalStart] = useState('');
    const [calEnd, setCalEnd] = useState('');
    const [calAttendees, setCalAttendees] = useState('');
    const [calLocation, setCalLocation] = useState('Phòng họp A, Tầng 8');
    const [calDescription, setCalDescription] = useState('');

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem('access_token');
        const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };
        
        try {
            const stRes = await fetch(`${API_BASE}/pipeline-stages`, { headers });
            let stData = await stRes.json();
            setStages(Array.isArray(stData) ? stData : (Array.isArray(stData?.data) ? stData.data : []));

            const candRes = await fetch(`${API_BASE}/candidates/grouped-by-status`, { headers });
            let candData = await candRes.json();
            setCandidatesMap(normalizeCandidateGroups(candData));

            const posRes = await fetch(`${API_BASE}/statistics/positions`, { headers });
            let posData = await posRes.json();
            let posList = Array.isArray(posData) ? posData : (posData?.data ? posData.data : []);
            setPositions(posList);

            const mgrRes = await fetch(`${MGR_API_BASE}/candidate`, { headers });
            let mgrData = await mgrRes.json();
            const reviewGroups = mgrData?.data?.candidates || mgrData?.candidates || {};
            
            const rMap = {};
            Object.values(reviewGroups).flat().forEach(c => {
                const appId = getCandidateApplicationId(c);
                const reviews = Array.isArray(c?.reviewManager) ? c.reviewManager : [];
                if (appId && reviews.length > 0) {
                    rMap[appId] = reviews[0];
                }
            });
            setManagerReviewMapByApplicationId(rMap);
            
        } catch (error) {
            console.error(error);
            message.error("Lỗi khi tải dữ liệu Pipeline");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAllData(); }, [fetchAllData]);

    const openQuickReviewModal = async (e, candidate) => {
        e.stopPropagation();
        const candidateId = getCandidateId(candidate);
        const appId = getCandidateApplicationId(candidate);

        setQuickReviewModal({ open: true, candidateData: candidate, loading: true, detailError: false });
        if (!candidateId) {
            setQuickReviewModal(prev => ({ ...prev, loading: false }));
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_BASE}/candidate/${candidateId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const detailData = await res.json();
                
                const app = detailData.applications?.find(a => String(getCandidateApplicationId(a)) === String(appId)) 
                    || detailData.applications?.[0] 
                    || {};
                const cv = app.cvs?.[0] || {};
                
                const pipelineHistory = app.pipelineHistory || candidate.pipelineHistory || [];
                
                let review = managerReviewMapByApplicationId[appId] 
                    || app.managerReviews?.[0] 
                    || candidate.managerReviews?.[0] 
                    || null;

                if (!review && pipelineHistory.length > 0) {
                    const deptReviewHistory = pipelineHistory.find(h => 
                        h.recruitmentPipelineCode === 'department_review' || 
                        h.recruitmentPipelineCode === 'Bộ phận chọn hồ sơ'
                    );
                    if (deptReviewHistory && deptReviewHistory.note) {
                        review = {
                            reviewerName: deptReviewHistory.createdBy || 'Hệ thống',
                            status: deptReviewHistory.result === 'fail' ? 'REJECT' : (deptReviewHistory.result === 'pass' ? 'APPROVE' : 'PENDING'),
                            note: deptReviewHistory.note,
                            reviewedAt: deptReviewHistory.createdAt || deptReviewHistory.startTime || deptReviewHistory.endTime || new Date().toISOString()
                        };
                    }
                }

                const fullCandidateInfo = {
                    ...candidate,
                    fullName: detailData.fullName || candidate.fullName,
                    email: detailData.email || candidate.email,
                    phone: detailData.phone || candidate.phone,
                    gender: detailData.gender || candidate.gender,
                    birthday: detailData.birthday || candidate.birthday,
                    universitySchool: detailData.universitySchool || candidate.universitySchool,
                    gpa: app.gpa || candidate.gpa,
                    position: app.position || candidate.position,
                    level: app.level || candidate.level,
                    department: app.department || candidate.department,
                    source: app.source || candidate.source,
                    appliedDate: app.appliedDate || candidate.appliedDate,
                    productLinks: cv.productLinks || candidate.productLinks,
                    note: app.note || candidate.note,
                    filePath: cv.filePath || candidate.filePath,
                    pipelineHistory: app.pipelineHistory || candidate.pipelineHistory || [],
                    testOnlineStatus: app.testOnlineStatus || candidate.testOnlineStatus || candidate.test_online_status,
                    managerReview: review
                };

                setEditingIds({ candidateId: detailData.id, applicationId: getCandidateApplicationId(app) || app.id });
                setQuickReviewForm({
                    fullName: detailData.fullName || candidate.fullName || '',
                    email: detailData.email || candidate.email || '',
                    phone: detailData.phone || candidate.phone || '',
                    universitySchool: detailData.universitySchool || candidate.universitySchool || candidate.university_school || candidate.school || '',
                    gender: detailData.gender || candidate.gender || 'male',
                    birthday: detailData.birthday || candidate.birthday || '',
                    appliedDate: app.appliedDate || candidate.appliedDate || new Date().toISOString(),
                    position: app.position || candidate.position || '',
                    level: app.level || candidate.level || '',
                    department: app.department || candidate.department || '',
                    source: app.source || candidate.source || candidate.recruitmentSource || candidate.recruitment_source || '',
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
                    managerReview: review
                });

                setQuickReviewModal({ open: true, candidateData: fullCandidateInfo, loading: false, detailError: false });
            } else {
                setQuickReviewModal(prev => ({ ...prev, loading: false, detailError: true }));
            }
        } catch (err) {
            setQuickReviewModal(prev => ({ ...prev, loading: false, detailError: true }));
        }
    };

    const handleDragStart = (e, candidate, sourceStage) => {
        e.dataTransfer.setData('applicationId', getCandidateApplicationId(candidate));
        e.dataTransfer.setData('sourceStageCode', getStageCode(sourceStage));
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e, targetStage) => {
        e.preventDefault();
        const applicationId = e.dataTransfer.getData('applicationId');
        const sourceStageCode = e.dataTransfer.getData('sourceStageCode');
        const targetStageCode = getStageCode(targetStage);

        if (!applicationId || sourceStageCode === targetStageCode) return;

        let candidate = null;
        if (candidatesMap[sourceStageCode]) {
            candidate = candidatesMap[sourceStageCode].find(c => String(getCandidateApplicationId(c)) === String(applicationId));
        }
        if (!candidate) {
            for (let k in candidatesMap) {
                const found = candidatesMap[k].find(c => String(getCandidateApplicationId(c)) === String(applicationId));
                if (found) { candidate = found; break; }
            }
        }
        
        if (!candidate) return message.error("Không tìm thấy thông tin ứng viên.");

        resetFormStates(candidate, targetStage);
        const fullSourceStage = stages.find(s => getStageCode(s) === sourceStageCode) || { code: sourceStageCode };
        setTransModal({ open: true, candidate, sourceStage: fullSourceStage, targetStage });
    };

    const resetFormStates = (candidate, targetStage) => {
        setCurrentStep(0);
        setNote('');
        setOnboardingDate('');
        setSendEmail(true);
        setTestType('iq');
        setTestLink('https://docs.google.com/forms/d/1W7MjtEGNE7jvmTL6ov_EAAyduOc6eakk5SrARw3qnN0/edit?hl=vi');
        setDeadline('3 ngày từ khi nhận email');
        setExecuteAt('');
        setNote1('');
        setNote2('');
        setNote3('');
        setAddress('Tầng 12 tòa nhà Nam Cường Building, Phường Dương Nội, Hà Nội');
        setTestDate('');
        setInterviewDate('');
        setContact('Bộ phận Tuyển dụng HR - SĐT: 0971706853');
        setMapLink('https://maps.app.goo.gl/xyz123');
        setCc('');
        setOfferDate('');
        setAttachments([]);

        setCreateCalendar(true);
        
        const posLabel = getPositionLabel(candidate);
        const stageName = getStageName(targetStage);
        
        const cvLink = candidate?.filePath || candidate?.cvUrl || candidate?.cvLink || candidate?.resumeUrl || candidate?.cv?.filePath || candidate?.cv?.url || candidate?.cvs?.[0]?.filePath || candidate?.cvs?.[0]?.url || candidate?.application?.cvUrl || candidate?.application?.filePath || '';
        const descText = `Sự kiện phỏng vấn/thi tuyển ứng viên ${candidate?.fullName} cho vị trí ${posLabel}.${cvLink ? `\n\nLink CV/Portfolio:\n${cvLink}` : ''}`;

        setCalSummary(`[Tuyển dụng] ${stageName} - ${candidate?.fullName} - ${posLabel}`);
        setCalStart('');
        setCalEnd('');
        setCalAttendees('');
        setCalLocation(prev => prev ? prev : '');
        setCalDescription(descText);
    };

    const handleConfirmTransition = async () => {
        const { candidate, targetStage } = transModal;
        const targetType = detectStageType(targetStage);
        const applicationId = getCandidateApplicationId(candidate);
        const targetCode = getStageCode(targetStage);
        if (!applicationId) {
            return message.error('Không tìm thấy applicationId của ứng viên.');
        }
        const token = localStorage.getItem('access_token');
        
        if (targetType === 'hired' && !onboardingDate) {
            return message.error("Vui lòng chọn ngày nhận việc (onboardingDate)!");
        }

        if (createCalendar && (targetType === 'technical_test' || targetType === 'interview')) {
            if (!calStart || !calEnd) {
                return message.error("Vui lòng nhập thời gian bắt đầu và kết thúc Calendar!");
            }
        }

        setSubmitting(true);
        try {
            // Step 1: Send email
            if (sendEmail && ['test_online', 'technical_test', 'interview', 'offer'].includes(targetType)) {
                const formData = new FormData();
                formData.append('status', targetCode);

                if (targetType === 'test_online') {
                    formData.append('type', testType);
                    if (testLink) formData.append('testLink', testLink);
                    if (deadline) formData.append('deadline', deadline);
                    if (executeAt) formData.append('execute_at', dayjs(executeAt).toISOString());
                    if (note1) formData.append('note1', note1);
                } else if (targetType === 'technical_test') {
                    if (deadline) formData.append('deadline', deadline);
                    if (testDate) formData.append('testDate', dayjs(testDate).format('YYYY-MM-DD HH:mm:ss'));
                    if (address) formData.append('address', address);
                    if (contact) formData.append('contact', contact);
                    if (note1) formData.append('note1', note1);
                    if (note2) formData.append('note2', note2);
                } else if (targetType === 'interview') {
                    if (interviewDate) formData.append('interviewDate', dayjs(interviewDate).format('YYYY-MM-DD HH:mm:ss'));
                    if (address) formData.append('address', address);
                    if (contact) formData.append('contact', contact);
                    if (mapLink) formData.append('mapLink', mapLink);
                    if (note1) formData.append('note1', note1);
                    if (note2) formData.append('note2', note2);
                    if (note3) formData.append('note3', note3);
                    if (cc) formData.append('cc', cc);
                    if (executeAt) formData.append('execute_at', dayjs(executeAt).toISOString());
                } else if (targetType === 'offer') {
                    formData.set('status', 'offer'); // ensure exact status 'offer'
                    if (offerDate) formData.append('offerDate', dayjs(offerDate).format('YYYY-MM-DD HH:mm:ss'));
                    if (contact) formData.append('contact', contact);
                    if (cc) formData.append('cc', cc);
                    if (executeAt) formData.append('execute_at', dayjs(executeAt).toISOString());
                    if (note1) formData.append('note1', note1);
                    if (attachments && attachments.length > 0) {
                        attachments.forEach(file => formData.append('attachments', file));
                    }
                }

                const mailRes = await fetch(`${API_BASE}/candidate/${applicationId}/send-email`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }, // DO NOT set Content-Type for FormData
                    body: formData
                });
                if (!mailRes.ok) {
                    message.warning("Cảnh báo: Không thể gửi email tự động.");
                }
            }

            // Step 2: Create Calendar event
            if (createCalendar && (targetType === 'technical_test' || targetType === 'interview')) {
                const calRes = await fetch(`${API_BASE}/calendar/events`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        summary: calSummary,
                        startDateTime: calStart ? dayjs(calStart).toISOString() : null,
                        endDateTime: calEnd ? dayjs(calEnd).toISOString() : null,
                        attendees: calAttendees ? calAttendees.split(',').map(e => e.trim()).filter(Boolean) : [],
                        location: calLocation,
                        description: calDescription
                    })
                });
                if (calRes.ok) {
                    message.success("Đã tạo sự kiện Calendar thành công!");
                } else {
                    let errorMsg = "Không thể tạo sự kiện Calendar.";
                    try {
                        const errData = await calRes.json();
                        if (errData?.message) errorMsg = `Không thể tạo sự kiện Calendar: ${errData.message}`;
                    } catch (_) { /* ignore parse error */ }
                    message.warning(`Cảnh báo: ${errorMsg}`);
                }
            }

            // Step 3: Update application status
            const putBody = {
                status: targetCode,
                note: note
            };
            if (targetType === 'hired' && onboardingDate) {
                putBody.onboardingDate = dayjs(onboardingDate).format('YYYY-MM-DD');
            }

            const putRes = await fetch(`${API_BASE}/candidate/${getCandidateId(candidate)}/status`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(putBody)
            });
            if (!putRes.ok) throw new Error("Cập nhật trạng thái ứng viên thất bại!");

            message.success("Chuyển trạng thái thành công!");
            setTransModal({ open: false, candidate: null, sourceStage: null, targetStage: null });
            fetchAllData();
        } catch (error) {
            message.error(error.message || "Đã xảy ra lỗi trong quá trình xử lý!");
        } finally {
            setSubmitting(false);
        }
    };

    const getFilteredCandidates = (stage) => {
        const code = normalizeStageCode(getStageCode(stage));
        let list = Array.isArray(candidatesMap[code]) ? [...candidatesMap[code]] : [];
        
        const st = normalizeText(searchTerm);
        if (st) {
            list = list.filter(c => 
                normalizeText(c.fullName || c.full_name).includes(st) || 
                normalizeText(c.email).includes(st) || 
                normalizeText(c.phone).includes(st) ||
                normalizeText(getCandidatePositionText(c)).includes(st)
            );
        }
        
        if (selectedPosition) {
            list = list.filter(c => candidateMatchesPosition(c, selectedPosition, positions));
        }
        
        if (dateRange && dateRange[0] && dateRange[1]) {
            const start = dateRange[0].startOf('day').valueOf();
            const end = dateRange[1].endOf('day').valueOf();
            list = list.filter(c => {
                const rawDate = c.appliedDate || c.applied_date || c.createdAt || c.created_at;
                if (!rawDate) return false;
                const date = new Date(rawDate).getTime();
                if (!Number.isFinite(date)) return false;
                return date >= start && date <= end;
            });
        }

        return list;
    };

    const renderCandidateCard = (candidate, sourceStage, index) => {
        const appId = getCandidateApplicationId(candidate);
        const candidateId = getCandidateId(candidate);
        const review = appId ? managerReviewMapByApplicationId[appId] : null;
        const positionLabel = getCandidatePositionText(candidate) || '—';
        const departmentLabel = getDepartmentLabel(candidate) || 'Chưa rõ bộ phận';
        const managerLabel = candidate.picName || candidate.pic_name || candidate.hrPicName || candidate.hr_pic_name || candidate.orderInfo?.picName || candidate.orderInfo?.pic || candidate.order_pic_name || candidate.order_pic || candidate.pic || candidate.assignedTo || candidate.recruiter || candidate.hr || 'Chưa phân công';
        const isFemale = String(candidate.gender || '').toLowerCase() === 'female' || String(candidate.gender || '').toLowerCase() === 'nữ';
        const dateValue = candidate.appliedDate || candidate.applied_date || candidate.createdAt || candidate.created_at;
        const dateStr = dateValue ? dayjs(dateValue).format('DD/MM/YYYY') : '';
        const testStatus = candidate.testOnlineStatus || candidate.test_online_status;
        const showTestIcon = testStatus === 'sent' || testStatus === 'passed';

        return (
            <div 
                key={getCandidateRenderKey(candidate, index, getStageCode(sourceStage))}
                draggable
                onDragStart={(e) => handleDragStart(e, candidate, sourceStage)}
                className="group relative bg-white p-[16px] rounded-[10px] border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing mb-3"
            >
                <div className="flex justify-between items-start mb-1">
                    <span 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            if (candidateId) navigate(`/recruitment/candidates?candidateId=${candidateId}`); 
                        }} 
                        className="font-bold text-slate-800 text-[14px] cursor-pointer hover:text-blue-600 transition-colors mr-1"
                    >
                        {candidate.fullName || candidate.full_name || 'Ứng viên chưa rõ tên'}
                    </span>
                </div>

                <div className="text-[12px] text-slate-500 mb-1.5 truncate">{candidate.email || '—'}</div>
                
                <div className="text-[12px] text-slate-500 mb-2.5 flex items-center gap-2">
                    <i className="fa-solid fa-phone text-slate-400"></i> {candidate.phone || '—'} 
                    <span className="ml-2 text-slate-600 font-medium">{isFemale ? 'Nữ' : 'Nam'}</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                    {positionLabel && positionLabel !== '—' && (
                        <span className="px-2 py-0.5 rounded-[4px] bg-[#EBF3FF] text-[#2F54EB] font-bold text-[11px]">
                            {positionLabel}
                        </span>
                    )}
                    {candidate.level && (
                        <span className="px-2 py-0.5 rounded-[4px] bg-slate-100 text-slate-500 font-bold text-[11px]">
                            {candidate.level}
                        </span>
                    )}
                    {review && (() => {
                        const currentStage = (getCandidateCurrentStatus(candidate) || getStageCode(sourceStage) || '').toLowerCase();
                        const pastDeptReview = ['interview_round_1','interview_round_2','offer','onboarding','hired'].includes(currentStage);
                        
                        let badgeText, badgeColor;
                        if (review.status === 'REJECT') {
                            badgeText = 'Manager: Đã loại';
                            badgeColor = 'bg-rose-100 text-rose-600';
                        } else if (review.status === 'APPROVE') {
                            badgeText = 'Manager: Đã duyệt';
                            badgeColor = 'bg-emerald-100 text-emerald-600';
                        } else if (pastDeptReview) {
                            // Đã qua bước đánh giá bộ phận → hiện "Đã duyệt" thay vì "Chờ đánh giá"
                            badgeText = 'Manager: Đã duyệt';
                            badgeColor = 'bg-emerald-100 text-emerald-600';
                        } else {
                            badgeText = 'Manager: Chờ đánh giá';
                            badgeColor = 'bg-amber-100 text-amber-600';
                        }
                        
                        return (
                            <span className={`px-2 py-0.5 rounded-[4px] font-bold text-[11px] ${badgeColor}`}>
                                {badgeText}
                            </span>
                        );
                    })()}
                </div>

                <div className="text-[12px] text-slate-500 mb-1.5 flex items-center gap-2">
                    <i className="fa-solid fa-hashtag text-slate-400 w-3 text-center"></i> <span className="truncate">{departmentLabel}</span>
                </div>
                
                <div className="text-[12px] text-slate-500 mb-3.5 flex items-center gap-2">
                    <i className="fa-solid fa-user text-slate-400 w-3 text-center"></i> <span className="truncate">{managerLabel}</span>
                </div>

                <div className="flex justify-between items-end mt-2 pt-2 relative">
                    <span className="text-[12px] text-slate-400 font-medium mt-1">
                        {dateStr}
                    </span>
                    
                    <div className="flex items-center gap-2">
                        {showTestIcon && (
                            <Tooltip title="Đã gửi test">
                                <div className="text-emerald-500 w-6 h-6 flex items-center justify-center cursor-default bg-emerald-50 rounded-full border border-emerald-100">
                                    <i className="fa-solid fa-paper-plane text-[11px]"></i>
                                </div>
                            </Tooltip>
                        )}
                        <Tooltip title="Duyệt hồ sơ nhanh">
                            <button 
                                onClick={(e) => openQuickReviewModal(e, candidate)} 
                                className="w-7 h-7 flex items-center justify-center rounded-[6px] bg-slate-50 border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors shadow-sm"
                            >
                                <i className="fa-solid fa-bolt text-[13px]"></i>
                            </button>
                        </Tooltip>
                    </div>
                </div>
            </div>
        );
    };

    const targetType = transModal.targetStage ? detectStageType(transModal.targetStage) : '';
    const getTransitionSteps = (type) => {
        if (type === 'test_online') return ['Ghi chú & Đánh giá', 'Gửi Email Test'];
        if (type === 'technical_test' || type === 'interview') return ['Ghi chú & Đánh giá', 'Gửi Email', 'Lên lịch Calendar'];
        if (type === 'offer') return ['Ghi chú & Đánh giá', 'Gửi Email Offer'];
        return ['Ghi chú & Đánh giá'];
    };
    const stepsList = getTransitionSteps(targetType);

    return (
        <ConfigProvider theme={{ components: { Modal: { contentBg: '#ffffff', headerBg: '#ffffff', borderRadiusLG: 16 } } }}>
            <div className="p-6 bg-[#F8FAFC] min-h-screen">
                {/* Header */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight whitespace-nowrap">Recruitment Pipeline</h1>
                    </div>
                    <ConfigProvider theme={{ 
                        token: { 
                            colorBorder: '#64748b', 
                            colorTextPlaceholder: '#475569', 
                            colorText: '#0f172a' 
                        } 
                    }}>
                        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto w-full xl:w-auto pb-1 xl:pb-0 hide-scrollbar">
                            <Input 
                                prefix={<i className="fa-solid fa-magnifying-glass text-slate-500 mr-1.5"></i>}
                                placeholder="Tìm theo tên hoặc email..." 
                                allowClear 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="min-w-[200px] xl:w-[240px] rounded-[6px] text-[14px]"
                                style={{ height: 36 }}
                            />
                            <DatePicker.RangePicker 
                                placeholder={['Từ ngày', 'Đến ngày']}
                                className="min-w-[230px] xl:w-[250px] rounded-[6px] text-[14px]"
                                onChange={setDateRange}
                                value={dateRange}
                                format="DD/MM/YYYY"
                                style={{ height: 36 }}
                            />
                            <Select 
                                placeholder="Tất cả vị trí" 
                                allowClear 
                                value={selectedPosition || null} 
                                onChange={(val) => setSelectedPosition(val || '')} 
                                className="min-w-[140px] xl:w-[180px]" 
                                style={{ height: 36 }}
                                options={positions
                                    .map((p, index) => {
                                        const value = getPositionOptionValue(p, index);
                                        const label = getPositionOptionLabel(p) || (getPositionOptionId(p) ? `Vị trí #${getPositionOptionId(p)}` : 'Không rõ vị trí');
                                        return {
                                            key: `position-${value}-${index}`,
                                            value,
                                            label
                                        };
                                    })
                                    .filter(opt => !String(opt.value).startsWith('unknown:'))}
                            />
                            <Button 
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedPosition('');
                                    setDateRange(null);
                                }} 
                                className="whitespace-nowrap rounded-[6px] text-slate-700 font-medium text-[14px] hover:text-slate-900 hover:border-slate-500"
                                style={{ height: 36 }}
                            >
                                <i className="fa-solid fa-xmark mr-1"></i> Xóa bộ lọc
                            </Button>
                        </div>
                    </ConfigProvider>
                </div>

                {/* Pipeline Board */}
                {loading ? (
                    <div className="flex justify-center items-center h-[50vh]">
                        <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                ) : stages.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500">Không có dữ liệu Pipeline</div>
                ) : (
                    <div className="flex gap-4 overflow-x-auto pb-6 items-stretch" style={{ minHeight: 'calc(100vh - 120px)' }}>
                        {stages.map(stage => {
                            const code = normalizeStageCode(getStageCode(stage));
                            const name = getStageName(stage);
                            const cands = getFilteredCandidates(stage);
                            const theme = getStatusTheme(code);

                            return (
                                <div 
                                    key={code || `stage-${name}`} 
                                    className="flex-shrink-0 w-[340px] rounded-[10px] flex flex-col overflow-hidden"
                                    style={{ backgroundColor: theme.columnBg, height: 'calc(100vh - 150px)' }}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, stage)}
                                >
                                    <div className="px-4 py-3.5 flex justify-between items-center" style={{ backgroundColor: theme.headerBg }}>
                                        <h3 className="font-bold text-[14px]" style={{ color: theme.text }}>{name}</h3>
                                        <span className="px-2 py-0.5 rounded-full text-[12px] font-bold" style={{ backgroundColor: theme.badgeBg, color: theme.text }}>{cands.length}</span>
                                    </div>
                                    <div className="p-3 overflow-y-auto flex-1 custom-scrollbar min-h-[150px]">
                                        {cands.length === 0 ? (
                                            <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-slate-400 opacity-60 pointer-events-none">
                                                <i className="fa-solid fa-folder text-[32px] mb-3 text-slate-300"></i>
                                                <span className="text-[13px] font-medium text-slate-400">Chưa có ứng viên</span>
                                            </div>
                                        ) : (
                                            cands.map((c, index) => renderCandidateCard(c, stage, index))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Transition Modal - Multi Step */}
            <Modal
                title={null}
                open={transModal.open}
                closeIcon={null}
                onCancel={() => setTransModal({ open: false, candidate: null, sourceStage: null, targetStage: null })}
                footer={null}
                width={820}
                centered
                maskStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.45)',
                    backdropFilter: 'blur(2px)'
                }}
                className="transition-modal-custom"
                styles={{ content: { padding: 0, borderRadius: '18px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' } }}
            >
                {transModal.candidate && (() => {
                    const targetType = transModal.targetStage ? detectStageType(transModal.targetStage) : '';
                    const isGeneric = targetType === 'generic' || targetType === 'rejected' || targetType === 'hired';
                    
                    const renderField = (label, value, onChange, placeholder = "") => (
                        <div className="flex flex-col">
                            <label className="text-[13px] font-semibold text-[#334155] mb-1.5">{label}</label>
                            <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full h-[44px] rounded-[8px] border-slate-200" />
                        </div>
                    );

                    return (
                        <div className="flex flex-col max-h-[90vh] bg-[#F4F8FB]">
                            {/* Header */}
                            <div className="px-8 pt-6 pb-4 flex justify-between items-center bg-white sticky top-0 z-20 shrink-0 border-b border-slate-100">
                                <h2 className="text-[20px] font-bold text-[#0F172A] m-0 flex items-center gap-3">
                                    Chuyển trạng thái: 
                                    <span className="px-3 py-1 rounded-[8px] bg-[#EBF3FF] text-[#2F54EB] text-[18px] font-bold">
                                        {getStageName(transModal.targetStage)}
                                    </span>
                                </h2>
                                <button 
                                    onClick={() => setTransModal({ open: false, candidate: null, sourceStage: null, targetStage: null })}
                                    className="w-8 h-8 flex items-center justify-center text-blue-400 hover:text-blue-600 transition-colors"
                                >
                                    <i className="fa-solid fa-xmark text-[20px] font-light"></i>
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="px-10 py-8 overflow-y-auto custom-scrollbar flex-1">
                                {/* Candidate Summary Box */}
                                <div className="bg-white border border-[#E2E8F0] px-6 py-5 rounded-[16px] flex items-center justify-between mb-10 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-[#EA580C] text-white flex items-center justify-center text-[22px] font-bold shrink-0 shadow-sm">
                                            {transModal.candidate?.fullName?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-[#0F172A] text-[18px] leading-tight mb-1">{transModal.candidate?.fullName}</div>
                                            <div className="text-[14px] text-[#64748B] font-medium">{transModal.candidate ? getPositionLabel(transModal.candidate) : ''} - {transModal.candidate?.level || 'Intern'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Custom Stepper */}
                                {!isGeneric && stepsList.length > 1 && (
                                    <div className="flex items-start justify-center mb-10 gap-20">
                                        {stepsList.map((step, idx) => {
                                            const isActive = currentStep === idx;
                                            const isCompleted = currentStep > idx;
                                            
                                            let circleClass = 'bg-white border-2 border-slate-200 text-slate-400';
                                            let textClass = 'text-slate-400';
                                            let icon = idx + 1;
                                            
                                            if (isCompleted) {
                                                circleClass = 'bg-[#D1FAE5] text-[#059669] border-none shadow-[0_0_0_8px_rgba(209,250,229,0.4)]';
                                                textClass = 'text-[#059669]';
                                                icon = <i className="fa-solid fa-check"></i>;
                                            } else if (isActive) {
                                                circleClass = 'bg-[#2F54EB] text-white border-none shadow-[0_0_0_8px_rgba(47,84,235,0.1)]';
                                                textClass = 'text-[#2F54EB]';
                                            }
                                            
                                            return (
                                                <div key={step} className="flex flex-col items-center">
                                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-[20px] font-bold mb-4 ${circleClass} transition-all`}>
                                                        {icon}
                                                    </div>
                                                    <span className={`text-[13px] font-bold uppercase tracking-wider ${textClass}`}>
                                                        {step}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Step Contents */}
                                <div className="space-y-6 pb-4">
                                    {/* Step 0: Ghi chú */}
                                    {currentStep === 0 && (
                                        <div className="animate-fadeIn space-y-6">
                                            <div className="flex flex-col">
                                                <label className="text-[14px] font-bold text-[#334155] mb-3 flex items-center gap-2">
                                                    <i className="fa-regular fa-comment-dots text-[#3B82F6] text-[16px]"></i> Lưu ý thêm
                                                </label>
                                                <Input.TextArea 
                                                    rows={6} 
                                                    value={note} 
                                                    onChange={e => setNote(e.target.value)} 
                                                    placeholder="Ghi chú đánh giá, nhắc nhở..." 
                                                    className="w-full rounded-[12px] border-slate-200 text-[14px] min-h-[140px] resize-none shadow-sm focus:border-[#3B82F6]"
                                                />
                                            </div>

                                            <div className="bg-white border border-slate-100 rounded-[16px] p-[20px] shadow-sm">
                                                <label className="block text-[14px] font-bold text-[#334155] mb-4 flex items-center gap-2">
                                                    <i className="fa-regular fa-lightbulb text-amber-500 text-[16px]"></i> Ghi chú nhanh
                                                </label>
                                                <div className="flex flex-wrap gap-3">
                                                    {getQuickNotes(targetType).map(n => (
                                                        <button 
                                                            key={n}
                                                            onClick={() => setNote(prev => prev ? `${prev}\n- ${n}` : `- ${n}`)}
                                                            className="px-5 py-2 text-[14px] font-medium text-slate-600 bg-white border border-[#E2E8F0] rounded-full hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors shadow-sm"
                                                        >
                                                            {n}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {targetType === 'hired' && (
                                                <div className="flex flex-col">
                                                    <label className="text-[14px] font-bold text-[#334155] mb-3 flex items-center gap-2">
                                                        <i className="fa-regular fa-calendar text-[#3B82F6] text-[16px]"></i> Ngày nhận việc dự kiến
                                                    </label>
                                                    <DatePicker className="w-full h-[44px] rounded-[12px] border-[#E2E8F0] shadow-sm focus:border-[#3B82F6]" onChange={(d, ds) => setOnboardingDate(ds)} />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Step 1: Send Email */}
                                    {currentStep === 1 && (stepsList[1] === 'Gửi Email Test' || stepsList[1] === 'Gửi Email' || stepsList[1] === 'Gửi Email Offer') && (
                                        <div className="animate-fadeIn">
                                            <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-[24px] shadow-sm">
                                                <div className="flex items-center justify-between mb-6 pb-5 border-b border-slate-100">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563EB]">
                                                            <i className="fa-regular fa-envelope text-[20px]"></i>
                                                        </div>
                                                        <h3 className="text-[16px] font-bold text-[#0F172A] m-0 leading-tight">Gửi email thông báo</h3>
                                                    </div>
                                                    <div 
                                                        className={`w-[44px] h-[24px] rounded-full p-[2px] transition-colors cursor-pointer shrink-0 ${sendEmail ? 'bg-[#2563EB]' : 'bg-slate-300'}`}
                                                        onClick={() => setSendEmail(!sendEmail)}
                                                    >
                                                        <div className={`w-[20px] h-[20px] rounded-full bg-white transition-transform ${sendEmail ? 'translate-x-[20px]' : 'translate-x-0'} shadow-sm`}></div>
                                                    </div>
                                                </div>

                                                {sendEmail && (
                                                    <div className="space-y-5 animate-fadeIn">
                                                        {targetType === 'test_online' && (
                                                            <>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="flex flex-col">
                                                                        <label className="text-[13px] font-semibold text-[#334155] mb-1.5">Loại Test</label>
                                                                        <Select value={testType} onChange={setTestType} className="w-full h-[44px]">
                                                                            <Select.Option value="iq">Test IQ</Select.Option>
                                                                            <Select.Option value="technical">Test Chuyên môn</Select.Option>
                                                                        </Select>
                                                                    </div>
                                                                    {renderField('Thời hạn phản hồi', deadline, setDeadline)}
                                                                </div>
                                                                {renderField('Link bài Test', testLink, setTestLink)}
                                                            </>
                                                        )}

                                                        {targetType === 'technical_test' && (
                                                            <>
                                                                {renderField('Thời gian test', testDate, setTestDate, 'Thứ Sáu, ngày 12/06/2026, lúc 15h')}
                                                                {renderField('Địa điểm', address, setAddress)}
                                                                {renderField('Người liên hệ', contact, setContact)}
                                                            </>
                                                        )}

                                                        {targetType === 'interview' && (
                                                            <>
                                                                {renderField('Thông tin phỏng vấn', interviewDate, setInterviewDate, 'Thứ Sáu, ngày 12/06/2026, lúc 15h')}
                                                                {renderField('Địa điểm', address, setAddress)}
                                                                {renderField('Người liên hệ', contact, setContact)}
                                                            </>
                                                        )}

                                                        {targetType === 'offer' && (
                                                            <>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="flex flex-col">
                                                                        <label className="text-[13px] font-semibold text-[#334155] mb-1.5">Hạn phản hồi Offer</label>
                                                                        <DatePicker showTime className="w-full h-[44px] rounded-[8px] border-slate-200" onChange={(d, ds) => setOfferDate(ds)} />
                                                                    </div>
                                                                    {renderField('Người liên hệ', contact, setContact)}
                                                                </div>
                                                            </>
                                                        )}

                                                        <div className="flex flex-col mt-4">
                                                            <label className="text-[13px] font-semibold text-[#334155] mb-1.5">Ghi chú email</label>
                                                            <Input.TextArea rows={3} placeholder="Nội dung nhắc nhở thêm trong email..." className="w-full rounded-[8px] border-slate-200 min-h-[100px]" />
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="flex flex-col col-span-2">
                                                                <label className="text-[13px] font-semibold text-[#334155] mb-1.5">Đặt lịch gửi email <span className="text-blue-500 font-normal">(để trống = gửi ngay)</span></label>
                                                                <DatePicker showTime placeholder="Chọn ngày..." className="w-full h-[44px] rounded-[8px] border-slate-200" />
                                                            </div>
                                                        </div>

                                                        {targetType === 'offer' && (
                                                            <div className="flex flex-col">
                                                                <label className="text-[13px] font-semibold text-[#334155] mb-1.5">File đính kèm Offer</label>
                                                                <div className="mt-1">
                                                                    <Upload 
                                                                        beforeUpload={(file) => { setAttachments(prev => [...prev, file]); return false; }}
                                                                        onRemove={(file) => setAttachments(prev => prev.filter(f => f.uid !== file.uid))}
                                                                        multiple
                                                                    >
                                                                        <Button icon={<UploadOutlined />} className="h-[44px] rounded-[8px] font-medium border-slate-300 px-6">Chọn file đính kèm</Button>
                                                                    </Upload>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 2: Lên lịch Calendar */}
                                    {currentStep === 2 && stepsList[2] === 'Lên lịch Calendar' && (
                                        <div className="animate-fadeIn">
                                            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[16px] p-[24px] shadow-sm">
                                                <div className="flex items-center justify-between mb-6 pb-5 border-b border-slate-100">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563EB]">
                                                            <i className="fa-regular fa-calendar-days text-[20px]"></i>
                                                        </div>
                                                        <div>
                                                            <h3 className="text-[16px] font-bold text-[#0F172A] m-0 leading-tight">Lên lịch nội bộ Calendar</h3>
                                                            <p className="text-[13px] text-[#64748B] m-0 mt-1">Tạo lịch phỏng vấn/thi tuyển nội bộ cho ứng viên</p>
                                                        </div>
                                                    </div>
                                                    <div 
                                                        className={`w-[44px] h-[24px] rounded-full p-[2px] transition-colors cursor-pointer shrink-0 ${createCalendar ? 'bg-[#2563EB]' : 'bg-slate-300'}`}
                                                        onClick={() => setCreateCalendar(!createCalendar)}
                                                    >
                                                        <div className={`w-[20px] h-[20px] rounded-full bg-white transition-transform ${createCalendar ? 'translate-x-[20px]' : 'translate-x-0'} shadow-sm`}></div>
                                                    </div>
                                                </div>

                                                {!createCalendar ? (
                                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                                                        <i className="fa-solid fa-circle-info text-slate-400 mt-0.5"></i>
                                                        <p className="text-[14px] text-[#64748B] m-0">
                                                            Bỏ qua tạo lịch Calendar. Bạn vẫn có thể tiếp tục chuyển trạng thái.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        <div className="flex flex-col">
                                                            <label className="text-[13px] font-semibold text-[#334155] mb-1.5">Tiêu đề sự kiện <span className="text-red-500">*</span></label>
                                                            <Input value={calSummary} onChange={e => setCalSummary(e.target.value)} placeholder="Nhập tiêu đề sự kiện" className="w-full h-[44px] rounded-[8px] border-slate-200 focus:border-[#2563EB] text-[14px]" />
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                                                            <div className="flex flex-col">
                                                                <label className="text-[13px] font-semibold text-[#334155] mb-1.5">Thời gian bắt đầu <span className="text-red-500">*</span></label>
                                                                <DatePicker 
                                                                    showTime 
                                                                    format="YYYY-MM-DD HH:mm:ss"
                                                                    value={calStart ? dayjs(calStart) : null}
                                                                    onChange={(d, ds) => setCalStart(ds)}
                                                                    className="w-full h-[44px] rounded-[8px] border-slate-200 focus:border-[#2563EB] text-[14px]" 
                                                                />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <label className="text-[13px] font-semibold text-[#334155] mb-1.5">Thời gian kết thúc <span className="text-red-500">*</span></label>
                                                                <DatePicker 
                                                                    showTime 
                                                                    format="YYYY-MM-DD HH:mm:ss"
                                                                    value={calEnd ? dayjs(calEnd) : null}
                                                                    onChange={(d, ds) => setCalEnd(ds)}
                                                                    className="w-full h-[44px] rounded-[8px] border-slate-200 focus:border-[#2563EB] text-[14px]" 
                                                                />
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex flex-col">
                                                            <label className="text-[13px] font-semibold text-[#334155] mb-1.5">Địa điểm</label>
                                                            <Input value={calLocation} onChange={e => setCalLocation(e.target.value)} placeholder="Nhập phòng họp hoặc địa chỉ" className="w-full h-[44px] rounded-[8px] border-slate-200 focus:border-[#2563EB] text-[14px]" />
                                                        </div>
                                                        
                                                        <div className="flex flex-col">
                                                            <label className="text-[13px] font-semibold text-[#334155] mb-1.5">Mô tả / link CV / portfolio</label>
                                                            <Input.TextArea 
                                                                value={calDescription} 
                                                                onChange={e => setCalDescription(e.target.value)} 
                                                                rows={5} 
                                                                className="w-full rounded-[8px] border-slate-200 focus:border-[#2563EB] text-[14px] min-h-[110px]" 
                                                            />
                                                        </div>
                                                        
                                                        <div className="flex flex-col">
                                                            <label className="text-[13px] font-semibold text-[#334155] mb-1.5">Người tham dự nội bộ</label>
                                                            <Input 
                                                                value={calAttendees} 
                                                                onChange={e => setCalAttendees(e.target.value)} 
                                                                placeholder="Nhập email nội bộ, cách nhau bằng dấu phẩy" 
                                                                className="w-full h-[44px] rounded-[8px] border-slate-200 focus:border-[#2563EB] text-[14px]" 
                                                            />
                                                            <span className="text-[12px] text-slate-400 mt-1">Ví dụ: hr@company.com, manager@company.com</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-8 py-5 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
                                <button 
                                    onClick={() => setCurrentStep(prev => prev > 0 ? prev - 1 : 0)}
                                    className={`px-5 h-[44px] bg-white border border-slate-200 text-[#334155] font-semibold rounded-[8px] hover:bg-slate-50 transition-colors flex items-center gap-2 ${currentStep === 0 ? 'opacity-0 pointer-events-none' : ''}`}
                                >
                                    <i className="fa-solid fa-angle-left text-sm"></i> Quay lại bước trước
                                </button>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setTransModal({ open: false, candidate: null, sourceStage: null, targetStage: null })}
                                        className="px-8 h-[44px] bg-white border border-slate-200 text-[#334155] font-semibold rounded-[8px] hover:bg-slate-50 transition-colors"
                                    >
                                        Huỷ
                                    </button>
                                    {currentStep < stepsList.length - 1 ? (
                                        <button 
                                            onClick={() => setCurrentStep(prev => prev + 1)}
                                            className="px-8 h-[44px] bg-[#2563EB] text-white font-semibold rounded-[8px] hover:bg-[#1D4ED8] transition-colors flex items-center gap-2 border-none"
                                        >
                                            Tiếp tục <i className="fa-solid fa-angle-right text-sm"></i>
                                        </button>
                                    ) : (
                                        <Button 
                                            size="large" 
                                            type="primary" 
                                            className="bg-[#059669] font-semibold rounded-[8px] px-8 h-[44px] hover:bg-[#047857] flex items-center gap-2 border-none disabled:bg-slate-300 disabled:text-slate-500" 
                                            loading={submitting} 
                                            onClick={handleConfirmTransition}
                                            disabled={stepsList[currentStep] === 'Lên lịch Calendar' && createCalendar && (!calSummary || !calStart || !calEnd)}
                                        >
                                            {submitting ? '' : <i className="fa-solid fa-check"></i>} Hoàn tất
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            {/* Quick Review Modal */}
            {quickReviewModal.open && (
                <div className="fixed inset-0 z-[60] flex items-center justify-end">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setQuickReviewModal({ open: false, candidateData: null, loading: false, detailError: false })}></div>
                    <div className="bg-white w-full max-w-6xl h-screen shadow-2xl relative flex flex-col animate-slide-left">
                        {quickReviewModal.loading ? (
                            <div className="flex-1 flex justify-center items-center"><div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div></div>
                        ) : quickReviewModal.detailError ? (
                            <div className="flex-1 flex justify-center items-center text-red-500">Lỗi không thể tải dữ liệu chi tiết ứng viên.</div>
                        ) : (
                            <>
                                {/* Header */}
                                <div className="p-6 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-20">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold">
                                            {(quickReviewForm.fullName || 'U')[0]}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">
                                                Duyệt hồ sơ nhanh <span className="ml-2 text-sm font-medium text-gray-500">#{editingIds.applicationId || editingIds.candidateId}</span>
                                            </h2>
                                            <p className="text-sm text-gray-500 mt-0.5">
                                                {quickReviewForm.fullName || 'Chưa có tên'} {quickReviewForm.email && `· ${quickReviewForm.email}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Trạng thái:</label>
                                            <select value={quickReviewForm.status} onChange={(e) => handleQuickReviewChange('status', e.target.value)} className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-600 outline-none text-sm font-bold text-blue-700">
                                                {stages.map((s, idx) => <option key={`stage-option-${getStageCode(s) || idx}`} value={getStageCode(s)}>{getStageName(s)}</option>)}
                                            </select>
                                        </div>
                                        <button onClick={() => setQuickReviewModal({ open: false, candidateData: null, loading: false, detailError: false })} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all">
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
                                                        <input type="text" value={quickReviewForm.fullName} onChange={(e) => handleQuickReviewChange('fullName', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-600 outline-none transition-all text-sm" placeholder="Nhập họ và tên" />
                                                    </div>
                                                    <div className="col-span-2 md:col-span-1 space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Email *</label>
                                                        <input type="email" value={quickReviewForm.email} onChange={(e) => handleQuickReviewChange('email', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-600 outline-none transition-all text-sm" placeholder="example@gmail.com" />
                                                    </div>
                                                    <div className="col-span-2 md:col-span-1 space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Số điện thoại *</label>
                                                        <input type="text" value={quickReviewForm.phone} onChange={(e) => handleQuickReviewChange('phone', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-600 outline-none transition-all text-sm" placeholder="09xxxxxxx" />
                                                    </div>
                                                    <div className="col-span-2 md:col-span-1 space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Trường học</label>
                                                        <select value={quickReviewForm.universitySchool} onChange={(e) => handleQuickReviewChange('universitySchool', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-600 outline-none transition-all text-sm appearance-none cursor-pointer">
                                                            <option value="">Chọn trường</option>
                                                            {filterOptions.schools.map(s => <option key={s} value={s}>{s}</option>)}
                                                            {quickReviewForm.universitySchool && !filterOptions.schools.includes(quickReviewForm.universitySchool) && (
                                                                <option value={quickReviewForm.universitySchool}>{quickReviewForm.universitySchool}</option>
                                                            )}
                                                        </select>
                                                    </div>
                                                    <div className="col-span-2 md:col-span-1 space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">GPA</label>
                                                        <input type="text" value={quickReviewForm.gpa} onChange={(e) => handleQuickReviewChange('gpa', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-600 outline-none transition-all text-sm" placeholder="Ví dụ: 3.5" />
                                                    </div>
                                                    <div className="col-span-2 md:col-span-1 space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Giới tính</label>
                                                        <select value={quickReviewForm.gender} onChange={(e) => handleQuickReviewChange('gender', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-600 outline-none transition-all text-sm appearance-none cursor-pointer">
                                                            {filterOptions.genders.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="col-span-2 md:col-span-1 space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Năm sinh</label>
                                                        <input type="text" value={quickReviewForm.birthday} onChange={(e) => handleQuickReviewChange('birthday', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-600 outline-none transition-all text-sm" placeholder="Ví dụ: 2000-01-01" />
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
                                                            value={quickReviewForm.position} 
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                const order = positions.find(p => String(getPositionOptionId(p)) === String(val));
                                                                if (order) {
                                                                    setQuickReviewForm(prev => ({
                                                                        ...prev, position: String(getPositionOptionId(order)), department: order.team || order.department || ''
                                                                    }));
                                                                } else {
                                                                    handleQuickReviewChange('position', val);
                                                                }
                                                            }} 
                                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-600 outline-none transition-all text-sm"
                                                        >
                                                            <option value="">Chọn vị trí (từ Order)</option>
                                                            {positions.map((p, idx) => {
                                                                const optionId = getPositionOptionId(p);
                                                                const optionLabel = getPositionOptionLabel(p) || (optionId ? `Vị trí #${optionId}` : 'Không rõ vị trí');
                                                                if (!optionId) return null;
                                                                return (
                                                                    <option key={`quick-position-${optionId}-${idx}`} value={optionId}>
                                                                        {optionLabel} {p.team && `- ${p.team}`}
                                                                    </option>
                                                                );
                                                            })}
                                                            {quickReviewForm.position && !positions.find(p => String(getPositionOptionId(p)) === String(quickReviewForm.position)) && (
                                                                <option value={quickReviewForm.position}>
                                                                    {quickReviewForm.position}
                                                                </option>
                                                            )}
                                                        </select>
                                                        {quickReviewForm.position && !positions.find(p => String(getPositionOptionId(p)) === String(quickReviewForm.position)) && (
                                                            <p className="text-[10px] text-red-500 italic mt-1">
                                                                * Dữ liệu cũ chưa gắn với order, vui lòng chọn lại vị trí
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="col-span-1 space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Level</label>
                                                        <select value={quickReviewForm.level} onChange={(e) => handleQuickReviewChange('level', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-600 outline-none transition-all text-sm">
                                                            <option value="">Chọn level</option>
                                                            {filterOptions.levels.map(l => <option key={l} value={l}>{l}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="col-span-1 space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Phòng ban</label>
                                                        <div className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 text-sm truncate flex flex-col justify-center min-h-[42px]">
                                                            {quickReviewForm.department ? <div className="font-medium text-gray-700">{quickReviewForm.department}</div> : '—'}
                                                        </div>
                                                    </div>
                                                    <div className="col-span-1 space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Nguồn</label>
                                                        <select value={quickReviewForm.source} onChange={(e) => handleQuickReviewChange('source', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-600 outline-none transition-all text-sm">
                                                            <option value="">Chọn nguồn</option>
                                                            {filterOptions.sources.map(s => <option key={s} value={s}>{s}</option>)}
                                                            {quickReviewForm.source && !filterOptions.sources.includes(quickReviewForm.source) && (
                                                                <option value={quickReviewForm.source}>{quickReviewForm.source}</option>
                                                            )}
                                                        </select>
                                                    </div>
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
                                                        <select value={quickReviewForm.testOnlineStatus || ''} onChange={(e) => handleQuickReviewChange('testOnlineStatus', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-600 outline-none transition-all text-sm">
                                                            <option value="">-- Chưa có --</option>
                                                            <option value="sent">Đã gửi test</option>
                                                            <option value="passed">Qua test</option>
                                                            <option value="not_attempt">Không làm test</option>
                                                            <option value="failed">Không qua test</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">IQ Test</label>
                                                        <input type="text" value={quickReviewForm.iqTest} onChange={(e) => handleQuickReviewChange('iqTest', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-600 outline-none transition-all text-sm" placeholder="X/Y" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Technical</label>
                                                        <input type="text" value={quickReviewForm.techTest} onChange={(e) => handleQuickReviewChange('techTest', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-600 outline-none transition-all text-sm" placeholder="X/Y" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Thinking</label>
                                                        <input type="text" value={quickReviewForm.thinkingTest} onChange={(e) => handleQuickReviewChange('thinkingTest', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-600 outline-none transition-all text-sm" placeholder="X/Y" />
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
                                                    <textarea value={quickReviewForm.note} onChange={(e) => handleQuickReviewChange('note', e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-600 outline-none transition-all text-sm min-h-[100px]" placeholder="Nhập ghi chú HR..."></textarea>
                                                </div>
                                            </section>

                                            {/* 5. Đánh giá bộ phận */}
                                            <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                                <h3 className="text-sm font-bold text-blue-600 mb-6 flex items-center gap-2">
                                                    <i className="fa-solid fa-users-viewfinder"></i>
                                                    Đánh giá bộ phận
                                                </h3>
                                                {!quickReviewForm.managerReview ? (
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
                                                                            {quickReviewForm.managerReview.reviewerName || `Manager #${quickReviewForm.managerReview.reviewerId}`}
                                                                            <span className="text-xs text-gray-500 font-normal ml-2">(Bộ phận chọn hồ sơ)</span>
                                                                        </h4>
                                                                        <div className="text-[11px] text-gray-500 font-medium flex items-center gap-2 mt-1">
                                                                            <span className="flex items-center gap-1">
                                                                                <i className="fa-regular fa-clock"></i> 
                                                                                {quickReviewForm.managerReview.reviewedAt ? new Date(quickReviewForm.managerReview.reviewedAt).toLocaleDateString('vi-VN') : '—'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border ${
                                                                        quickReviewForm.managerReview.status === 'APPROVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                        quickReviewForm.managerReview.status === 'REJECT' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                        'bg-amber-50 text-amber-600 border-amber-100'
                                                                    }`}>
                                                                        {quickReviewForm.managerReview.status === 'APPROVE' ? 'Đã duyệt' : quickReviewForm.managerReview.status === 'REJECT' ? 'Đã loại' : 'Chờ đánh giá'}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs text-gray-600 mt-3 p-2.5 bg-white rounded-lg border border-gray-100">
                                                                    <span className="font-semibold text-gray-700">Ghi chú: </span>
                                                                    {quickReviewForm.managerReview.note || 'Không có ghi chú'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </section>

                                            {/* 6. Lịch sử tuyển dụng */}
                                            <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                                <h3 className="text-sm font-bold text-blue-600 mb-6 flex items-center gap-2">
                                                    <i className="fa-solid fa-clock-rotate-left"></i>
                                                    Lịch sử tuyển dụng
                                                </h3>
                                                {(!quickReviewForm.pipelineHistory || quickReviewForm.pipelineHistory.length === 0) ? (
                                                    <div className="p-6 bg-slate-50 border border-gray-100 rounded-xl text-center">
                                                        <p className="text-sm text-gray-400 font-medium italic">Chưa có lịch sử tuyển dụng</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {quickReviewForm.pipelineHistory.map((history, idx) => (
                                                            <div key={idx} className="flex gap-4">
                                                                <div className="flex flex-col items-center">
                                                                    <div className="w-3 h-3 rounded-full bg-blue-500 mt-1.5 shadow-[0_0_0_4px_rgba(37,99,235,0.1)]"></div>
                                                                    {idx < quickReviewForm.pipelineHistory.length - 1 && <div className="w-px h-full bg-gray-200 mt-2"></div>}
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
                                                                        {(() => {
                                                                            let resVal = (history.result || '').toLowerCase();
                                                                            let statVal = (history.status || '').toLowerCase();
                                                                            let noteVal = (history.note || '').toLowerCase();
                                                                            
                                                                            let text = 'Đang xử lý';
                                                                            let colorClass = 'bg-amber-50 text-amber-600 border-amber-100';

                                                                            const isPass = /pass|approved|done|completed|success/i.test(resVal) || /pass|approved|done|completed|success/i.test(statVal) || /pass|approve/i.test(noteVal);
                                                                            const isFail = /fail|rejected/i.test(resVal) || /fail|rejected/i.test(statVal) || /fail|reject/i.test(noteVal);
                                                                            const hasEnded = !!history.endTime || !!history.endDate;
                                                                            const isPastStep = idx < quickReviewForm.pipelineHistory.length - 1;

                                                                            if (isFail) {
                                                                                text = 'KHÔNG ĐẠT';
                                                                                colorClass = 'bg-red-50 text-red-600 border-red-100';
                                                                            } else if (isPass) {
                                                                                text = 'ĐẠT';
                                                                                colorClass = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                                                                            } else if (hasEnded || isPastStep) {
                                                                                text = 'ĐÃ QUA';
                                                                                colorClass = 'bg-slate-100 text-slate-600 border-slate-200';
                                                                            }

                                                                            return (
                                                                                <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border ${colorClass}`}>
                                                                                    {text}
                                                                                </span>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                    {history.note && (
                                                                        <div className="text-xs text-gray-600 mt-3 p-2.5 bg-white rounded-lg border border-gray-100">
                                                                            <span className="font-semibold text-gray-700">Ghi chú: </span>
                                                                            {history.note}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </section>

                                        </div>

                                        {/* Cột phải */}
                                        <div className="col-span-12 lg:col-span-5 space-y-6">
                                            <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col h-full min-h-[750px] sticky top-8">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-sm font-bold text-orange-500 flex items-center gap-2">
                                                        <i className="fa-solid fa-file-pdf"></i>
                                                        Preview CV
                                                    </h3>
                                                    {quickReviewForm.filePath && (
                                                        <a href={quickReviewForm.filePath} target="_blank" rel="noreferrer" className="px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors flex items-center gap-1">
                                                            Mở tab mới <i className="fa-solid fa-arrow-up-right-from-square"></i>
                                                        </a>
                                                    )}
                                                </div>
                                                
                                                <div className="space-y-4 mb-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Link CV *</label>
                                                        <div className="relative">
                                                            <input type="text" value={quickReviewForm.filePath} onChange={(e) => handleQuickReviewChange('filePath', e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-600 outline-none transition-all text-sm pr-10" placeholder="https://drive.google.com/..." />
                                                            <i className="fa-solid fa-link absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Link Sản phẩm</label>
                                                        <div className="relative">
                                                            <input type="text" value={quickReviewForm.productLinks} onChange={(e) => handleQuickReviewChange('productLinks', e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-600 outline-none transition-all text-sm pr-10" placeholder="Link Sản phẩm..." />
                                                            <i className="fa-solid fa-globe absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex-1 bg-slate-50 rounded-xl border border-gray-200 relative overflow-hidden mt-2">
                                                    {getDrivePreviewUrl(quickReviewForm.filePath) ? (
                                                        <iframe src={getDrivePreviewUrl(quickReviewForm.filePath)} className="absolute inset-0 w-full h-full border-none" title="CV Preview"></iframe>
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
                                    <button onClick={() => setQuickReviewModal({ open: false, candidateData: null, loading: false, detailError: false })} className="px-8 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all">Hủy</button>
                                    <button onClick={submitQuickReview} className="px-10 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center gap-2">
                                        <i className="fa-solid fa-floppy-disk"></i> Cập nhật
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </ConfigProvider>
    );
};

export default RecruitmentPipeline;