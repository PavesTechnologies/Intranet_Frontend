"use client";

import React, { useState, useEffect } from "react";
import api from "../../../api/axiosInstance";
import { showStatusToast } from "../../../components/toastfy/toast";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";

const CommentBox = ({ entityId, entityType, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(false);

  // Edit state
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete state
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // The comment list doesn't currently surface a consistent "owner id" field
  // name from the backend, so check the common spellings defensively. If none
  // is present we can't tell client-side who owns it — fall back to showing
  // the actions anyway; the backend still enforces ownership on PUT/DELETE.
  const currentUserId = currentUser?.user_id ?? currentUser?.id ?? currentUser?.userId;
  const getCommentOwnerId = (comment) =>
    comment.userId ??
    comment.user_id ??
    comment.authorId ??
    comment.author_id ??
    comment.createdBy ??
    comment.userDto?.id ??
    comment.user?.id;
  const isOwnComment = (comment) => {
    const ownerId = getCommentOwnerId(comment);
    if (ownerId == null || currentUserId == null) return true;
    return String(ownerId) === String(currentUserId);
  };
  const wasEdited = (comment) => {
    const updated = comment.updatedAt ?? comment.editedAt ?? comment.modifiedAt;
    if (!updated || !comment.createdAt) return false;
    return new Date(updated).getTime() !== new Date(comment.createdAt).getTime();
  };

  // Create Axios instance *inside useEffect or function* (not at top level)
  const axiosInstance = api.create({
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
      showStatusToast(
        error.response?.data?.message || "Failed to post comment",
        "error",
      );
    }
  };

  // Handle edit
  const handleStartEdit = (comment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
    setReplyingTo(null);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditContent("");
  };

  const handleSaveEdit = async (comment) => {
    const content = editContent.trim();
    if (!content) {
      showStatusToast("Comment cannot be empty", "error");
      return;
    }

    setSavingEdit(true);
    try {
      await axiosInstance.put(`/api/comments/${comment.id}`, { content });
      setEditingCommentId(null);
      setEditContent("");
      fetchComments();
      showStatusToast("Comment updated", "success");
    } catch (error) {
      console.error("Failed to update comment:", error);
      if (error.response?.status === 403) {
        showStatusToast("You can only edit your own comments.", "error");
      } else if (error.response?.status === 404) {
        showStatusToast("This comment no longer exists.", "error");
        fetchComments();
      } else {
        showStatusToast(
          error.response?.data?.message || "Failed to update comment",
          "error",
        );
      }
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle delete
  const handleDeleteClick = (comment) => {
    setCommentToDelete(comment);
    setDeleteConfirmOpen(true);
  };

  const executeDeleteComment = async () => {
    if (!commentToDelete) return;

    setDeleting(true);
    try {
      await axiosInstance.delete(`/api/comments/${commentToDelete.id}`);
      showStatusToast("Comment deleted", "success");
      fetchComments();
    } catch (error) {
      console.error("Failed to delete comment:", error);
      if (error.response?.status === 403) {
        showStatusToast("You can only delete your own comments.", "error");
      } else if (error.response?.status === 404) {
        showStatusToast("This comment was already deleted.", "error");
        fetchComments();
      } else {
        showStatusToast(
          error.response?.data?.message || "Failed to delete comment",
          "error",
        );
      }
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setCommentToDelete(null);
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
            {editingCommentId === comment.id ? (
              <div className="mt-1">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  rows={2}
                  autoFocus
                />
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    onClick={() => handleSaveEdit(comment)}
                    disabled={savingEdit}
                    className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingEdit ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={savingEdit}
                    className="px-3 py-1 text-xs font-medium text-gray-600 hover:underline disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-800 mt-1">
                {comment.content}
                {wasEdited(comment) && (
                  <span className="ml-1.5 text-xs text-gray-400 italic">(edited)</span>
                )}
              </p>
            )}

            {editingCommentId !== comment.id && (
              <div className="flex items-center gap-3 mt-2">
                <button
                  className="text-blue-600 text-sm hover:underline"
                  onClick={() => {
                    setReplyingTo(comment.id);
                    setNewComment("");
                    setEditingCommentId(null);
                  }}
                >
                  Reply
                </button>
                {isOwnComment(comment) && (
                  <>
                    <button
                      className="text-gray-500 text-sm hover:underline"
                      onClick={() => handleStartEdit(comment)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-500 text-sm hover:underline"
                      onClick={() => handleDeleteClick(comment)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}
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

      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        onConfirm={executeDeleteComment}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setCommentToDelete(null);
        }}
        isLoading={deleting}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default CommentBox;
