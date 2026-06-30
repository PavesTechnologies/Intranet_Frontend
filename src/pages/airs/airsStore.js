import { create } from "zustand";
import { MOCK_JDS, MOCK_CAMPAIGNS } from "./mockData";

// Sync utility with LocalStorage
const getStoredData = (key, defaultValue) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const setStoredData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    // Ignore storage quota errors
  }
};

export const useAirsStore = create((set, get) => ({
  jds: getStoredData("airs_jds", MOCK_JDS),
  campaigns: getStoredData("airs_campaigns", MOCK_CAMPAIGNS),
  recentActivities: getStoredData("airs_activities", [
    { id: 1, type: "parse_success", text: "JD for Senior React Engineer parsed successfully.", date: "2026-06-30 14:15", user: "AIRS Parser Engine" },
    { id: 2, type: "skill_verified", text: "Sarah Connor verified mandatory skill 'Spring Boot' on JD-0002.", date: "2026-06-30 11:30", user: "Sarah Connor" },
    { id: 3, type: "campaign_linked", text: "Campaign 'High-Priority React Core Team' linked to JD-0001.", date: "2026-06-29 16:45", user: "John Doe" },
    { id: 4, type: "version_restore", text: "John Doe restored JD-0003 to Version 2.", date: "2026-06-29 09:15", user: "John Doe" },
    { id: 5, type: "parse_failed", text: "Parser Alert: Failed to parse JD-0013. Incorrect file structure.", date: "2026-06-28 15:20", user: "AIRS Parser Engine" }
  ]),

  addActivity: (activity) => {
    const newActivity = {
      id: Date.now(),
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      user: "Current User",
      ...activity
    };
    set(state => {
      const updated = [newActivity, ...state.recentActivities].slice(0, 20); // Keep last 20
      setStoredData("airs_activities", updated);
      return { recentActivities: updated };
    });
  },

  addJd: (newJd) => {
    set(state => {
      const updated = [newJd, ...state.jds];
      setStoredData("airs_jds", updated);
      return { jds: updated };
    });
    get().addActivity({
      type: "jd_created",
      text: `Created new Job Description: '${newJd.title}' (${newJd.id}).`
    });
  },

  updateJd: (id, updatedFields) => {
    set(state => {
      const updated = state.jds.map(jd => {
        if (jd.id === id) {
          const newJd = { ...jd, ...updatedFields, updatedDate: new Date().toISOString().split('T')[0] };
          return newJd;
        }
        return jd;
      });
      setStoredData("airs_jds", updated);
      return { jds: updated };
    });
  },

  deleteJd: (id) => {
    const title = get().jds.find(j => j.id === id)?.title || id;
    set(state => {
      const updated = state.jds.filter(jd => jd.id !== id);
      setStoredData("airs_jds", updated);
      return { jds: updated };
    });
    get().addActivity({
      type: "jd_deleted",
      text: `Deleted Job Description: '${title}' (${id}).`
    });
  },

  closeJd: (id) => {
    const title = get().jds.find(j => j.id === id)?.title || id;
    set(state => {
      const updated = state.jds.map(jd => {
        if (jd.id === id) {
          return { ...jd, status: "Closed", campaignCount: 0, updatedDate: new Date().toISOString().split('T')[0] };
        }
        return jd;
      });
      setStoredData("airs_jds", updated);
      return { jds: updated };
    });
    get().addActivity({
      type: "jd_closed",
      text: `Closed Job Description: '${title}' (${id}).`
    });
  },

  addJdVersion: (id, newFields, changesSummary) => {
    set(state => {
      const updated = state.jds.map(jd => {
        if (jd.id === id) {
          // Backup current version in history
          const historyEntry = {
            version: jd.version,
            title: jd.title,
            updatedDate: jd.updatedDate || jd.createdDate,
            updatedBy: jd.createdBy || "Current User",
            changesSummary: changesSummary || `Archived version ${jd.version}`,
            experience: jd.experience,
            education: jd.education,
            jurisdiction: jd.jurisdiction,
            rawText: jd.rawText,
            skills: JSON.parse(JSON.stringify(jd.skills))
          };

          const nextVersion = jd.version + 1;
          const updatedDate = new Date().toISOString().split('T')[0];
          
          const newJd = {
            ...jd,
            ...newFields,
            version: nextVersion,
            updatedDate,
            history: [historyEntry, ...(jd.history || [])],
            auditTimeline: [
              {
                event: "Version Created",
                date: updatedDate,
                user: "Current User",
                description: `Created Version ${nextVersion}: ${changesSummary}`
              },
              ...(jd.auditTimeline || [])
            ]
          };
          return newJd;
        }
        return jd;
      });
      setStoredData("airs_jds", updated);
      return { jds: updated };
    });
    
    const jdTitle = get().jds.find(j => j.id === id)?.title || id;
    get().addActivity({
      type: "version_created",
      text: `Created new version for '${jdTitle}': Version ${get().jds.find(j => j.id === id)?.version || 2}`
    });
  },

  restoreJdVersion: (id, targetVersionNumber) => {
    set(state => {
      const updated = state.jds.map(jd => {
        if (jd.id === id) {
          const historical = jd.history.find(h => h.version === targetVersionNumber);
          if (!historical) return jd;

          // Backup current state before restoring
          const currentBackup = {
            version: jd.version,
            title: jd.title,
            updatedDate: jd.updatedDate || jd.createdDate,
            updatedBy: jd.createdBy || "Current User",
            changesSummary: `Backup before restoring v${targetVersionNumber}`,
            experience: jd.experience,
            education: jd.education,
            jurisdiction: jd.jurisdiction,
            rawText: jd.rawText,
            skills: JSON.parse(JSON.stringify(jd.skills))
          };

          const updatedDate = new Date().toISOString().split('T')[0];
          const newHistory = jd.history.filter(h => h.version !== targetVersionNumber);

          const restoredJd = {
            ...jd,
            title: historical.title,
            experience: historical.experience,
            education: historical.education,
            jurisdiction: historical.jurisdiction,
            rawText: historical.rawText,
            skills: historical.skills,
            version: targetVersionNumber,
            updatedDate,
            history: [currentBackup, ...newHistory],
            auditTimeline: [
              {
                event: "Version Restored",
                date: updatedDate,
                user: "Current User",
                description: `Restored back to state from Version ${targetVersionNumber}.`
              },
              ...(jd.auditTimeline || [])
            ]
          };

          return restoredJd;
        }
        return jd;
      });
      setStoredData("airs_jds", updated);
      return { jds: updated };
    });

    const jdTitle = get().jds.find(j => j.id === id)?.title || id;
    get().addActivity({
      type: "version_restore",
      text: `Restored '${jdTitle}' to version ${targetVersionNumber}.`
    });
  },

  addCampaign: (newCampaign) => {
    set(state => {
      const updated = [newCampaign, ...state.campaigns];
      setStoredData("airs_campaigns", updated);
      return { campaigns: updated };
    });
    get().addActivity({
      type: "campaign_created",
      text: `Created new recruitment campaign: '${newCampaign.name}'.`
    });
  },

  linkCampaignToJd: (jdId, campaignId) => {
    const campaign = get().campaigns.find(c => c.id === campaignId);
    const jd = get().jds.find(j => j.id === jdId);
    if (!campaign || !jd) return;

    set(state => {
      const updatedJds = state.jds.map(j => {
        if (j.id === jdId) {
          const updatedCount = j.campaignCount + 1;
          const updatedDate = new Date().toISOString().split('T')[0];
          return {
            ...j,
            campaignCount: updatedCount,
            updatedDate,
            auditTimeline: [
              {
                event: "Campaign Linked",
                date: updatedDate,
                user: "Current User",
                description: `Linked to recruitment campaign: '${campaign.name}' (${campaignId}).`
              },
              ...(j.auditTimeline || [])
            ]
          };
        }
        return j;
      });
      setStoredData("airs_jds", updatedJds);
      return { jds: updatedJds };
    });

    get().addActivity({
      type: "campaign_linked",
      text: `Linked campaign '${campaign.name}' to Job Description '${jd.title}'.`
    });
  }
}));
