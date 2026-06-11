// src/pages/EditUserHr.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../api/axiosInstance";

export default function EditUserHr() {
  const { user_id } = useParams();
  const [form, setForm] = useState({});
  const navigate = useNavigate();

  useEffect(() => {


    api
      .get(
        `${
          window.__APP_CONFIG__.USER_MANAGEMENT_URL
        }/general_user/edit-user/${user_id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      )
      .then((res) => setForm(res.data))
      .catch(() => {
        alert("Unauthorized or user not found");
        navigate("/home");
      });
  }, [user_id, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async () => {


    try {
      await api.put(
        `${
          window.__APP_CONFIG__.USER_MANAGEMENT_URL
        }/general_user/edit-user/${user_id}`,
        form,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      alert("User updated successfully");
      navigate("/home");
    } catch (err) {
      alert("Update failed: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 shadow-lg rounded-2xl w-full max-w-lg">
        <h2 className="text-2xl font-bold text-center text-blue-700 mb-6">
          Edit User
        </h2>

        <div className="space-y-4">
          <input
            name="first_name"
            value={form.first_name || ""}
            onChange={handleChange}
            placeholder="First Name"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="last_name"
            value={form.last_name || ""}
            onChange={handleChange}
            placeholder="Last Name"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="contact"
            value={form.contact || ""}
            onChange={handleChange}
            placeholder="Contact Number"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active || false}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <span>Active</span>
          </label>
        </div>

        <button
          onClick={handleSubmit}
          className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
