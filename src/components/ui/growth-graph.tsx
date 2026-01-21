
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface GrowthGraphProps {
    data: { date: string; value: number }[];
    color?: string;
    height?: number;
}

export function GrowthGraph({ data, color = "#10b981", height = 80 }: GrowthGraphProps) {
    return (
        <div className="w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="date"
                        hide
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        hide
                        axisLine={false}
                        tickLine={false}
                        domain={['dataMin', 'dataMax']}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#000',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px'
                        }}
                        itemStyle={{ color: color }}
                        labelStyle={{ display: 'none' }}
                        formatter={(value: number) => [value.toLocaleString(), '']}
                    />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill={`url(#gradient-${color})`}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
