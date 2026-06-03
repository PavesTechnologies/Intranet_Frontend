import React from 'react';
import DemandCardRow from './DemandCardRow';

const DemandList = ({ demands, onViewDetail, onEdit, onDelete, onApprove, onReject, onFulfill, onRMReject, decisionState, activeTab, viewerRole }) => {
    return (
        <div className="flex flex-col bg-white">
            {demands.map((demand) => (
                <DemandCardRow
                    key={demand.id}
                    demand={demand}
                    onView={onViewDetail}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onApprove={onApprove}
                    onReject={onReject}
                    onFulfill={onFulfill}
                    onRMReject={onRMReject}
                    decisionState={decisionState}
                    activeTab={activeTab}
                    viewerRole={viewerRole}
                />
            ))}
        </div>
    );
};

export default DemandList;
