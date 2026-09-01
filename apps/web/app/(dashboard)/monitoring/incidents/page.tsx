'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import {
  AlertTriangle,
  Calendar,
  Clock,
  TrendingDown,
  BarChart3,
  CheckCircle2,
  XCircle,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  X,
  HelpCircle,
  Database,
  Cpu,
  Network,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import { PermissionGuard } from '@/components/auth/permission-guard';

// ── Types ────────────────────────────────────────────────────

interface Incident {
  id: string;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  notes?: string | null;
  component?: string | null;
}

type Severity = 'all' | 'short' | 'medium' | 'long' | 'critical';

const COMPONENT_ICONS: Record<string, React.ElementType<LucideProps>> = {
  queue: Network,
  database: Database,
  api: Cpu,
  other: HelpCircle,
};

// ── Helpers ──────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}m ${secs}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function getSeverity(durationMs?: number): { label: string; color: string; bg: string } {
  if (!durationMs) return { label: 'Unknown', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700' };
  if (durationMs >= 1_800_000) return { label: 'Critical', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-950' };
  if (durationMs >= 300_000) return { label: 'Long', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-950' };
  if (durationMs >= 60_000) return { label: 'Medium', color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-950' };
  return { label: 'Short', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-950' };
}

function SeverityBadge({ durationMs }: { durationMs?: number }) {
  const sev = getSeverity(durationMs);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${sev.bg} ${sev.color}`}>
      {sev.label}
    </span>
  );
}

function TimelineBar({ durationMs, maxDuration }: { durationMs?: number; maxDuration: number }) {
  const sev = getSeverity(durationMs);
  const width = durationMs ? Math.max((durationMs / maxDuration) * 100, 2) : 0;
  return (
    <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex-1 max-w-[200px]">
      <div
        className={`h-full rounded-full transition-all ${
          sev.label === 'Critical' ? 'bg-red-500' :
          sev.label === 'Long' ? 'bg-orange-500' :
          sev.label === 'Medium' ? 'bg-yellow-500' :
          'bg-blue-500'
        }`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

// ── Stats Card ───────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType<LucideProps>;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

// ── Root Cause Inline Editor ─────────────────────────────────

function RootCauseEditor({
  incidentId,
  initialNotes,
  initialComponent,
  onSaved,
}: {
  incidentId: string;
  initialNotes?: string | null;
  initialComponent?: string | null;
  onSaved: (notes: string, component: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes || '');
  const [component, setComponent] = useState(initialComponent || 'queue');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await apiClient.patch(`/health/admin/queue-uptime/events/${incidentId}`, { notes, component });
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Save failed');
      }
      onSaved(notes, component);
      setEditing(false);
    } catch (err) {
      setError((err as Error)?.message || 'Failed to save. Please try again.');
    }
    setSaving(false);
  };

  if (!editing) {
    return (
      <div className="flex items-start gap-2 group">
        <div className="flex-1 min-w-0">
          {initialNotes ? (
            <p className="text-xs text-gray-600 dark:text-gray-400 italic leading-relaxed">{initialNotes}</p>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">No root cause recorded</p>
          )}
          {initialComponent && (
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-gray-400 dark:text-gray-500">
              Component: {initialComponent}
            </span>
          )}
        </div>
        <button
          onClick={() => setEditing(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          title="Edit root cause"
        >
          <Edit3 size={12} className="text-gray-400 hover:text-blue-500" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Component</label>
      </div>
      <select
        value={component}
        onChange={(e) => setComponent(e.target.value)}
        className="w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
      >
        <option value="queue">Queue / Redis</option>
        <option value="database">Database</option>
        <option value="api">API Server</option>
        <option value="other">Other</option>
      </select>
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Root Cause</label>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Describe the root cause of this incident..."
        rows={2}
        className={`w-full text-xs px-2 py-1.5 border rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 resize-none ${
          error ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
        }`}
      />
      {error && (
        <p className="text-[10px] text-red-500 dark:text-red-400 flex items-center gap-1">
          <XCircle size={10} /> {error}
        </p>
      )}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => { setEditing(false); setNotes(initialNotes || ''); setError(''); }}
          className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
        >
          <X size={10} /> Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1 px-2.5 py-1 text-[10px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded transition"
        >
          <Save size={10} /> {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// ── Incident Row ─────────────────────────────────────────────

function IncidentRow({ incident, maxDuration, onNotesSaved }: {
  incident: Incident;
  maxDuration: number;
  onNotesSaved: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const startDate = new Date(incident.startTime);
  const endDate = incident.endTime ? new Date(incident.endTime) : null;
  const sev = getSeverity(incident.durationMs);
  const CompIcon = COMPONENT_ICONS[incident.component || 'queue'] || HelpCircle;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      {/* Main row - clickable to expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-5 focus:outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left: Timeline dot + content */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Severity dot */}
            <div className="mt-1.5 shrink-0">
              <div className={`w-3 h-3 rounded-full ${
                sev.label === 'Critical' ? 'bg-red-500' :
                sev.label === 'Long' ? 'bg-orange-500' :
                sev.label === 'Medium' ? 'bg-yellow-500' :
                'bg-blue-500'
              }`} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <CompIcon size={13} className="text-gray-400 dark:text-gray-500 shrink-0" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {incident.component === 'database'
                    ? 'Database Disconnect'
                    : incident.component === 'api'
                    ? 'API Server Down'
                    : 'Queue Disconnect'}
                </h3>
                <SeverityBadge durationMs={incident.durationMs} />
                {endDate ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 font-medium">
                    <CheckCircle2 size={10} /> Resolved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400 font-medium">
                    <XCircle size={10} /> Ongoing
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {startDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {startDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  {endDate && ` - ${endDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`}
                </span>
                {incident.durationMs && (
                  <span className="flex items-center gap-1 font-mono text-gray-700 dark:text-gray-300">
                    <TrendingDown size={11} />
                    {formatDuration(incident.durationMs)}
                  </span>
                )}
              </div>

              {/* Root cause preview when collapsed */}
              {!expanded && incident.notes && (
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 truncate max-w-md">
                  📝 {incident.notes}
                </p>
              )}
            </div>
          </div>

          {/* Right: Timeline bar + expand icon */}
          <div className="flex items-center gap-3 shrink-0">
            <TimelineBar durationMs={incident.durationMs} maxDuration={maxDuration} />
            {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </div>
        </div>
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 space-y-3">
          {/* Root Cause Editor */}
          <div>
            <h4 className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              🔍 Root Cause Analysis
            </h4>
            <RootCauseEditor
              incidentId={incident.id}
              initialNotes={incident.notes}
              initialComponent={incident.component}
              onSaved={() => onNotesSaved()}
            />
          </div>

          {/* Incident Metadata */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-400 dark:text-gray-500">Incident ID</span>
              <p className="font-mono text-gray-700 dark:text-gray-300 text-[11px] truncate">{incident.id}</p>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500">Total Duration</span>
              <p className="font-mono text-gray-700 dark:text-gray-300">{incident.durationMs ? formatDuration(incident.durationMs) : '-'}</p>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500">Started</span>
              <p className="text-gray-700 dark:text-gray-300">{startDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500">Resolved</span>
              <p className="text-gray-700 dark:text-gray-300">{endDate ? endDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not yet'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [severity, setSeverity] = useState<Severity>('all');
  const [uptimePct, setUptimePct] = useState<number>(100);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days: String(days), limit: '100' });
      if (severity !== 'all') params.set('severity', severity);

      const [eventsRes, sparklineRes] = await Promise.all([
        apiClient.get(`/health/admin/queue-uptime/events?${params}`),
        apiClient.get('/health/admin/queue-uptime'),
      ]);

      const events = eventsRes.data?.data?.events || [];
      setIncidents(events);

      if (sparklineRes.data?.data?.uptimePercent !== undefined) {
        setUptimePct(sparklineRes.data.data.uptimePercent);
      }
    } catch {
      // silently degrade
    }
    setLoading(false);
  }, [days, severity]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // ── Computed stats ──
  const totalIncidents = incidents.length;
  const resolvedIncidents = incidents.filter((i) => i.endTime).length;
  const avgDuration = totalIncidents > 0
    ? incidents.reduce((sum, i) => sum + (i.durationMs || 0), 0) / totalIncidents
    : 0;
  const maxDuration = incidents.reduce((max, i) => Math.max(max, i.durationMs || 0), 0);
  const withRootCause = incidents.filter((i) => i.notes).length;

  const exportCSV = () => {
    const headers = ['ID', 'Start Time', 'End Time', 'Duration (ms)', 'Duration (readable)', 'Severity', 'Status', 'Component', 'Root Cause'];
    const rows = incidents.map((i) => {
      const sev = getSeverity(i.durationMs);
      return [
        i.id,
        i.startTime,
        i.endTime || '',
        i.durationMs || '',
        i.durationMs ? formatDuration(i.durationMs) : '',
        sev.label,
        i.endTime ? 'Resolved' : 'Ongoing',
        i.component || 'queue',
        i.notes ? `"${i.notes.replace(/"/g, '""')}"` : '',
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incidents-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PermissionGuard module="monitoring" action="view">
      <PageContainer>
        <PageHeader
          title="Incidents"
          subtitle="Riwayat downtime dengan timeline, durasi, root cause, dan status resolusi"
          onRefresh={fetchIncidents}
        >
          <div className="flex items-center gap-2">
            {/* Severity Filter */}
            <div className="relative">
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
                className="appearance-none pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Severity</option>
                <option value="critical">Critical</option>
                <option value="long">Long</option>
                <option value="medium">Medium</option>
                <option value="short">Short</option>
              </select>
              <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Days Filter */}
            <div className="relative">
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="appearance-none pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Export CSV */}
            <button
              onClick={exportCSV}
              disabled={incidents.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition"
              title="Export CSV"
            >
              <Download size={14} />
              CSV
            </button>
          </div>
        </PageHeader>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard
            icon={AlertTriangle}
            label="Total Incidents"
            value={String(totalIncidents)}
            sub={`Last ${days} days`}
            color="bg-red-500"
          />
          <StatCard
            icon={CheckCircle2}
            label="Resolved"
            value={`${resolvedIncidents}/${totalIncidents}`}
            sub={`${totalIncidents > 0 ? Math.round((resolvedIncidents / totalIncidents) * 100) : 100}% resolved`}
            color="bg-green-500"
          />
          <StatCard
            icon={Clock}
            label="Avg Duration"
            value={avgDuration > 0 ? formatDuration(avgDuration) : '-'}
            sub="per incident"
            color="bg-blue-500"
          />
          <StatCard
            icon={Edit3}
            label="Root Cause"
            value={`${withRootCause}/${totalIncidents}`}
            sub={`${totalIncidents > 0 ? Math.round((withRootCause / totalIncidents) * 100) : 0}% documented`}
            color="bg-purple-500"
          />
          <StatCard
            icon={BarChart3}
            label="Uptime"
            value={`${uptimePct}%`}
            sub="Last 24 hours"
            color={uptimePct >= 99.9 ? 'bg-green-500' : uptimePct >= 99 ? 'bg-yellow-500' : 'bg-red-500'}
          />
        </div>

        {/* Timeline View */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700 mt-1" />
                  <div className="flex-1">
                    <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                    <div className="h-3 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : incidents.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
            <CheckCircle2 size={48} className="mx-auto text-green-400 dark:text-green-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No Incidents</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {severity !== 'all'
                ? `No ${severity} severity incidents in the last ${days} days`
                : `No downtime incidents recorded in the last ${days} days`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Info bar */}
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mb-2">
              <BarChart3 size={12} />
              <span>
                Showing {incidents.length} incident{incidents.length !== 1 ? 's' : ''}
                {severity !== 'all' ? ` (${severity})` : ''} - last {days} days
                {withRootCause > 0 && ` · ${withRootCause} with root cause`}
              </span>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="text-gray-400">Click an incident to add root cause notes</span>
            </div>

            {incidents.map((incident) => (
              <IncidentRow
                key={incident.id}
                incident={incident}
                maxDuration={maxDuration || 1}
                onNotesSaved={fetchIncidents}
              />
            ))}
          </div>
        )}
      </PageContainer>
    </PermissionGuard>
  );
}
