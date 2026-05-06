import React from 'react';
import ClientStatusControl from './ClientStatusControl';

const ClientTable = ({ clients, onClientUpdate }) => {
    const columns = [
        { header: 'Client Name', accessor: 'clientName' },
        { header: 'Type', accessor: 'clientType' },
        { header: 'Priority', accessor: 'priorityLevel' },
        { header: 'Country', accessor: 'countryName' },
        {
            header: 'Status',
            accessor: 'status',
            Cell: ({ row }) => (
                <ClientStatusControl
                    client={row}
                    onStatusUpdate={onClientUpdate}
                />
            )
        },
    ];

    return (
        <div className="client-table overflow-x-auto bg-white rounded-xl shadow-sm border">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {columns.map(col => (
                            <th
                                key={col.header}
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {clients.map(client => (
                        <tr key={client.clientId} className="hover:bg-gray-50 transition-colors">
                            {columns.map(col => (
                                <td key={col.header} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {col.Cell ? col.Cell({ row: client }) : client[col.accessor]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ClientTable;
