import React, { useState } from 'react';
import { updateClientStatus } from '../services/clientservice';
import ClientStatusBadge from './ClientStatusBadge';
import { notify } from "../utils/notify";

const ClientStatusControl = ({ client, onStatusUpdate }) => {
    const [loading, setLoading] = useState(false);

    const handleStatusChange = async (newStatus) => {
        setLoading(true);

        try {
            const result = await updateClientStatus(client.clientId, {
                ...client, // Include all existing client data
                status: newStatus
            });

            if (result.success) {
                onStatusUpdate(client.clientId, newStatus);
                notify.success(`Client status changed to ${newStatus}`);
            } else {
                // Show specific warning message from backend
                notify.error(result.message || 'Failed to update status');
            }
        } catch (error) {
            notify.error('Failed to update client status');
        } finally {
            setLoading(false);
        }
    };

    const statusOptions = [
        { value: 'ACTIVE', label: 'Active', disabled: client.status === 'ACTIVE' },
        { value: 'INACTIVE', label: 'Inactive', disabled: client.status === 'INACTIVE' },
        { value: 'ON_HOLD', label: 'On Hold', disabled: client.status === 'ON_HOLD' }
    ];

    // Try to get user role from context or localStorage
    const userRole = localStorage.getItem('userRole') || (JSON.parse(localStorage.getItem('user') || '{}').role);

    return (
        <div className="client-status-control">
            <div className="current-status">
                <ClientStatusBadge status={client.status} />
            </div>

            {userRole === 'Admin' && (
                <div className="status-actions">
                    <select
                        value={client.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={loading}
                        className="status-dropdown"
                    >
                        {statusOptions.map(option => (
                            <option
                                key={option.value}
                                value={option.value}
                                disabled={option.disabled}
                            >
                                {option.label}
                            </option>
                        ))}
                    </select>

                    {loading && <span className="loading-spinner ml-2">Updating...</span>}
                </div>
            )}
        </div>
    );
};

export default ClientStatusControl;
