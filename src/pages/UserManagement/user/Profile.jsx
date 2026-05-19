// src/pages/Profile.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axiosInstance";
import { useAuth } from "../../../contexts/AuthContext";
import Button from "../../../components/Button/Button"; // ✅ global Button

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({});
  const navigate = useNavigate();

  useEffect(() => {

    if (localStorage.getItem("token")) {
      api
        .get(
          `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/general_user/profile`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        )
        .then((res) => {
          setProfile(res.data);
        })
        .catch((err) => {
          console.error("Failed to load profile", err);
        });
    }
  }, []);

  if (!user) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="max-w-xl mx-auto p-6">
      {/* ✅ Back Button (Global) */}
      <Button
        type="button"
        variant="secondary"
        onClick={() => navigate("/dashboard")}
        className="mb-4"
      >
        ← Back
      </Button>

      <div className="bg-white shadow-md border border-gray-200 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-blue-700 mb-6">User Profile</h2>

        <div className="space-y-3 text-gray-700">
          <p>
            <span className="font-semibold">Name:</span> {profile.first_name}{" "}
            {profile.last_name}
          </p>
          <p>
            <span className="font-semibold">Email:</span> {profile.email}
          </p>
          <p>
            <span className="font-semibold">Contact:</span> {profile.contact}
          </p>
          <p>
            <span className="font-semibold">Active:</span>{" "}
            {profile.is_active ? (
              <span className="text-green-600 font-medium">Yes</span>
            ) : (
              <span className="text-red-500 font-medium">No</span>
            )}
          </p>
        </div>

        <Button
          type="button"
          onClick={() => navigate("/profile/edit")}
          className="mt-6 w-full"
        >
          Edit Profile
        </Button>
      </div>
    </div>
  );
}
