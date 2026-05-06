import React, { useState, useEffect } from 'react';

const ToastNotifications = () => {
    const [notifications, setNotifications] = useState([]);

    const addNotification = (message, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    };

    const showSuccess = (message) => addNotification(message, 'success');
    const showError = (message) => addNotification(message, 'error');
    const showWarning = (message) => addNotification(message, 'warning');

    // Make functions globally available
    useEffect(() => {
        window.showSuccess = showSuccess;
        window.showError = showError;
        window.showWarning = showWarning;

        return () => {
            delete window.showSuccess;
            delete window.showError;
            delete window.showWarning;
        };
    }, []);

    return (
        <div className="toast-container fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
            {notifications.map(notification => (
                <div
                    key={notification.id}
                    className={`toast toast-${notification.type} pointer-events-auto bg-white shadow-lg border rounded-lg p-4 min-w-[300px] flex justify-between items-center animate-slide-in`}
                >
                    <span className="toast-message text-sm font-medium">{notification.message}</span>
                    <button
                        onClick={() => setNotifications(prev =>
                            prev.filter(n => n.id !== notification.id)
                        )}
                        className="toast-close ml-4 text-gray-400 hover:text-gray-600 font-bold"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ToastNotifications;
