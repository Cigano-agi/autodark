
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export default function MainLayout() {
    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans antialiased">
            <Sidebar />
            <main className="flex-1 overflow-y-auto h-screen scrollbar-dark">
                <div className="container mx-auto p-8 max-w-7xl">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
