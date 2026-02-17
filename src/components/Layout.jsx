import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isTopPage = location.pathname === '/';

    const [vh, setVh] = React.useState(window.innerHeight);

    const updateVh = () => {
        setVh(window.innerHeight);
    };

    React.useEffect(() => {
        updateVh();

        window.addEventListener('resize', updateVh);
        window.addEventListener('orientationchange', updateVh);

        return () => {
            window.removeEventListener('resize', updateVh);
            window.removeEventListener('orientationchange', updateVh);
        };
    }, []);

    // ===== バージョンチェック（元コードそのまま）=====
    React.useEffect(() => {
        const checkVersion = async () => {
            try {
                const response = await fetch('/version.json?t=' + new Date().getTime());
                if (!response.ok) return;
                const data = await response.json();
                const latestVersion = data.buildTime;
                const currentVersion = localStorage.getItem('app_version_timestamp');

                if (currentVersion && latestVersion > parseInt(currentVersion)) {
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

    return (
        <div
            style={{
                height: vh,
                width: '100%',
                background: '#f3f4f6',
                position: 'relative'
            }}
        >
            {!isTopPage && (
                <button
                    onClick={() => navigate('/')}
                    style={{
                        position: 'absolute',
                        top: 16,
                        left: 16,
                        zIndex: 50,
                        padding: 10,
                        background: 'rgba(255,255,255,0.8)',
                        borderRadius: 9999,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                >
                    ←
                </button>
            )}

            <Outlet />
        </div>
    );
};

export default Layout;
