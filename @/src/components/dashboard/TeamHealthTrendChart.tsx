import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
} from 'recharts';
import { API_BASE_URL } from '../../services/api';
import { useAuth } from '@clerk/clerk-react';
import { C, useThemeMode } from '../../theme';

 type TimeRange = '1week' | '1month' | '3month' | '1year';

interface TeamHealthTrendChartProps {
    teamId: string;
    onDataPointClick?: (periodKey: string) => void;
}

const TeamHealthTrendChart: React.FC<TeamHealthTrendChartProps> = ({ teamId, onDataPointClick }) => {
    useThemeMode();
    const { getToken } = useAuth();
    const [healthData, setHealthData] = useState<any[]>([]);
    const [avgHealth, setAvgHealth] = useState<number>(50);
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [timeRange, setTimeRange] = useState<TimeRange>('1month');
    const [offset, setOffset] = useState<number>(0); // 0 = current, 1 = previous period, etc.

    const fetchHealthTrends = useCallback(async () => {
        if (!teamId) return;

        // Smooth transition logic: only show loader on initial load
        if (healthData.length > 0) {
            setIsUpdating(true);
        } else {
            setLoading(true);
        }

        try {
            const token = await getToken();
            const period = timeRange === '1week' ? 'week' : timeRange === '1month' ? 'month' : timeRange === '3month' ? 'quarter' : 'year';

            const response = await fetch(
                `${API_BASE_URL}/v1/dashboard/team/${teamId}/trends?period=${period}&offset=${offset}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.ok) {
                const data = await response.json();
                const trends = data.trends || [];

                    const formattedData = trends
                    .filter((t: any) => t.avg_score != null)
                    .map((t: any) => {
                            const dateObj = new Date(t.date);
                            // label formatting depends on range granularity
                            const label = timeRange === '1week'
                                ? dateObj.toLocaleDateString([], { weekday: 'short' })
                                : dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
                        return {
                            label,
                            health: Math.round(t.avg_score * 20),
                            period_key: t.period_key,
                        };
                    });

                setHealthData(formattedData);
                const scores = formattedData.map((d: any) => d.health);
                setAvgHealth(scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 50);
            }
        } catch (error) {
            console.error("Failed to load health trends", error);
        } finally {
            setLoading(false);
            setIsUpdating(false);
        }
    }, [teamId, timeRange, offset]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchHealthTrends();
    }, [teamId, timeRange, offset]); // eslint-disable-line react-hooks/exhaustive-deps

    // Initial loading state (only if no data yet)
    if (loading && healthData.length === 0) {
        return (
            <div className="rounded-xl p-6" style={{ background: C.card, borderWidth: 1, borderStyle: 'solid', borderColor: C.border }}>
                <h2 className="mb-4 text-xl font-semibold" style={{ color: C.text }}>Team Health Trend</h2>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="animate-spin" size={32} style={{ color: C.textDim }} />
                </div>
            </div>
        );
    }

    // No data state
    if (!loading && healthData.length === 0) {
        return (
            <div className="rounded-xl p-6" style={{ background: C.card, borderWidth: 1, borderStyle: 'solid', borderColor: C.border }}>
                <h2 className="mb-4 text-xl font-semibold" style={{ color: C.text }}>Team Health Trend</h2>
                <div className="flex items-center justify-center h-64 rounded-lg" style={{ background: C.bgSub, borderWidth: 1, borderStyle: 'solid', borderColor: C.border }}>
                    <p className="text-sm" style={{ color: C.textDim }}>No meeting data available. Record a meeting to see health trends.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl p-6" style={{ background: C.card, borderWidth: 1, borderStyle: 'solid', borderColor: C.border }}>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl font-semibold" style={{ color: C.text }}>Team Health Trend</h2>
                </div>
                <div className="flex items-center gap-2">
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button
                            onClick={() => setOffset((o) => o + 1)}
                            title="Go earlier"
                            style={{ padding: '6px 8px', borderRadius: 8, background: C.bgSub, border: `1px solid ${C.border}`, cursor: 'pointer' }}
                        >
                            ‹
                        </button>
                        <button
                            onClick={() => setOffset((o) => Math.max(0, o - 1))}
                            disabled={offset === 0}
                            title="Go forward"
                            style={{ padding: '6px 8px', borderRadius: 8, background: offset === 0 ? C.border : C.bgSub, border: `1px solid ${C.border}`, cursor: offset === 0 ? 'not-allowed' : 'pointer' }}
                        >
                            ›
                        </button>
                    </div>

                    {(['1week', '1month', '3month', '1year'] as TimeRange[]).map((range) => (
                        <button
                            key={range}
                            onClick={() => { setTimeRange(range); setOffset(0); }}
                            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${timeRange === range
                                ? 'text-white shadow-md'
                                : 'text-gray-500 hover:bg-gray-200'
                                }`}
                            style={timeRange === range ? { backgroundColor: C.teal, color: C.bg } : { background: C.bgSub }}
                        >
                            {range === '1week' ? '1 Week' : range === '1month' ? 'Monthly' : range === '3month' ? 'Quarterly' : 'Yearly'}
                        </button>
                    ))}

                    {offset > 0 && (
                        <div style={{ fontSize: 12, color: C.textDim, marginLeft: 8 }}>
                            Viewing {offset} {timeRange === '1week' ? 'week(s) ago' : timeRange === '1month' ? 'month(s) ago' : timeRange === '3month' ? 'quarter(s) ago' : 'year(s) ago'}
                        </div>
                    )}
                </div>
            </div>

            <div
                className={`h-64 w-full transition-opacity duration-300 ${isUpdating ? 'opacity-50' : 'opacity-100'}`}
                onWheel={(e) => {
                    e.preventDefault();
                    const ev = e as unknown as WheelEvent;
                    if (ev.deltaY > 0) setOffset((o) => o + 1);
                    else setOffset((o) => Math.max(0, o - 1));
                }}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={healthData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={C.teal} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={C.teal} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.border} />
                        <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 9, fontWeight: 600, fill: C.textDim }}
                            dy={10}
                        />
                        <YAxis
                            domain={[0, 100]}
                            axisLine={false}
                            tickLine={false}
                            tick={false}  // No Y-axis labels (client request)
                        />
                        {/* No Tooltip (client request) */}
                        <Line
                            type="monotone"
                            dataKey="health"
                            stroke={C.teal}
                            strokeWidth={3}
                            dot={{ r: 4, fill: C.teal, cursor: 'pointer' } as any}
                            activeDot={{
                                r: 7,
                                fill: C.teal,
                                stroke: C.bg,
                                strokeWidth: 2,
                                cursor: 'pointer',
                                onClick: (_e: any, payload: any) => {
                                    const periodKey = payload?.payload?.period_key;
                                    if (periodKey && onDataPointClick) {
                                        onDataPointClick(periodKey);
                                    }
                                },
                            } as any}
                            isAnimationActive={true}
                            animationDuration={500}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Bottom scrollbar / slider to page back in time */}
            <div style={{ marginTop: 12 }} onWheel={(e) => {
                // allow wheel on the slider area to page too
                e.preventDefault();
                const ev = e as unknown as WheelEvent;
                if (ev.deltaY > 0) setOffset((o) => o + 1);
                else setOffset((o) => Math.max(0, o - 1));
            }}>
                <input
                    aria-label="Scroll back in time"
                    type="range"
                    min={0}
                    max={24}
                    value={offset}
                    onChange={(e) => setOffset(Number(e.target.value))}
                    style={{
                        width: '100%',
                        appearance: 'none',
                        height: 6,
                        borderRadius: 6,
                        background: C.bgSub,
                        outline: 'none',
                        cursor: 'pointer'
                    }}
                />
            </div>

            <div className="flex items-center gap-2 mt-3 justify-center">
                <div className="h-0.5 w-4 rounded-full" style={{ background: C.teal }} />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.textDim }}>Overall Health Score</span>
            </div>
        </div>
    );
};

export default TeamHealthTrendChart;
