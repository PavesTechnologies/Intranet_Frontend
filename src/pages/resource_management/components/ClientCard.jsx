import React, { useState } from 'react';
import { updateClientStatus } from '../services/clientservice';
import ClientStatusBadge from './ClientStatusBadge';
import { toast } from 'react-toastify';

const ClientCard = ({ client, onStatusUpdate, onClick }) => {
    const [showActions, setShowActions] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleStatusChange = async (e, newStatus) => {
        e.stopPropagation(); // Prevent card click navigation
        setLoading(true);
        try {
            const result = await updateClientStatus(client.clientId, {
                ...client,
                status: newStatus
            });

            if (result.success) {
                onStatusUpdate(client.clientId, newStatus);
                toast.success(`Client status changed to ${newStatus}`);
                setShowActions(false);
            } else {
                toast.error(result.message || 'Failed to update status');
            }
        } catch (error) {
            toast.error('Failed to update client status');
        } finally {
            setLoading(false);
        }
    };

    const userRole = localStorage.getItem('userRole') || (JSON.parse(localStorage.getItem('user') || '{}').role);

    return (
        <div
            className="client-card bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition cursor-pointer relative"
            onClick={onClick}
        >
            <div className="client-header flex justify-between items-start mb-4">
                <h3 className="font-semibold text-gray-900 line-clamp-1">{client.clientName}</h3>
                <ClientStatusBadge status={client.status} />
            </div>

            <div className="client-details space-y-2 text-sm text-gray-600 mb-4">
                <p><span className="font-medium text-gray-800">Type:</span> {client.clientType}</p>
                <p><span className="font-medium text-gray-800">Priority:</span> {client.priorityLevel}</p>
                <p><span className="font-medium text-gray-800">Country:</span> {client.countryName}</p>
            </div>

            {userRole === 'Admin' && (
                <div className="client-actions mt-auto border-t pt-3 flex flex-col gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowActions(!showActions);
                        }}
                        className="w-full py-2 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                        {showActions ? 'Close Actions' : 'Change Status'}
                    </button>

                    {showActions && (
                        <div className="flex flex-wrap gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={(e) => handleStatusChange(e, 'ACTIVE')}
                                disabled={client.status === 'ACTIVE' || loading}
                                className="btn-active px-3 py-1.5 rounded text-xs font-medium text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Set Active
                            </button>
                            <button
                                onClick={(e) => handleStatusChange(e, 'INACTIVE')}
                                disabled={client.status === 'INACTIVE' || loading}
                                className="btn-inactive px-3 py-1.5 rounded text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Set Inactive
                            </button>
                            <button
                                onClick={(e) => handleStatusChange(e, 'ON_HOLD')}
                                disabled={client.status === 'ON_HOLD' || loading}
                                className="btn-hold px-3 py-1.5 rounded text-xs font-medium text-white bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Set On Hold
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ClientCard;
