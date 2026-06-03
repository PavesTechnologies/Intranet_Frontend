import React, { useState, useEffect } from "react";
import api from "../../../api/axiosInstance";

// Get token from localStorage (or wherever you store it)
const token = localStorage.getItem("token");

const CommentBox = ({ entityId, entityType, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(false);

  // Create Axios instance with Authorization header
  const axiosInstance = api.create({
    baseURL: window.__APP_CONFIG__.PMS_BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Fetch comments from backend
  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(
        `/api/comments/${entityType}/${entityId}`,
      );
      const data = response.data;

      if (Array.isArray(data)) {
        setComments(data);
      } else {
        console.error("Invalid comments data format:", data);
        setComments([]);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [entityId, entityType]);

  // Submit comment or reply
  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    const userId = currentUser.user_id;
    console.log("Submitting comment:", {
      content: newComment,
      userId,
      parentId: replyingTo,
    });

    const payload = {
      content: newComment,
      userId: userId,
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

  // Recursive rendering of comments and replies
  const renderComments = (parentId = null) => {
    return comments
      .filter((comment) => comment.parentId === parentId)
      .map((comment) => (
        <div
          key={comment.id}
          className={`ml-${parentId ? 6 : 0} mb-3 border-l pl-4`}
        >
          <div className="bg-gray-100 p-3 rounded">
            <p className="text-sm text-gray-600 font-semibold">
              {comment.userName}{" "}
              <span className="text-xs text-gray-400">
                ({new Date(comment.createdAt).toLocaleString()})
              </span>
            </p>
            <p className="text-gray-800">{comment.content}</p>
            <button
              className="text-blue-500 text-sm mt-1 hover:underline"
              onClick={() => {
                setReplyingTo(comment.id);
                setNewComment("");
              }}
            >
              Reply
            </button>
          </div>
          {renderComments(comment.id)}
        </div>
      ));
  };

  return (
    <div className="mt-4 text-sm">
      <h2 className="text-base font-semibold mb-2">Comments</h2>

      {loading ? (
        <p className="text-gray-500">Loading comments...</p>
      ) : (
        <div>{renderComments()}</div>
      )}

      <div className="mt-4">
        {replyingTo && (
          <p className="text-sm text-gray-500 mb-1">
            Replying to comment #{replyingTo}
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
          className="w-full border border-gray-300 rounded p-2"
          rows={3}
        />

        <button
          onClick={handleSubmit}
          className="mt-2 px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {replyingTo ? "Post Reply" : "Add Comment"}
        </button>
      </div>
    </div>
  );
};

export default CommentBox;
