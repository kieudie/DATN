import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Constants ──
const API_BASE = 'http://localhost:3000';

const REPORT_OPTIONS = [
  { value: 'overview', label: 'Tổng quan pipeline' },
  { value: 'by-position', label: 'Hiệu quả theo vị trí' },
  { value: 'by-level', label: 'Hiệu quả theo level' },
  { value: 'by-department', label: 'Hiệu quả theo phòng ban' },
  { value: 'by-source', label: 'Hiệu quả theo nguồn tuyển dụng' },
  { value: 'time-to-hire', label: 'Time to hire' },
  { value: 'time-to-fill', label: 'Time to fill' },
  { value: 'time-in-stage', label: 'Time in stage' },
];

const PIPELINE_LABELS = {
  received_cv: 'CV ứng tuyển', total_received_cv: 'CV ứng tuyển',
  hr_scan: 'HR scan', test: 'Test', iq_test: 'IQ test',
  technical_test: 'Technical test', department_review: 'Bộ phận review',
  interview_round_1: 'Phỏng vấn vòng 1', interview_round_2: 'Phỏng vấn vòng 2',
  offer: 'Offer', onboarding: 'Nhận việc',
};

const PIPELINE_KEYS = [
  'received_cv', 'hr_scan', 'test', 'iq_test', 'technical_test',
  'department_review', 'interview_round_1', 'interview_round_2', 'offer', 'onboarding',
];

const FUNNEL_ORDER = [
  'received_cv', 'hr_scan', 'test', 'iq_test', 'department_review',
  'technical_test', 'interview_round_1', 'interview_round_2', 'offer', 'onboarding',
];

const EFFECTIVENESS_TYPES = ['by-position', 'by-level', 'by-department', 'by-source'];

const GROUP_KEY_MAP = {
  'by-position': 'position_name', 'by-level': 'level',
  'by-department': 'department_name', 'by-source': 'source',
};

const REPORT_TITLES = {
  overview: 'Tổng quan pipeline',
  'by-position': 'Hiệu quả tuyển dụng theo vị trí',
  'by-level': 'Hiệu quả tuyển dụng theo level',
  'by-department': 'Hiệu quả tuyển dụng theo phòng ban',
  'by-source': 'Hiệu quả tuyển dụng theo nguồn tuyển dụng',
  'time-to-hire': 'Time to hire',
  'time-to-fill': 'Time to fill',
  'time-in-stage': 'Thời gian lưu hồ sơ từng vòng',
};

// ── Helpers ──
const getToken = () => localStorage.getItem('access_token') || '';
const num = (v) => (typeof v === 'number' ? v : Number(v) || 0);
const fmtNum = (v) => num(v).toLocaleString('vi-VN');
const fmtPct = (v) => `${num(v).toFixed(1)}%`;
const fmtDays = (v) => { const n = num(v); return `${n % 1 === 0 ? n : n.toFixed(1)} ngày`; };
const fmtVal = (v) => { const n = num(v); return n % 1 !== 0 ? n.toFixed(1) : fmtNum(n); };
const getPipelineLabel = (code) => PIPELINE_LABELS[code] || code.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const getGroupLabel = (type) => ({ 'by-position': 'Vị trí', 'by-level': 'Level', 'by-department': 'Phòng ban', 'by-source': 'Nguồn' })[type] || 'Nhóm';

const getCvCount = (item) => {
  if (item != null && item.received_cv !== undefined && item.received_cv !== null) return num(item.received_cv);
  if (item != null && item.total_received_cv !== undefined && item.total_received_cv !== null) return num(item.total_received_cv);
  return 0;
};

const getRate = (d) => {
  if (d.success_rate != null) return num(d.success_rate);
  const cv = getCvCount(d);
  return cv > 0 ? (num(d.onboarding) / cv) * 100 : 0;
};

// ── Style tokens ──
const cardBase = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', padding: 16 };
const secTitle = { fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 14 };
const gridCards = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 };

// ── Shared UI ──
const StatCard = ({ label, value, icon, color = '#2563EB', sub }) => (
  <div style={cardBase}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: color + '14', color, fontSize: 14 }}>
        <i className={`fa-solid ${icon || 'fa-chart-simple'}`} />
      </div>
      <span style={{ fontSize: 12, color: '#64748B' }}>{label}</span>
    </div>
    <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A' }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{sub}</div>}
  </div>
);

const Badge = ({ text, color = '#2563EB', bg }) => (
  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: bg || color + '14', color, whiteSpace: 'nowrap', lineHeight: 1 }}>{text}</span>
);

const DataTable = ({ columns = [], rows = [], scrollX = false, title }) => {
  if (!rows.length) return null;
  return (
    <div style={{ ...cardBase, marginTop: 20, ...(scrollX ? { overflowX: 'auto' } : {}) }}>
      {title && <div style={secTitle}>{title}</div>}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: scrollX ? 900 : 'auto' }}>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} style={{ textAlign: col.align || 'left', padding: '8px 10px', background: '#F8FAFC', color: '#64748B', fontWeight: 600, borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: '1px solid #F1F5F9' }}>
              {columns.map((col, ci) => (
                <td key={ci} style={{ padding: '8px 10px', color: '#0F172A', textAlign: col.align || 'left', whiteSpace: 'nowrap' }}>
                  {col.render ? col.render(row) : row[col.key] ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const LoadingState = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 16 }}>
    <div style={{ width: 40, height: 40, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'rr-spin 0.8s linear infinite' }} />
    <span style={{ color: '#64748B', fontSize: 14 }}>Đang tải dữ liệu...</span>
    <style>{`@keyframes rr-spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

const EmptyState = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 }}>
    <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 22 }}>
      <i className="fa-solid fa-inbox" />
    </div>
    <div style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>Không có dữ liệu</div>
    <div style={{ fontSize: 13, color: '#64748B' }}>Thử thay đổi bộ lọc hoặc chọn loại báo cáo khác.</div>
  </div>
);

const ErrorState = ({ message }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 }}>
    <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', fontSize: 22 }}>
      <i className="fa-solid fa-circle-exclamation" />
    </div>
    <div style={{ fontSize: 14, fontWeight: 600, color: '#DC2626' }}>Đã xảy ra lỗi</div>
    <div style={{ fontSize: 13, color: '#64748B', maxWidth: 360, textAlign: 'center' }}>{message || 'Vui lòng thử lại.'}</div>
  </div>
);

// ── Charts ──

const HorizontalPipelineChart = ({ data }) => {
  const map = {};
  data.forEach((d) => { map[d.pipelineCode] = num(d.count); });
  const items = FUNNEL_ORDER.filter((c) => map[c] !== undefined).map((c) => ({ code: c, count: map[c] || 0 }));
  if (!items.length) return null;
  const maxCount = Math.max(...items.map((s) => s.count), 1);
  const baseCount = items[0]?.count || 1;
  return (
    <div style={{ ...cardBase, marginTop: 20 }}>
      <div style={secTitle}>Số lượng CV qua từng bước pipeline</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((step, idx) => {
          const pct = baseCount > 0 ? (step.count / baseCount) * 100 : 0;
          const w = Math.max((step.count / maxCount) * 100, 1);
          return (
            <div key={step.code} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 140, flexShrink: 0, fontSize: 13, color: '#0F172A', textAlign: 'right' }}>{getPipelineLabel(step.code)}</div>
              <div style={{ flex: 1, background: '#F1F5F9', borderRadius: 4, height: 24, overflow: 'hidden' }}>
                <div style={{ width: `${w}%`, height: '100%', borderRadius: 4, background: '#2563EB', transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ width: 100, flexShrink: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{fmtNum(step.count)}</span>
                <span style={{ fontSize: 12, color: '#64748B' }}>{idx === 0 ? '100%' : fmtPct(pct)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const VerticalBarChart = ({ items = [], title, showBadges = false, color = '#2563EB' }) => {
  if (!items.length) return null;
  const vals = items.map((i) => num(i.value));
  const maxVal = Math.max(...vals, 0.1);
  const maxIdx = vals.indexOf(Math.max(...vals));
  const nonZero = vals.filter((v) => v > 0);
  const minIdx = nonZero.length ? vals.indexOf(Math.min(...nonZero)) : -1;
  const barH = 160;
  return (
    <div style={{ ...cardBase, flex: 1, minWidth: 280, overflowX: 'auto' }}>
      {title && <div style={secTitle}>{title}</div>}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, minWidth: items.length * 56, height: barH + 50, paddingBottom: 10 }}>
        {items.map((item, idx) => {
          const h = Math.max((num(item.value) / maxVal) * barH, 2);
          const isMax = showBadges && idx === maxIdx && items.length > 1;
          const isMin = showBadges && idx === minIdx && items.length > 1 && minIdx !== maxIdx;
          const bg = isMax ? '#EF4444' : isMin ? '#10B981' : color;
          return (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {isMax && <Badge text="Chậm" color="#DC2626" bg="#FEF2F2" />}
              {isMin && <Badge text="Nhanh" color="#16A34A" bg="#F0FDF4" />}
              {showBadges && !isMax && !isMin && <div style={{ height: 16 }} />}
              <div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>{fmtVal(item.value)}</div>
              <div style={{ width: '60%', maxWidth: 40, height: h, background: bg, borderRadius: '4px 4px 0 0', transition: 'height 0.4s ease' }} />
              <div style={{ fontSize: 11, color: '#64748B', textAlign: 'center', marginTop: 6, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 4px' }} title={item.label}>{item.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const HorizontalBarChart = ({ items = [], title, color = '#2563EB' }) => {
  if (!items.length) return null;
  const maxVal = Math.max(...items.map((i) => num(i.value)), 0.1);
  return (
    <div style={{ ...cardBase, flex: 1, minWidth: 320 }}>
      {title && <div style={secTitle}>{title}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((item, idx) => {
          const val = num(item.value);
          const w = Math.max((val / maxVal) * 100, 1);
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 120, flexShrink: 0, fontSize: 12, color: '#0F172A', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.label}>{item.label}</div>
              <div style={{ flex: 1, background: '#F1F5F9', borderRadius: 4, height: 20, overflow: 'hidden' }}>
                <div style={{ width: `${w}%`, height: '100%', borderRadius: 4, background: color, transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ width: 40, flexShrink: 0, fontSize: 12, fontWeight: 600, color: '#0F172A', textAlign: 'right' }}>{fmtVal(val)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ComparisonBarChart = ({ data, gKey }) => {
  const sorted = [...data].sort((a, b) => getCvCount(b) - getCvCount(a)).slice(0, 10);
  const maxVal = Math.max(...sorted.map((d) => getCvCount(d)), 1);
  return (
    <div style={{ ...cardBase, marginTop: 20 }}>
      <div style={{ ...secTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span>Nguồn tuyển dụng: CV ứng tuyển vs Nhận việc</span>
        <div style={{ display: 'flex', gap: 12, fontSize: 12, fontWeight: 500 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#2563EB' }} /> CV ứng tuyển</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#10B981' }} /> Nhận việc</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {sorted.map((d, idx) => {
          const cv = getCvCount(d);
          const onb = num(d.onboarding);
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 120, flexShrink: 0, fontSize: 12, color: '#0F172A', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }} title={d[gKey]}>{d[gKey] || '-'}</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[{ v: cv, c: '#2563EB' }, { v: onb, c: '#10B981' }].map((bar, bi) => (
                  <div key={bi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, background: '#F1F5F9', borderRadius: 3, height: 14, overflow: 'hidden' }}>
                      <div style={{ width: `${(bar.v / maxVal) * 100}%`, minWidth: bar.v > 0 ? 2 : 0, height: '100%', background: bar.c, borderRadius: 3, transition: 'width 0.4s ease' }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: bar.c, width: 36, textAlign: 'right', flexShrink: 0 }}>{fmtNum(bar.v)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BottleneckChart = ({ data }) => {
  const sorted = [...data].sort((a, b) => num(b.avg_days) - num(a.avg_days));
  const maxVal = Math.max(...sorted.map((d) => num(d.avg_days)), 0.1);
  const topCode = sorted[0]?.pipeline_code;
  return (
    <div style={{ ...cardBase, marginTop: 20 }}>
      <div style={secTitle}>Điểm nghẽn quy trình</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((d, idx) => {
          const isTop = d.pipeline_code === topCode;
          const avgD = num(d.avg_days);
          const bg = isTop ? '#EF4444' : idx === sorted.length - 1 && sorted.length > 1 ? '#10B981' : '#2563EB';
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 140, flexShrink: 0, fontSize: 12, color: '#0F172A', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {getPipelineLabel(d.pipeline_code)}
                {isTop && <Badge text="Điểm nghẽn" color="#DC2626" bg="#FEF2F2" />}
              </div>
              <div style={{ flex: 1, background: '#F1F5F9', borderRadius: 4, height: 20, overflow: 'hidden' }}>
                <div style={{ width: `${(avgD / maxVal) * 100}%`, minWidth: avgD > 0 ? 3 : 0, height: '100%', borderRadius: 4, background: bg, transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ width: 70, flexShrink: 0, fontSize: 12, fontWeight: 600, color: isTop ? '#DC2626' : '#0F172A', textAlign: 'right' }}>{avgD % 1 !== 0 ? avgD.toFixed(1) : avgD} ngày</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Section Renderers ──

const renderOverview = (data) => {
  if (!Array.isArray(data) || !data.length) return <EmptyState />;
  const find = (code) => num(data.find((d) => d.pipelineCode === code)?.count);
  const base = find('received_cv') || 1;
  return (
    <>
      <div style={gridCards}>
        <StatCard label="Hồ sơ ứng tuyển" value={fmtNum(find('received_cv'))} icon="fa-file-lines" color="#2563EB" />
        <StatCard label="Offer" value={fmtNum(find('offer'))} icon="fa-handshake" color="#16A34A" />
        <StatCard label="Nhận việc" value={fmtNum(find('onboarding'))} icon="fa-user-check" color="#10B981" />
        <StatCard label="Số bước pipeline" value={data.length} icon="fa-layer-group" color="#EA580C" />
      </div>
      <HorizontalPipelineChart data={data} />
    </>
  );
};

const renderEffectiveness = (data, reportType, overviewTotalReceived) => {
  if (!Array.isArray(data) || !data.length) return <EmptyState />;
  const gKey = GROUP_KEY_MAP[reportType] || 'name';
  const groupLabel = getGroupLabel(reportType);
  const totalCvFromData = data.reduce((s, d) => s + getCvCount(d), 0);
  const totalCv = overviewTotalReceived != null ? overviewTotalReceived : totalCvFromData;
  const totalOnb = data.reduce((s, d) => s + num(d.onboarding), 0);
  const avgRate = totalCv > 0 ? (totalOnb / totalCv) * 100 : 0;
  
  const columns = [
    { label: groupLabel, key: '_group' },
    ...PIPELINE_KEYS.map((k) => ({ label: getPipelineLabel(k), key: k, align: 'right' })),
    { label: 'Tỷ lệ thành công', key: '_rate', align: 'right' },
  ];
  
  const rows = data.map((d) => {
    const row = { _group: d[gKey] || '-' };
    PIPELINE_KEYS.forEach((k) => { row[k] = fmtNum(k === 'received_cv' ? getCvCount(d) : num(d[k])); });
    row._rate = fmtPct(getRate(d));
    return row;
  });

  const isSource = reportType === 'by-source';
  const top10 = [...data].sort((a,b) => num(b.onboarding) - num(a.onboarding)).reverse().slice(0, 10);
  const useFallback = totalOnb === 0;
  const chartItems = top10.map(d => ({ label: d[gKey] || '-', value: useFallback ? getCvCount(d) : num(d.onboarding) }));
  
  const chartTitle = reportType === 'by-position' ? 'Top vị trí theo nhận việc' :
                     reportType === 'by-level' ? 'Hiệu quả tuyển dụng theo level' : 'Kết quả tuyển dụng theo phòng ban';

  return (
    <>
      <div style={gridCards}>
        <StatCard label={`Tổng ${groupLabel.toLowerCase()}`} value={fmtNum(data.length)} icon="fa-list" color="#2563EB" />
        <StatCard label="Tổng CV ứng tuyển" value={fmtNum(totalCv)} icon="fa-file-lines" color="#0891B2" />
        <StatCard label="Tổng nhận việc" value={fmtNum(totalOnb)} icon="fa-user-check" color="#10B981" />
        <StatCard label="Tỷ lệ thành công TB" value={fmtPct(avgRate)} icon="fa-percent" color="#7C3AED" />
      </div>
      {isSource ? (
        <>
          <ComparisonBarChart data={data} gKey={gKey} />
          <DataTable columns={columns} rows={rows} scrollX title="Chi tiết theo nguồn" />
        </>
      ) : (
        <div style={{ display: 'flex', gap: 20, marginTop: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 400, overflowX: 'auto', ...cardBase }}>
            <div style={secTitle}>Bảng thống kê chi tiết</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
              <thead><tr>{columns.map((col, i) => <th key={i} style={{ textAlign: col.align || 'left', padding: '8px 10px', background: '#F8FAFC', color: '#64748B', fontWeight: 600, borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{col.label}</th>)}</tr></thead>
              <tbody>{rows.map((row, ri) => <tr key={ri} style={{ borderBottom: '1px solid #F1F5F9' }}>{columns.map((col, ci) => <td key={ci} style={{ padding: '8px 10px', color: '#0F172A', textAlign: col.align || 'left', whiteSpace: 'nowrap' }}>{row[col.key] ?? '-'}</td>)}</tr>)}</tbody>
            </table>
          </div>
          {reportType === 'by-position' ? (
             <HorizontalBarChart items={chartItems} title={chartTitle} color="#10B981" />
          ) : (
             <VerticalBarChart items={chartItems} title={chartTitle} color="#10B981" />
          )}
        </div>
      )}
    </>
  );
};

const renderTimeToHire = (data) => {
  const summary = data?.summary;
  const details = Array.isArray(data?.details) ? data.details : [];
  if (!summary && !details.length) return <EmptyState />;
  const sorted = [...details].sort((a, b) => num(a.avg_days) - num(b.avg_days));
  const fastest = sorted[0];
  const slowest = sorted.length > 1 ? sorted[sorted.length - 1] : null;
  return (
    <>
      <div style={gridCards}>
        <StatCard label="Thời gian tuyển TB" value={fmtDays(summary?.avg_days)} icon="fa-clock" color="#2563EB" />
        <StatCard label="Tổng nhận việc" value={fmtNum(summary?.total_hired)} icon="fa-user-check" color="#10B981" />
        {fastest && <StatCard label="Nhanh nhất" value={fmtDays(fastest.avg_days)} icon="fa-bolt" color="#10B981" sub={fastest.position || '-'} />}
        {slowest && <StatCard label="Chậm nhất" value={fmtDays(slowest.avg_days)} icon="fa-hourglass-half" color="#EF4444" sub={slowest.position || '-'} />}
      </div>
      {details.length > 0 && (
        <>
          <VerticalBarChart title="Time to hire theo vị trí" items={details.map((d) => ({ label: d.position || '-', value: num(d.avg_days) }))} showBadges color="#2563EB" />
          <DataTable title="Chi tiết" columns={[{ label: 'Vị trí', key: 'pos' }, { label: 'Thời gian TB', key: 'days', align: 'right' }, { label: 'Số lượng', key: 'cnt', align: 'right' }]} rows={details.map((d) => ({ pos: d.position || '-', days: fmtDays(d.avg_days), cnt: fmtNum(d.count) }))} />
        </>
      )}
    </>
  );
};

const renderTimeToFill = (data) => {
  const summary = data?.summary;
  const byDept = Array.isArray(data?.by_department) ? data.by_department : [];
  const byMonth = Array.isArray(data?.by_month) && data.by_month.length > 0 ? data.by_month : null;
  if (!summary && !byDept.length) return <EmptyState />;
  const sorted = [...byDept].sort((a, b) => num(a.avg_days) - num(b.avg_days));
  const fastest = sorted[0];
  const slowest = sorted.length > 1 ? sorted[sorted.length - 1] : null;
  return (
    <>
      <div style={gridCards}>
        <StatCard label="Time to fill TB" value={fmtDays(summary?.avg_days)} icon="fa-clock" color="#2563EB" />
        <StatCard label="Tổng vị trí đã lấp" value={fmtNum(summary?.total_filled)} icon="fa-check-double" color="#10B981" />
        {fastest && <StatCard label="PB nhanh nhất" value={fmtDays(fastest.avg_days)} icon="fa-bolt" color="#10B981" sub={fastest.department || '-'} />}
        {slowest && <StatCard label="PB chậm nhất" value={fmtDays(slowest.avg_days)} icon="fa-hourglass-half" color="#EF4444" sub={slowest.department || '-'} />}
      </div>
      {byDept.length > 0 && (
        <>
          <VerticalBarChart title="Time to fill theo phòng ban" items={byDept.map((d) => ({ label: d.department || '-', value: num(d.avg_days) }))} showBadges color="#2563EB" />
          <DataTable title="Chi tiết theo phòng ban" columns={[{ label: 'Phòng ban', key: 'dept' }, { label: 'Thời gian TB', key: 'days', align: 'right' }, { label: 'Số lượng', key: 'cnt', align: 'right' }]} rows={byDept.map((d) => ({ dept: d.department || '-', days: fmtDays(d.avg_days), cnt: fmtNum(d.count) }))} />
        </>
      )}
      {byMonth && (
        <DataTable title="Xu hướng theo tháng" columns={[{ label: 'Tháng', key: 'month' }, { label: 'Thời gian TB', key: 'days', align: 'right' }, { label: 'Số lượng', key: 'cnt', align: 'right' }]} rows={byMonth.map((d) => ({ month: d.month || '-', days: fmtDays(d.avg_days), cnt: fmtNum(d.count) }))} />
      )}
    </>
  );
};

const renderTimeInStage = (data) => {
  if (!Array.isArray(data) || !data.length) return <EmptyState />;
  const maxAvg = data.reduce((m, d) => Math.max(m, num(d.avg_days)), 0);
  const maxItem = data.find((d) => num(d.avg_days) === maxAvg);
  const totalCount = data.reduce((s, d) => s + num(d.count), 0);
  const avgAll = data.reduce((s, d) => s + num(d.avg_days), 0) / data.length;
  return (
    <>
      <div style={gridCards}>
        <StatCard label="Số vòng pipeline" value={data.length} icon="fa-layer-group" color="#2563EB" />
        <StatCard label="Vòng lưu lâu nhất" value={fmtDays(maxAvg)} icon="fa-hourglass-half" color="#EA580C" sub={getPipelineLabel(maxItem?.pipeline_code || '')} />
        <StatCard label="Tổng hồ sơ" value={fmtNum(totalCount)} icon="fa-file-lines" color="#10B981" />
        <StatCard label="TB toàn pipeline" value={fmtDays(avgAll)} icon="fa-gauge-high" color="#7C3AED" />
      </div>
      <BottleneckChart data={data} />
      <DataTable title="Chi tiết từng vòng" columns={[{ label: 'Vòng pipeline', key: 'stage' }, { label: 'Thời gian lưu TB', key: 'days', align: 'right' }, { label: 'Số lượng', key: 'cnt', align: 'right' }]} rows={data.map((d) => ({ stage: getPipelineLabel(d.pipeline_code), days: fmtDays(d.avg_days), cnt: fmtNum(d.count) }))} />
    </>
  );
};

// ── Main Component ──
const RecruitmentReport = () => {
  const navigate = useNavigate();
  const [reportType, setReportType] = useState('overview');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [overviewTotalReceived, setOverviewTotalReceived] = useState(null);

  const handle401 = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('full_name');
    navigate('/');
  }, [navigate]);

  const fetchOverviewCount = async (sd, ed) => {
    try {
      const p = new URLSearchParams();
      if (sd) p.set('start_date', sd);
      if (ed) p.set('end_date', ed);
      p.set('_t', Date.now());
      const res = await fetch(`${API_BASE}/api/recruitment/report/overview?${p.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}`, 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        cache: 'no-store'
      });
      if (!res.ok) return null;
      const json = await res.json();
      const arr = json.data ?? json;
      if (Array.isArray(arr)) {
        const step = arr.find(d => d.pipelineCode === 'received_cv' || d.pipeline_code === 'received_cv');
        if (step) return num(step.count);
      }
      return null;
    } catch {
      return null;
    }
  };

  const fetchReport = useCallback(async (type, sd, ed) => {
    setLoading(true); setError(''); setData(null);
    try {
      if (EFFECTIVENESS_TYPES.includes(type)) {
        const total = await fetchOverviewCount(sd, ed);
        setOverviewTotalReceived(total);
      } else {
        setOverviewTotalReceived(null);
      }

      const params = new URLSearchParams();
      if (sd) params.set('start_date', sd);
      if (ed) params.set('end_date', ed);
      params.set('_t', Date.now());
      const qs = `?${params.toString()}`;
      
      const res = await fetch(`${API_BASE}/api/recruitment/report/${type}${qs}`, {
        headers: { Authorization: `Bearer ${getToken()}`, 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        cache: 'no-store'
      });
      if (res.status === 401) { handle401(); return; }
      if (!res.ok) throw new Error(`Lỗi ${res.status}`);
      const json = await res.json();
      const reportData = json.data ?? json;
      setData(reportData);

      if (type === 'overview' && Array.isArray(reportData)) {
        const cvStep = reportData.find(d => d.pipelineCode === 'received_cv' || d.pipeline_code === 'received_cv');
        if (cvStep) setOverviewTotalReceived(num(cvStep.count));
      }
    } catch (e) {
      setError(e.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [handle401]);

  useEffect(() => { fetchReport('overview', '', ''); }, [fetchReport]);

  const handleTypeChange = (e) => { const v = e.target.value; setReportType(v); fetchReport(v, startDate, endDate); };
  const handleApply = () => fetchReport(reportType, startDate, endDate);
  const handleReset = () => { setStartDate(''); setEndDate(''); setReportType('overview'); fetchReport('overview', '', ''); };

  const renderContent = () => {
    if (loading) return <LoadingState />;
    if (error) return <ErrorState message={error} />;
    if (!data) return <EmptyState />;
    if (reportType === 'overview') return renderOverview(data);
    if (EFFECTIVENESS_TYPES.includes(reportType)) return renderEffectiveness(data, reportType, overviewTotalReceived);
    if (reportType === 'time-to-hire') return renderTimeToHire(data);
    if (reportType === 'time-to-fill') return renderTimeToFill(data);
    if (reportType === 'time-in-stage') return renderTimeInStage(data);
    return <EmptyState />;
  };

  const inp = { height: 38, padding: '0 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, color: '#0F172A', background: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' };
  const btn = (primary) => ({ height: 38, padding: '0 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', background: primary ? '#2563EB' : '#fff', color: primary ? '#fff' : '#64748B', border: primary ? 'none' : '1px solid #E2E8F0' });

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: 24, fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0 }}>Báo cáo tuyển dụng</h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>Theo dõi tổng quan, hiệu quả và tốc độ tuyển dụng theo dữ liệu thực tế.</p>
        </div>
        <div style={{ ...cardBase, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 12, color: '#64748B', marginBottom: 3, display: 'block' }}>Từ ngày</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748B', marginBottom: 3, display: 'block' }}>Đến ngày</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748B', marginBottom: 3, display: 'block' }}>Loại báo cáo</label>
              <select value={reportType} onChange={handleTypeChange} style={inp}>
                {REPORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleApply} style={btn(true)}>Áp dụng</button>
              <button onClick={handleReset} style={btn(false)}>Làm mới</button>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>{REPORT_TITLES[reportType] || 'Báo cáo'}</div>
        {renderContent()}
      </div>
    </div>
  );
};

export default RecruitmentReport;
