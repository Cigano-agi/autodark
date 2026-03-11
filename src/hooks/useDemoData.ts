
import { useState, useEffect } from 'react';
import { Channel } from './useChannels';

// Mock Data Types
export interface Video {
    id: string;
    title: string;
    thumbnail: string;
    views: number;
    uploadDate: string;
    status: 'published' | 'processing' | 'scheduled';
    ctr: number;
    retention: number;
}

export interface ChannelMetrics {
    dailyViews: { date: string; value: number }[];
    dailySubs: { date: string; value: number }[];
    dailyRevenue: { date: string; value: number }[];
}

// Generate random realistic data
const generateHistory = (days: number, base: number, volatility: number) => {
    const data = [];
    let current = base;
    for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        const change = (Math.random() - 0.4) * volatility; // Slight upward trend bias
        current = Math.max(0, Math.round(current + change));

        data.push({
            date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            value: current
        });
    }
    return data;
};

// Mock Videos
const MOCK_VIDEOS: Video[] = [
    { id: 'v1', title: 'O Mistério das Pirâmides Revelado', thumbnail: '/api/placeholder/400/225', views: 12500, uploadDate: '2025-01-15', status: 'published', ctr: 8.5, retention: 45 },
    { id: 'v2', title: '7 Fatos Sobre o Espaço', thumbnail: '/api/placeholder/400/225', views: 5400, uploadDate: '2025-01-18', status: 'published', ctr: 6.2, retention: 38 },
    { id: 'v3', title: 'A Verdade Sobre Buracos Negros', thumbnail: '/api/placeholder/400/225', views: 800, uploadDate: '2025-01-20', status: 'processing', ctr: 0, retention: 0 },
];

export function useDemoData(channelId?: string) {
    const [metrics, setMetrics] = useState<ChannelMetrics | null>(null);
    const [videos, setVideos] = useState<Video[]>([]);

    useEffect(() => {
        if (!channelId) return;

        // Simulate API load
        const load = () => {
            const viewsHistory = generateHistory(30, 1500, 500);
            const subsHistory = generateHistory(30, 20, 10);
            const revHistory = generateHistory(30, 50, 20);

            setMetrics({
                dailyViews: viewsHistory,
                dailySubs: subsHistory,
                dailyRevenue: revHistory
            });
            setVideos(MOCK_VIDEOS);
        };

        load();
    }, [channelId]);

    const simulateLiveUpdate = () => {
        if (!metrics) return;

        const newViews = metrics.dailyViews.map((v, i) =>
            i === metrics.dailyViews.length - 1
                ? { ...v, value: v.value + Math.floor(Math.random() * 50) + 10 }
                : v
        );

        setMetrics({
            ...metrics,
            dailyViews: newViews
        });
    };

    return {
        metrics,
        videos,
        simulateLiveUpdate
    };
}
