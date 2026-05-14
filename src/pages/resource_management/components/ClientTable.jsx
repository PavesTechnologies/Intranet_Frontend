import React from 'react';
import ClientStatusControl from './ClientStatusControl';
import GenericTable from '../../../components/Table/table';

const ClientTable = ({ clients, onClientUpdate }) => {
    return (
        <div className="client-table overflow-x-auto bg-white rounded-xl shadow-sm border no-scrollbar">
            <GenericTable
                headers={["Client Name", "Type", "Priority", "Country", "Status"]}
                columns={["clientName", "clientType", "priorityLevel", "countryName", "status_info"]}
                rows={clients.map((client) => ({
                    ...client,
                    status_info: (
                        <ClientStatusControl
                            client={client}
                            onStatusUpdate={onClientUpdate}
                        />
                    )
                }))}
            />
        </div>
    );
};

export default ClientTable;
