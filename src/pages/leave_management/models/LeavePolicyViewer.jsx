import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/Button/Button";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";

/* =========================
   Leave Type Card
========================= */
const LeaveTypeCard = ({ leaveData }) => {
  if (!leaveData) return null;

  const { title, desc, desc1, createdAt } = leaveData;
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleSection = (index) => {
    setActiveIndex((prev) => (prev === index ? null : index));
  };

  /* =========================
     GROUP CONTENT BY HEADINGS
     (Fixes mixing issue)
  ========================= */
  const groupContentByHeading = (blocks) => {
    const sections = [];
    let currentSection = null;

    blocks.forEach((block) => {
      if (block.type === "heading") {
        if (currentSection) sections.push(currentSection);
        currentSection = { heading: block, content: [] };
      } else if (currentSection) {
        currentSection.content.push(block);
      }
    });

    if (currentSection) sections.push(currentSection);
    return sections;
  };

  /* =========================
     RENDER DESC1 (TOP SECTION)
     👉 Simple list (NO accordion)
  ========================= */
  const renderDesc1 = (blocks) => {
    if (!blocks || !Array.isArray(blocks)) return null;

    return blocks.map((block, idx) => {
      if (block.type === "list") {
        return (
          <ul
            key={idx}
            className="list-disc list-inside mb-4 text-gray-700 space-y-1 bg-blue-50 p-3 rounded-md"
          >
            {block.children.map((item, j) => (
              <li key={j}>
                {item.children.map((child) => child.text).join("")}
              </li>
            ))}
          </ul>
        );
      }
      return null;
    });
  };

  /* =========================
     RENDER NORMAL CONTENT
  ========================= */
  const renderNestedContent = (content) => {
    return content.map((block, idx) => {
      if (block.type === "paragraph") {
        const text = block.children.map((child) => child.text).join("");
        return (
          <p key={idx} className="mb-3 text-gray-700">
            {text}
          </p>
        );
      }

      if (block.type === "list") {
        return (
          <ul
            key={idx}
            className="list-disc list-inside mb-3 ml-3 text-gray-700 space-y-1"
          >
            {block.children.map((item, j) => (
              <li key={j}>
                {item.children.map((child) => child.text).join("")}
              </li>
            ))}
          </ul>
        );
      }

      return null;
    });
  };

  /* =========================
     ACCORDION RENDER
  ========================= */
  const renderContent = (blocks) => {
    if (!blocks || !Array.isArray(blocks))
      return <p>No policy content found.</p>;

    const sections = groupContentByHeading(blocks);

    return sections.map((section, index) => {
      const HeadingTag = `h${section.heading.level || 6}`;
      const headingText = section.heading.children
        .map((c) => c.text)
        .join("");

      return (
        <div key={index} className="my-3 border-b border-gray-200">
          <button
            onClick={() => toggleSection(index)}
            className="w-full flex justify-between items-center text-left py-2 px-4 bg-blue-50 hover:bg-blue-100 rounded-md"
          >
            <HeadingTag className="text-blue-800 font-semibold text-sm">
              {headingText}
            </HeadingTag>

            <motion.span
              animate={{ rotate: activeIndex === index ? 90 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronRight className="h-5 w-5 text-blue-600" />
            </motion.span>
          </button>

          <AnimatePresence>
            {activeIndex === index && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="pl-6 mt-3 pb-3 bg-gray-50 rounded-md"
              >
                {renderNestedContent(section.content)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    });
  };

  return (
    <div className="max-w-4xl mx-auto mb-6">
      <PageCard title={title}>
        <PageCardContent className="p-6">
        {/* ✅ DESC1 (TOP - STATIC LIST) */}
        {desc1 && desc1.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              Overview
            </h3>
            {renderDesc1(desc1)}
          </div>
        )}

        {/* ✅ DESC (ACCORDION) */}
        {renderContent(desc)}

        <p className="text-xs text-gray-500 mt-4">
          Created on:{" "}
          {createdAt
            ? new Date(createdAt).toLocaleDateString()
            : "N/A"}
        </p>
        </PageCardContent>
      </PageCard>
    </div>
  );
};

/* =========================
   MAIN COMPONENT
========================= */
export default function LeavePolicyViewer() {
  const [leavePolicies, setLeavePolicies] = useState([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const BASE_URL = `https://lms-cms-k2r1.onrender.com/api/lms-cms`;
  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const response = await axios.get(BASE_URL);

        // ✅ Normalize Strapi data
        const policies = (response.data.data || []).map((item) => ({
          id: item.id,
          title: item.Title,
          desc: item.Desc,
          desc1: item.desc1,
          createdAt: item.createdAt,
        }));

        setLeavePolicies(policies);

        if (policies.length > 0) {
          setSelectedPolicyId(policies[0].id);
        }
      } catch (err) {
        console.error("Error fetching policies:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPolicies();
  }, []);

  if (loading) return <p className="text-center mt-6">Loading...</p>;

  const selectedPolicy = leavePolicies.find(
    (p) => p.id === selectedPolicyId
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Tabs */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-wrap gap-3">
          {leavePolicies.map((policy) => {
            const isActive = policy.id === selectedPolicyId;

            return (
              <div
                key={policy.id}
                onClick={() => setSelectedPolicyId(policy.id)}
                className={`px-3 py-1.5 cursor-pointer rounded-md ${isActive
                    ? "bg-blue-100 text-blue-800"
                    : "hover:bg-gray-200"
                  }`}
              >
                {policy.title}
              </div>
            );
          })}
        </div>

        <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
      </div>

      {/* Content */}
      {selectedPolicy && (
        <LeaveTypeCard leaveData={selectedPolicy} />
      )}
    </div>
  );
}