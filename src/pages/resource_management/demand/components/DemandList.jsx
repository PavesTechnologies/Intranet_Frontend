import React from 'react';
import DemandCardRow from './DemandCardRow';

const DemandList = ({ demands, onViewDetail, onEdit, onApprove, onReject, decisionState, activeTab, viewerRole }) => {
    return (
        <div className="flex flex-col bg-white">
            {demands.map((demand) => (
                <DemandCardRow
                    key={demand.id}
                    demand={demand}
                    onView={onViewDetail}
                    onEdit={onEdit}
                    onApprove={onApprove}
                    onReject={onReject}
                    decisionState={decisionState}
                    activeTab={activeTab}
                    viewerRole={viewerRole}
                />
            ))}
        </div>
    );
};

export default DemandList;
