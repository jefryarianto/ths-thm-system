'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, AlertTriangle, Users, Check, CreditCard, TrendingUp, type LucideIcon } from 'lucide-react';
import apiClient from '@/lib/api-client';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { getKtaStatusLabel } from '@/components/kta/constants';

interface FunnelStage {
  stage: string;
  count: number;
  rate: string;
}

interface ProcessingTime {
  level: string;
  avgDays: number;
  medianDays: number;
  minDays: number;
  maxDays: number;
  count: number;
}

interface MonthlyTrend {
  month: string;
  submitted: number;
  approved: number;
  generated: number;
  rejected: number;
}

interface Bottleneck {
  level: string;
  status: string;
  avgHoursStuck: number;
  count: number;
  slaHours: number;
  breachRate: number;
}

interface SlaEntry {
  count: number;
  avgHoursStuck: number;
  oldestHours: number;
}

export default function KtaAnalyticsPage() {
  const toast = useToast();
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [processingTimes, setProcessingTimes] = useState<ProcessingTime[]>([]);
  const [trend, setTrend] = useState<MonthlyTrend[]>([]);
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [sla, setSla] = useState<Record<string, SlaEntry>>({});
  const [selectedMonths, setSelectedMonths] = useState(6);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [funnelRes, processingRes, trendRes, bottlenecksRes, slaRes] = await Promise.all([
        apiClient.get('/kta-applications/analytics/funnel'),
        apiClient.get('/kta-applications/analytics/processing-time'),
        apiClient.get('/kta-applications/analytics/trend', { params: { months: selectedMonths } }),
        apiClient.get('/kta-applications/analytics/bottlenecks'),
        apiClient.get('/kta-applications/escalation/sla'),
      ]);
      setFunnel(funnelRes.data?.data?.stages || []);
      setProcessingTimes(processingRes.data?.data || []);
      setTrend(trendRes.data?.data || []);
      setBottlenecks(bottlenecksRes.data?.data || []);
      setSla(slaRes.data?.data || {});
    } catch {
      toast('error', 'Gagal memuat data analytics');
    } finally {
      setLoading(false);
    }
  }, [selectedMonths, toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const totalSubmitted = funnel[0]?.count || 0;
  const totalGenerated = funnel[funnel.length - 1]?.count || 0;
  const overallConversion = totalSubmitted > 0 ? ((totalGenerated / totalSubmitted) * 100).toFixed(1) : '0.0';

  return (
    <PageContainer>
      <PageHeader title="Analytics KTA" onRefresh={fetchAnalytics}>
        <div className="flex items-center gap-2">
          <select
            value={selectedMonths}
            onChange={(e) => setSelectedMonths(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800"
          >
            <option value={3}>3 Bulan</option>
            <option value={6}>6 Bulan</option>
            <option value={12}>12 Bulan</option>
          </select>
          <button
            onClick={() => {
              if (!window.confirm('Export akan segera tersedia')) return;
            }}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <Download size={14} /> Export
          </button>
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SummaryCard label="Total Diajukan" value={totalSubmitted} color="blue" Icon={Users} />
            <SummaryCard
              label="Disetujui Nasional"
              value={funnel.find((s) => s.stage === 'Nasional Approved')?.count || 0}
              color="green"
              Icon={Check}
            />
            <SummaryCard label="KTA Digenerate" value={totalGenerated} color="purple" Icon={CreditCard} />
            <SummaryCard label="Konversi" value={`${overallConversion}%`} color="orange" Icon={TrendingUp} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-6">
            <h3 className="text-lg font-semibold mb-4">Funnel Konversi KTA</h3>
            <div className="space-y-3">
              {funnel.map((stage) => (
                <FunnelStageCard key={stage.stage} stage={stage} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-6">
              <h3 className="text-lg font-semibold mb-4">Rata-rata Waktu Proses per Level</h3>
              <div className="space-y-4">
                {processingTimes.map((time) => (
                  <ProcessingTimeCard key={time.level} time={time} />
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-6">
              <h3 className="text-lg font-semibold mb-4">Tren Bulanan ({selectedMonths} Bulan)</h3>
              <div className="space-y-3">
                {trend.map((t) => (
                  <TrendCard key={t.month} trend={t} />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-6">
              <h3 className="text-lg font-semibold mb-4">Bottleneck & SLA Breach</h3>
              <div className="space-y-3">
                {bottlenecks.map((b) => (
                  <BottleneckCard key={`${b.level}-${b.status}`} bottleneck={b} />
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-6">
              <h3 className="text-lg font-semibold mb-4">Status SLA per Level</h3>
              <div className="space-y-3">
                {Object.entries(sla).map(([level, data]) => (
                  <SlaCard key={level} level={level} data={data} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function SummaryCard({
  label,
  value,
  color,
  Icon,
}: {
  label: string;
  value: number | string;
  color: string;
  Icon: LucideIcon;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  };
  return (
    <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-border">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span className={`p-2 rounded-lg ${colorMap[color] || 'bg-gray-100 text-gray-700'}`}>
          <Icon size={22} />
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
    </div>
  );
}

function FunnelStageCard({ stage }: { stage: FunnelStage }) {
  const rate = parseFloat(stage.rate);
  const color = rate >= 90 ? 'green' : rate >= 70 ? 'orange' : 'red';
  const colorHex = color === 'green' ? '#10B981' : color === 'orange' ? '#F59E0B' : '#EF4444';
  return (
    <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-border">
      <div className="flex-shrink-0 w-32 text-center">
        <div className={`text-2xl font-bold ${color === 'green' ? 'text-green-600' : color === 'orange' ? 'text-orange-600' : 'text-red-600'}`}>
          {stage.count}
        </div>
        <div className="text-xs text-muted">{stage.stage}</div>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="font-medium">{stage.stage}</span>
          <span className={`font-bold ${color === 'green' ? 'text-green-600' : color === 'orange' ? 'text-orange-600' : 'text-red-600'}`}>
            {stage.rate}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${stage.rate}%`, backgroundColor: colorHex }} />
        </div>
      </div>
    </div>
  );
}

function TimeStat({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    gray: 'bg-gray-100 text-gray-700',
    red: 'bg-red-100 text-red-700',
  };
  return (
    <div className={`p-3 rounded-lg ${colorMap[color] || 'bg-gray-100 text-gray-700'}`}>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function ProcessingTimeCard({ time }: { time: ProcessingTime }) {
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-border">
      <div className="flex items-center justify-between mb-3">
        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 text-xs font-medium rounded-full">
          {time.level}
        </span>
        <span className="text-xs text-muted">{time.count} aplikasi</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <TimeStat label="Rata-rata" value={`${time.avgDays} hari`} color="blue" />
        <TimeStat label="Median" value={`${time.medianDays} hari`} color="green" />
        <TimeStat label="Min" value={`${time.minDays} hari`} color="gray" />
        <TimeStat label="Max" value={`${time.maxDays} hari`} color="red" />
      </div>
    </div>
  );
}

function TrendStat({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    red: 'bg-red-100 text-red-700',
  };
  return (
    <div className={`p-3 rounded-lg ${colorMap[color] || 'bg-gray-100 text-gray-700'}`}>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function TrendCard({ trend }: { trend: MonthlyTrend }) {
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-border">
      <div className="font-medium text-gray-900 dark:text-white">{trend.month}</div>
      <div className="grid grid-cols-4 gap-3 mt-3">
        <TrendStat label="Diajukan" value={trend.submitted} color="blue" />
        <TrendStat label="Disetujui" value={trend.approved} color="green" />
        <TrendStat label="Digenerate" value={trend.generated} color="purple" />
        <TrendStat label="Ditolak" value={trend.rejected} color="red" />
      </div>
    </div>
  );
}

function SlaStat({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    orange: 'bg-orange-100 text-orange-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-700',
  };
  return (
    <div className={`p-3 rounded-lg ${colorMap[color] || 'bg-gray-100 text-gray-700'}`}>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function BottleneckCard({ bottleneck }: { bottleneck: Bottleneck }) {
  const isBreached = bottleneck.avgHoursStuck > bottleneck.slaHours;
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-border">
      <div className="flex items-center justify-between mb-3">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            isBreached ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {isBreached ? 'SLA BREACH' : 'OK'}
        </span>
        <span className="font-semibold">{getKtaStatusLabel(bottleneck.status)}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <SlaStat label="Jumlah" value={bottleneck.count.toString()} color="blue" />
        <SlaStat label="Rata-rata" value={`${bottleneck.avgHoursStuck.toFixed(1)} jam`} color={isBreached ? 'red' : 'green'} />
        <SlaStat label="SLA" value={`${bottleneck.slaHours} jam`} color="gray" />
        <SlaStat label="Breach" value={`${bottleneck.breachRate}%`} color={isBreached ? 'red' : 'gray'} />
      </div>
      {isBreached && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">Rata-rata melewati SLA! Perlu escalation.</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SlaCard({ level, data }: { level: string; data: SlaEntry }) {
  const slaHours: Record<string, number> = {
    RANTING_REVIEW: 48,
    WILAYAH_REVIEW: 48,
    DISTRIK_REVIEW: 72,
    NASIONAL_REVIEW: 24,
    PAYMENT_SETUP: 72,
    PAYMENT_PENDING: 168,
  };
  const sla = slaHours[level] || 0;
  const isBreached = data.avgHoursStuck > sla;
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-border">
      <div className="flex items-center justify-between mb-3">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            isBreached ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {isBreached ? 'SLA BREACH' : 'OK'}
        </span>
        <span className="font-semibold">{getKtaStatusLabel(level)}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <SlaStat label="Jumlah" value={data.count.toString()} color="blue" />
        <SlaStat label="Rata-rata" value={`${data.avgHoursStuck.toFixed(1)} jam`} color={isBreached ? 'red' : 'green'} />
        <SlaStat label="Terlama" value={`${data.oldestHours.toFixed(1)} jam`} color="orange" />
        <SlaStat label="SLA" value={`${sla} jam`} color="gray" />
      </div>
      {isBreached && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">Rata-rata melewati SLA! Perlu escalation.</span>
          </div>
        </div>
      )}
    </div>
  );
}
