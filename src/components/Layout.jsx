import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isTopPage = location.pathname === '/';

    return (
        <div className="min-h-screen bg-gray-100 font-sans text-gray-900 relative overflow-hidden">
            {!isTopPage && (
                <button
                    onClick={() => navigate('/')}
                    className="absolute top-4 left-4 z-50 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all active:scale-95"
                    aria-label="Back to Top"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
            )}
            <Outlet />
        </div>
    );
};

export default Layout;
