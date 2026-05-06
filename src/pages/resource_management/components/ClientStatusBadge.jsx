import React from 'react';

const ClientStatusBadge = ({ status }) => {
    const getStatusConfig = (status) => {
        switch (status) {
            case 'ACTIVE':
                return { color: 'green', icon: '✓', label: 'Active' };
            case 'INACTIVE':
                return { color: 'red', icon: '✗', label: 'Inactive' };
            case 'ON_HOLD':
                return { color: 'orange', icon: '⏸', label: 'On Hold' };
            default:
                return { color: 'gray', icon: '?', label: 'Unknown' };
        }
    };

    const config = getStatusConfig(status);

    return (
        <span className={`status-badge status-${config.color}`}>
            <span className="status-icon">{config.icon}</span>
            {config.label}
        </span>
    );
};

export default ClientStatusBadge;
