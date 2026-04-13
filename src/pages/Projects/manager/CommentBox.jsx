"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";

const CommentBox = ({ entityId, entityType, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(false);

  // Create Axios instance *inside useEffect or function* (not at top level)
  const axiosInstance = axios.create({
    baseURL: window.__APP_CONFIG__.PMS_BASE_URL,
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  // Fetch comments
  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(
        `/api/comments/${entityType}/${entityId}`,
      );
      const data = Array.isArray(res.data) ? res.data : [];
      setComments(data);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [entityId, entityType]);

  // Handle submit (new comment or reply)
  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    const payload = {
      content: newComment.trim(),
      userId: currentUser.user_id,
      parentId: replyingTo,
    };

    try {
      await axiosInstance.post(
        `/api/comments/${entityType}/${entityId}`,
        payload,
      );
      setNewComment("");
      setReplyingTo(null);
      fetchComments();
    } catch (error) {
      console.error("Failed to submit comment:", error);
    }
  };

  // Recursive comment rendering
  const renderComments = (parentId = null, level = 0) => {
    return comments
      .filter((comment) => comment.parentId === parentId)
      .map((comment) => (
        <div key={comment.id} className={`ml-${level > 0 ? 6 : 0} mb-3`}>
          <div className="bg-gray-100 p-3 rounded border border-gray-200 shadow-sm">
            <p className="text-sm font-semibold text-gray-700">
              {comment.userName}{" "}
              <span className="text-xs text-gray-400">
                ({new Date(comment.createdAt).toLocaleString()})
              </span>
            </p>
            <p className="text-gray-800 mt-1">{comment.content}</p>

            <button
              className="text-blue-600 text-sm mt-2 hover:underline"
              onClick={() => {
                setReplyingTo(comment.id);
                setNewComment("");
              }}
            >
              Reply
            </button>
          </div>

          {/* Recursive replies */}
          <div className="ml-6 border-l border-gray-300 pl-4 mt-2">
            {renderComments(comment.id, level + 1)}
          </div>
        </div>
      ));
  };

  return (
    <div className="mt-4 text-sm max-w-2xl mx-auto">
      <h2 className="text-base font-semibold mb-3 text-gray-800">Comments</h2>

      {loading ? (
        <p className="text-gray-500">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-gray-500 italic">No comments yet.</p>
      ) : (
        <div>{renderComments()}</div>
      )}

      <div className="mt-5">
        {replyingTo && (
          <p className="text-sm text-gray-500 mb-1">
            Replying to comment #{replyingTo}{" "}
            <button
              onClick={() => setReplyingTo(null)}
              className="ml-2 text-red-400 hover:underline text-xs"
            >
              Cancel
            </button>
          </p>
        )}

        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          rows={3}
        />

        <button
          onClick={handleSubmit}
          className="mt-2 px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          {replyingTo ? "Post Reply" : "Add Comment"}
        </button>
      </div>
    </div>
  );
};

export default CommentBox;
