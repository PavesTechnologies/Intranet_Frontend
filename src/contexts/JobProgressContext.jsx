import React, { createContext, useContext, useState } from 'react';

const JobProgressContext = createContext(null);

export const JobProgressProvider = ({ children }) => {
    const [activeJobId, setActiveJobId] = useState(null);

    const startJob = (jobId) => setActiveJobId(jobId);
    const clearJob = () => setActiveJobId(null);

    return (
        <JobProgressContext.Provider value={{ activeJobId, startJob, clearJob }}>
            {children}
        </JobProgressContext.Provider>
    );
};

export const useJobProgress = () => useContext(JobProgressContext);