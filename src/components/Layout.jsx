import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isTopPage = location.pathname === '/';

    /**
     * -------------------------------
     * ① アプリの高さを常にviewportに同期
     * -------------------------------
     */
    React.useEffect(() => {
        const setAppHeight = () => {
            const vh = window.innerHeight;
            document.documentElement.style.setProperty('--app-height', `${vh}px`);
        };

        setAppHeight();

        window.addEventListener('resize', setAppHeight);
        window.addEventListener('orientationchange', setAppHeight);

        return () => {
            window.removeEventListener('resize', setAppHeight);
            window.removeEventListener('orientationchange', setAppHeight);
        };
    }, []);

    /**
     * -------------------------------
     * ② Auto-reload (バージョン更新検知)
     * -------------------------------
     */
    React.useEffect(() => {
        const checkVersion = async () => {
            try {
                const response = await fetch('/version.json?t=' + new Date().getTime());
                if (!response.ok) return;

                const data = await response.json();
                const latestVersion = data.buildTime;
                const currentVersion = localStorage.getItem('app_version_timestamp');

                if (currentVersion && latestVersion > parseInt(currentVersion)) {
                    console.log('New version detected. Reloading...');
                    localStorage.setItem('app_version_timestamp', latestVersion);
                    window.location.reload();
                } else if (!currentVersion) {
                    localStorage.setItem('app_version_timestamp', latestVersion);
                }
            } catch (e) {
                console.error('Failed to check version:', e);
            }
        };

        checkVersion();

        const interval = setInterval(checkVersion, 60000);
        const onFocus = () => checkVersion();

        window.addEventListener('focus', onFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', onFocus);
        };
    }, []);

    /**
     * -------------------------------
     * ③ レイアウト描画
     * -------------------------------
     */
    return (
        <div
            style={{
                height: 'var(--app-height)',        // ←ここがキモ
                width: '100%',
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)',
                paddingLeft: 'env(safe-area-inset-left)',
                paddingRight: 'env(safe-area-inset-right)',
                overflow: 'hidden'
            }}
            className="bg-gray-100 font-sans text-gray-900 relative"
        >
            {!isTopPage && (
                <button
                    onClick={() => navigate('/')}
                    className="absolute top-4 left-4 z-50 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all active:scale-95"
                    aria-label="Back to Top"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
            )}

            <Outlet />
        </div>
    );
};

export default Layout;
