'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, Users, Star, TrendingUp, RefreshCw, Gauge, Calendar } from 'lucide-react';
import { FeedbackRow } from '@/types';
import { computeDriverStats } from './data';
import { APPS_SCRIPT_URLS } from '@/lib/config';
import { parseRowDate, inDateRange } from '@/lib/dateFilter';
import DriverCard from './DriverCard';
import DriverDetail from './DriverDetail';
import DataImport from '@/components/DataImport';

function KpiCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', flex: 1 }}>
      <div className="flex items-center gap-2 mb-1">
        <div style={{ color }}>{icon}</div>
        <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <p style={{ fontSize: 22, fontWeight: 800, color: '#1B4332', margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>{sub}</p>}
    </div>
  );
}

function EmptyState({ loading, error, onRetry }: { loading: boolean; error: string; onRetry: () => void }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 420, gap: 14, color: '#64748B' }}>
        <RefreshCw size={32} color="#40916C" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: 14, margin: 0 }}>Loading feedback data from Google Forms…</p>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 420, textAlign: 'center', padding: '48px 32px' }}>
      <div style={{ width: 80, height: 80, borderRadius: 20, background: '#F0FDF4', border: '2px solid #D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, marginBottom: 20 }}>
        🚗
      </div>
      <div style={{ background: '#F1F5F9', borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
        Coming Soon
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1B4332', margin: '0 0 10px' }}>
        Driving Feedback
      </h2>
      <p style={{ fontSize: 14, color: '#64748B', maxWidth: 340, lineHeight: 1.7, margin: '0 0 24px' }}>
        {error && !error.includes('No Apps Script URL')
          ? 'We could not load the data right now. Please try again later.'
          : 'We\'re working on this. Check back soon for driver feedback results and insights.'}
      </p>
      <button
        onClick={onRetry}
        style={{ background: '#1B4332', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <RefreshCw size={14} /> Refresh
      </button>
    </div>
  );
}

export default function DriverModule() {
  const [rawData, setRawData] = useState<FeedbackRow[]>([]);
  const [isCustomData, setIsCustomData] = useState(false);
  const [isLiveData, setIsLiveData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Date filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchLiveData = useCallback(async () => {
    const url = APPS_SCRIPT_URLS.driver;
    if (!url || url.includes('YOUR_')) {
      setFetchError('No Apps Script URL configured yet.');
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
      setIsLiveData(true);
      setIsCustomData(false);
      setSelectedDriver(null);
      setLastFetched(new Date().toLocaleTimeString());
      setFetchError('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setFetchError(msg === 'Network error'
        ? 'Could not reach the data source.'
        : msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLiveData(); }, [fetchLiveData]);

  // Apply date filter to raw data
  const filteredByDate = useMemo(() => {
    if (!dateFrom && !dateTo) return rawData;
    return rawData.filter((row) => {
      // Filter on the trip date, falling back to the submission timestamp
      // when a respondent left the trip date blank.
      const d = parseRowDate(row.dateOfTrip) ?? parseRowDate(row.timestamp);
      return inDateRange(d, dateFrom, dateTo);
    });
  }, [rawData, dateFrom, dateTo]);

  // Trips we had to leave out because they carry no readable date
  const undatedCount = useMemo(() => {
    if (!dateFrom && !dateTo) return 0;
    return rawData.filter(
      (row) => !parseRowDate(row.dateOfTrip) && !parseRowDate(row.timestamp)
    ).length;
  }, [rawData, dateFrom, dateTo]);

  const drivers = useMemo(() =>
    computeDriverStats(filteredByDate).sort((a, b) => b.avgOverall - a.avgOverall),
    [filteredByDate]
  );

  const filtered = useMemo(
    () => drivers.filter((d) => d.name.toLowerCase().includes(search.toLowerCase())),
    [drivers, search]
  );

  const activeDriver = useMemo(
    () => drivers.find((d) => d.name === selectedDriver) ?? drivers[0] ?? null,
    [drivers, selectedDriver]
  );

  const totalTrips = filteredByDate.length;
  const avgAll = drivers.length > 0 ? drivers.reduce((s, d) => s + d.avgOverall, 0) / drivers.length : 0;
  const topDriver = drivers[0];
  const hasData = rawData.length > 0;
  const isDateFiltered = !!(dateFrom || dateTo);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Module header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1B4332', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Gauge size={22} /> Driving Feedback
          </h1>
          <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
            Driver efficiency & passenger ratings from Google Forms
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {lastFetched && (
            <span style={{ fontSize: 11, color: '#40916C' }}>● Live · {lastFetched}</span>
          )}
          <button
            onClick={fetchLiveData}
            disabled={loading}
            style={{
              background: loading ? '#D1FAE5' : '#1B4332',
              color: loading ? '#40916C' : '#fff',
              border: 'none', borderRadius: 8, padding: '8px 16px',
              fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Loading…' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Date filter bar */}
      {hasData && (
        <div style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: 13, fontWeight: 500, flexShrink: 0 }}>
            <Calendar size={15} color="#40916C" />
            Filter by date
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap' }}>From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setSelectedDriver(null); }}
                style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '5px 10px', fontSize: 13, color: '#1E293B', background: '#fff', outline: 'none', cursor: 'pointer' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap' }}>To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setSelectedDriver(null); }}
                style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '5px 10px', fontSize: 13, color: '#1E293B', background: '#fff', outline: 'none', cursor: 'pointer' }}
              />
            </div>

            {isDateFiltered && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); setSelectedDriver(null); }}
                style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: '#64748B', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                ✕ Clear filter
              </button>
            )}
          </div>

          {isDateFiltered && (
            <span style={{ fontSize: 12, color: '#40916C', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {totalTrips} of {rawData.length} trip{rawData.length !== 1 ? 's' : ''} in range
              {undatedCount > 0 && (
                <span style={{ color: '#94A3B8', fontWeight: 500 }}>
                  {' '}· {undatedCount} without a date
                </span>
              )}
            </span>
          )}
        </div>
      )}

      {/* Error banner */}
      {fetchError && hasData && (
        <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#92400E' }}>
          ⚠️ {fetchError} — showing last loaded data.
        </div>
      )}

      {/* No data empty state */}
      {!hasData && <EmptyState loading={loading} error={fetchError} onRetry={fetchLiveData} />}

      {/* KPIs — reordered: Fleet Average, Top Performer, Total Trips, Drivers */}
      {hasData && (
        <div style={{ display: 'flex', gap: 12 }}>
          <KpiCard icon={<Star size={16} />} label="Fleet Average" value={avgAll > 0 ? avgAll.toFixed(2) : '—'} sub="all 7 metrics" color="#40916C" />
          <KpiCard icon={<TrendingUp size={16} />} label="Top Performer" value={topDriver?.name.split(' ')[0] ?? '—'} sub={topDriver ? `${topDriver.avgOverall.toFixed(2)} avg` : ''} color="#40916C" />
          <KpiCard icon={<Gauge size={16} />} label="Total Trips" value={String(totalTrips)} sub={isDateFiltered ? 'in selected range' : 'evaluated'} color="#40916C" />
          <KpiCard icon={<Users size={16} />} label="Drivers" value={String(drivers.length)} sub="on record" color="#40916C" />
        </div>
      )}

      {/* No results after date filter */}
      {hasData && filteredByDate.length === 0 && (
        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '20px', textAlign: 'center', color: '#92400E', fontSize: 13 }}>
          No trips found in the selected date range. Try adjusting the filter.
        </div>
      )}

      {/* Main split */}
      {hasData && filteredByDate.length > 0 && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* Driver list */}
          <div style={{ width: 280, flexShrink: 0 }}>
            <DataImport
              onImport={(rows) => { setRawData(rows); setIsCustomData(true); setIsLiveData(false); setSelectedDriver(null); setFetchError(''); setDateFrom(''); setDateTo(''); }}
              onReset={() => { setRawData([]); setIsCustomData(false); setIsLiveData(false); setSelectedDriver(null); fetchLiveData(); }}
              isCustomData={isCustomData}
            />
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search driver..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: 30, paddingRight: 10, paddingTop: 8, paddingBottom: 8, border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, background: '#fff', color: '#1E293B', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.length === 0
                ? <p style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No drivers found</p>
                : filtered.map((driver) => {
                    const rank = drivers.findIndex((d) => d.name === driver.name);
                    return (
                      <DriverCard
                        key={driver.name}
                        driver={driver}
                        rank={rank}
                        selected={(selectedDriver ?? drivers[0]?.name) === driver.name}
                        onClick={() => setSelectedDriver(driver.name)}
                      />
                    );
                  })
              }
            </div>
          </div>

          {/* Detail panel */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {activeDriver ? (
              <DriverDetail driver={activeDriver} allDrivers={drivers} />
            ) : (
              <div style={{ background: '#F8FAFC', borderRadius: 16, padding: 48, textAlign: 'center', border: '1px solid #E2E8F0', color: '#94A3B8' }}>
                <Gauge size={40} color="#D1FAE5" />
                <p style={{ fontSize: 15, marginTop: 12 }}>Select a driver to view their performance</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
