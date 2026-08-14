import React, { useState } from 'react';
import Button from "../../../components/Button/Button";

const ReviewModal = ({ isOpen, onClose, request, onApprove, onReject }) => {
  const [rejectionReason, setRejectionReason] = useState('');

  if (!isOpen) return null;

  const handleReject = () => {
    if (!rejectionReason) {
      alert('Rejection reason is required.');
      return;
    }
    onReject(request.id, rejectionReason);
    setRejectionReason('');
  };

  const handleApprove = () => {
    onApprove(request.id);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">Review Request: {request.type}</h3>

        <div className="space-y-4 text-sm">
            <div><strong className="text-gray-600">Request ID:</strong> {request.id}</div>
            <div><strong className="text-gray-600">Submitted By:</strong> {request.submittedBy}</div>
            <div><strong className="text-gray-600">Submitted On:</strong> {request.submittedOn}</div>
            <div className="p-2 bg-gray-100 rounded"><strong className="text-gray-600">Details:</strong> {request.details}</div>
            <div className="p-2 bg-gray-100 rounded"><strong className="text-gray-600">Reason:</strong> {request.reason}</div>
        </div>

        <div className="mt-6">
            <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700">Rejection Reason (if rejecting)</label>
            <textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows="3"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            ></textarea>
        </div>


        <div className="mt-6 flex justify-end space-x-4">
          <Button onClick={onClose} variant="outline" className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</Button>
          <Button onClick={handleReject} variant="danger" className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300" disabled={!rejectionReason}>Reject</Button>
          <Button onClick={handleApprove} variant="primary" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Approve</Button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;