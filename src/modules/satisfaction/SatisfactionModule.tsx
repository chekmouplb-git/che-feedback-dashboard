'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, Users, Star, TrendingUp, RefreshCw, Calendar, ClipboardList } from 'lucide-react';
import { SatisfactionRow } from '@/types';
import { computeStaffStats, parseRating } from './data';
import { APPS_SCRIPT_URLS } from '@/lib/config';
import { parseRowDate, inDateRange } from '@/lib/dateFilter';
import StaffCard from './StaffCard';
import StaffDetail from './StaffDetail';

function KpiCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', flex: 1 }}>
      <div className="flex items-center gap-2 mb-1">
        <div style={{ color }}>{icon}</div>
        <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <p style={{ fontSize: 22, fontWeight: 800, color: '#4C1D95', margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>{sub}</p>}
    </div>
  );
}

function EmptyState({ loading, error, onRetry }: { loading: boolean; error: string; onRetry: () => void }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 420, gap: 14, color: '#64748B' }}>
        <RefreshCw size={32} color="#7C3AED" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: 14, margin: 0 }}>Loading satisfaction data from Google Forms…</p>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 420, textAlign: 'center', padding: '48px 32px' }}>
      <div style={{ width: 80, height: 80, borderRadius: 20, background: '#FAF5FF', border: '2px solid #E9D5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, marginBottom: 20 }}>
        📋
      </div>
      <div style={{ background: '#F1F5F9', borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
        Coming Soon
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#4C1D95', margin: '0 0 10px' }}>
        Client Satisfaction Survey
      </h2>
      <p style={{ fontSize: 14, color: '#64748B', maxWidth: 340, lineHeight: 1.7, margin: '0 0 24px' }}>
        {error && !error.includes('YOUR_SATISFACTION')
          ? 'We could not load the data right now. Please try again later.'
          : 'We\'re working on this. Check back soon for client satisfaction results and insights.'}
      </p>
      <button
        onClick={onRetry}
        style={{ background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <RefreshCw size={14} /> Refresh
      </button>
    </div>
  );
}

export default function SatisfactionModule() {
  const [rawData, setRawData] = useState<SatisfactionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchLiveData = useCallback(async () => {
    const url = APPS_SCRIPT_URLS.satisfaction;
    if (!url || url.includes('YOUR_')) {
      setFetchError('No Apps Script URL configured for satisfaction survey.');
      return;
    }
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Network error');
      const json = await res.json();
      if (!json.data || json.data.length === 0) throw new Error('No responses found.');
      setRawData(json.data);
      setSelectedStaff(null);
      setLastFetched(new Date().toLocaleTimeString());
      setFetchError('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setFetchError(msg === 'Network error' ? 'Could not reach the data source.' : msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLiveData(); }, [fetchLiveData]);

  const filteredByDate = useMemo(() => {
    if (!dateFrom && !dateTo) return rawData;
    return rawData.filter((row) => {
      // Filter on the submission timestamp (always present), falling back to
      // the manually entered date of transaction if a timestamp is missing.
      const d = parseRowDate(row.timestamp) ?? parseRowDate(row.dateOfTransaction);
      return inDateRange(d, dateFrom, dateTo);
    });
  }, [rawData, dateFrom, dateTo]);

  // Responses we had to leave out because they carry no readable date
  const undatedCount = useMemo(() => {
    if (!dateFrom && !dateTo) return 0;
    return rawData.filter(
      (row) => !parseRowDate(row.timestamp) && !parseRowDate(row.dateOfTransaction)
    ).length;
  }, [rawData, dateFrom, dateTo]);

  const allStaff = useMemo(() =>
    computeStaffStats(filteredByDate).sort((a, b) => b.avgOverall - a.avgOverall),
    [filteredByDate]
  );

  const filtered = useMemo(
    () => allStaff.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())),
    [allStaff, search]
  );

  const activeStaff = useMemo(
    () => allStaff.find((s) => s.name === selectedStaff) ?? allStaff[0] ?? null,
    [allStaff, selectedStaff]
  );

  const totalResponses = filteredByDate.length;
  const avgAll = allStaff.length > 0 ? allStaff.reduce((s, st) => s + st.avgOverall, 0) / allStaff.length : 0;
  const topStaff = allStaff[0];
  const hasData = rawData.length > 0;
  const isDateFiltered = !!(dateFrom || dateTo);

  // Overall satisfaction score across all 8 metrics
  const overallSatisfaction = useMemo(() => {
    if (!filteredByDate.length) return 0;
    const keys: (keyof SatisfactionRow)[] = ['responsiveness','reliability','accessFacilities','communication','costs','integrity','assurance','outcome'];
    const all = filteredByDate.flatMap((r) => keys.map((k) => r[k] as number).filter(Boolean));
    return all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0;
  }, [filteredByDate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#4C1D95', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={22} /> Client Satisfaction Survey
          </h1>
          <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
            CHE DO citizen satisfaction ratings · ARTA-aligned metrics
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastFetched && <span style={{ fontSize: 11, color: '#7C3AED' }}>● Live · {lastFetched}</span>}
          <button
            onClick={fetchLiveData}
            disabled={loading}
            style={{ background: loading ? '#EDE9FE' : '#7C3AED', color: loading ? '#7C3AED' : '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Loading…' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Date filter */}
      {hasData && (
        <div style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: 13, fontWeight: 500, flexShrink: 0 }}>
            <Calendar size={15} color="#7C3AED" />
            Filter by date
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap' }}>From</label>
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setSelectedStaff(null); }}
                style={{ border: '1px solid #E9D5FF', borderRadius: 8, padding: '5px 10px', fontSize: 13, color: '#1E293B', background: '#fff', outline: 'none', cursor: 'pointer' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap' }}>To</label>
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setSelectedStaff(null); }}
                style={{ border: '1px solid #E9D5FF', borderRadius: 8, padding: '5px 10px', fontSize: 13, color: '#1E293B', background: '#fff', outline: 'none', cursor: 'pointer' }} />
            </div>
            {isDateFiltered && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); setSelectedStaff(null); }}
                style={{ background: 'none', border: '1px solid #E9D5FF', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: '#64748B', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                ✕ Clear filter
              </button>
            )}
          </div>
          {isDateFiltered && (
            <span style={{ fontSize: 12, color: '#7C3AED', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {totalResponses} of {rawData.length} response{rawData.length !== 1 ? 's' : ''} in range
              {undatedCount > 0 && (
                <span style={{ color: '#94A3B8', fontWeight: 500 }}>
                  {' '}· {undatedCount} without a date
                </span>
              )}
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {fetchError && hasData && (
        <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#92400E' }}>
          ⚠️ {fetchError} — showing last loaded data.
        </div>
      )}

      {/* Empty state */}
      {!hasData && <EmptyState loading={loading} error={fetchError} onRetry={fetchLiveData} />}

      {/* KPIs */}
      {hasData && (
        <div style={{ display: 'flex', gap: 12 }}>
          <KpiCard icon={<Star size={16} />} label="Overall Satisfaction" value={overallSatisfaction > 0 ? overallSatisfaction.toFixed(2) : '—'} sub="all 8 ARTA metrics" color="#7C3AED" />
          <KpiCard icon={<TrendingUp size={16} />} label="Top Performer" value={topStaff?.name.split(' ')[0] ?? '—'} sub={topStaff ? `${topStaff.avgOverall.toFixed(2)} avg` : ''} color="#7C3AED" />
          <KpiCard icon={<ClipboardList size={16} />} label="Total Responses" value={String(totalResponses)} sub={isDateFiltered ? 'in selected range' : 'evaluated'} color="#7C3AED" />
          <KpiCard icon={<Users size={16} />} label="Staff Evaluated" value={String(allStaff.length)} sub="on record" color="#7C3AED" />
        </div>
      )}

      {/* No date results */}
      {hasData && filteredByDate.length === 0 && (
        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '20px', textAlign: 'center', color: '#92400E', fontSize: 13 }}>
          No responses found in the selected date range. Try adjusting the filter.
        </div>
      )}

      {/* Main split */}
      {hasData && filteredByDate.length > 0 && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* Staff list */}
          <div style={{ width: 280, flexShrink: 0 }}>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input type="text" placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: 30, paddingRight: 10, paddingTop: 8, paddingBottom: 8, border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, background: '#fff', color: '#1E293B', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.length === 0
                ? <p style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No staff found</p>
                : filtered.map((s) => {
                    const rank = allStaff.findIndex((st) => st.name === s.name);
                    return (
                      <StaffCard key={s.name} staff={s} rank={rank}
                        selected={(selectedStaff ?? allStaff[0]?.name) === s.name}
                        onClick={() => setSelectedStaff(s.name)} />
                    );
                  })}
            </div>
          </div>

          {/* Detail */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {activeStaff
              ? <StaffDetail staff={activeStaff} allStaff={allStaff} />
              : (
                <div style={{ background: '#FAF5FF', borderRadius: 16, padding: 48, textAlign: 'center', border: '1px solid #E9D5FF', color: '#94A3B8' }}>
                  <ClipboardList size={40} color="#E9D5FF" />
                  <p style={{ fontSize: 15, marginTop: 12 }}>Select a staff member to view their performance</p>
                </div>
              )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
