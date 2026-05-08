import React, { useState } from 'react';
import FilterListbox from '../../../../components/filter/FilterListbox';
import { useNavigate, useLocation } from 'react-router-dom';
import { createAccessPoint } from '../../../../services/accessPointService';
import Button from "../../../../components/Button/Button";
import Navbar from '../../../../components/Navbar/Navbar';
import { showStatusToast } from '../../../../components/toastfy/toast';
import { toast } from 'react-toastify';

const AccessPointForm = () => {
  const [form, setForm] = useState({
    endpoint_path: '',
    method: 'GET',
    module: '',
    is_public: false,
  });
  
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Reusable nav items from AccessPointManagement
  const navItems = [
    {
      name: "Access Points",
      onClick: () => navigate("/user-management/access-points"),
      isActive: location.pathname === "/user-management/access-points",
    },
    {
      name: "Add New",
      onClick: () => navigate("/user-management/access-points/create"),
      isActive: location.pathname === "/user-management/access-points/create",
    },
    {
      name: "Permission Mapping",
      onClick: () =>
        navigate("/user-management/access-points/admin/access-point-mapping"),
      isActive:
        location.pathname ===
        "/user-management/access-points/admin/access-point-mapping",
    },
    {
      name: "Access Point Create Bulk",
      onClick: () => navigate("/user-management/access-points/create-bulk"),
      isActive:
        location.pathname === "/user-management/access-points/create-bulk",
    },
    {
      name: "Access Permission Mapping Bulk",
      onClick: () =>
        navigate(
          "/user-management/access-point-map-permission-bulk"
        ),
      isActive:
        location.pathname ===
        "/user-management/access-point-map-permission-bulk",
    },
  ];

  // Validate endpoint path (should start with / and contain valid URL characters)
  const validateEndpointPath = (path) => {
    const regex = /^\/[a-zA-Z0-9\-_\/{}:]*$/;
    return regex.test(path.trim());
  };

  // Validate module name (letters, spaces, hyphens, underscores)
  const validateModuleName = (name) => {
    const regex = /^[A-Za-z\s\-_]+$/;
    return regex.test(name.trim());
  };

  // Show toast with unique ID to prevent duplicates
  const showUniqueToast = (message, type) => {
    toast.dismiss(); // Dismiss all existing toasts
    showStatusToast(message, type, { toastId: "unique-toast" });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation checks
    if (!form.endpoint_path.trim()) {
      return showUniqueToast("Enter the Endpoint Path", "error");
    }

    if (!form.module.trim()) {
      return showUniqueToast("Enter the Module", "error");
    }

    // Validate endpoint path format
    if (!validateEndpointPath(form.endpoint_path)) {
      return showUniqueToast("Endpoint path must start with '/' and contain only valid URL characters", "error");
    }

    // Validate module name format
    if (!validateModuleName(form.module)) {
      return showUniqueToast("Module name can only contain letters, spaces, hyphens, and underscores", "error");
    }

    setLoading(true);
    
    try {
      // Prepare form data with trimmed values
      const formData = {
        ...form,
        endpoint_path: form.endpoint_path.trim(),
        module: form.module.trim(),
      };

      await createAccessPoint(formData);
      showUniqueToast("Access point created successfully!", "success");
      
      // Navigate after successful creation
      setTimeout(() => {
        navigate('/user-management/access-points');
      }, 1000);
      
    } catch (error) {
      // Show backend error message or fallback
      const errorMessage = error?.response?.data?.detail || 
                          error?.response?.data?.message || 
                          error?.message || 
                          "Failed to create access point";
      showUniqueToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({
      endpoint_path: '',
      method: 'GET',
      module: '',
      is_public: false,
    });
    showUniqueToast("Form reset successfully", "info");
  };

  return (
    <div>
      {/* ✅ Navbar */}
      <Navbar logo="Access Points" navItems={navItems} />

      {/* ✅ Form */}
      <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-md mt-4">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Create Access Point</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Endpoint Path <span className="text-red-500">*</span>
            </label>
            <input
              name="endpoint_path"
              value={form.endpoint_path}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-lg focus:ring focus:ring-blue-300 focus:border-blue-500"
              placeholder="/api/resource (must start with /)"
              onKeyPress={(e) => e.key === 'Enter' && e.preventDefault()}
            />
            <p className="text-sm text-gray-500 mt-1">
              Must start with '/' and contain only valid URL characters (letters, numbers, -, _, /, {}, :)
            </p>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Method <span className="text-red-500">*</span>
            </label>
            <FilterListbox
              options={[
                { value: "GET", label: "GET" },
                { value: "POST", label: "POST" },
                { value: "PUT", label: "PUT" },
                { value: "DELETE", label: "DELETE" },
                { value: "PATCH", label: "PATCH" },
              ]}
              value={form.method}
              onChange={(val) => handleChange({ target: { name: "method", value: val } })}
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Module <span className="text-red-500">*</span>
            </label>
            <input
              name="module"
              value={form.module}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-lg focus:ring focus:ring-blue-300 focus:border-blue-500"
              placeholder="Auth Management"
              onKeyPress={(e) => e.key === 'Enter' && e.preventDefault()}
            />
            <p className="text-sm text-gray-500 mt-1">
              Can contain letters, spaces, hyphens, and underscores only
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="is_public"
              checked={form.is_public}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              id="is_public"
            />
            <label htmlFor="is_public" className="text-gray-700 font-medium cursor-pointer">
              Public Access Point
            </label>
          </div>
          
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <strong>Note:</strong> Public access points don't require authentication. 
            Use this carefully for endpoints that should be accessible without login.
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className={`flex-1 py-2 px-4 rounded-lg transition duration-300 ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </div>
              ) : (
                'Create Access Point'
              )}
            </Button>
            
            <Button
              type="button"
              onClick={handleReset}
              disabled={loading}
              variant="secondary"
              className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition duration-300 disabled:bg-gray-300"
            >
              Reset Form
            </Button>
          </div>
        </form>

        {/* ✅ Form Summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-800 mb-2">Preview:</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p><strong>Endpoint:</strong> {form.endpoint_path || 'Not set'}</p>
            <p><strong>Method:</strong> {form.method}</p>
            <p><strong>Module:</strong> {form.module || 'Not set'}</p>
            <p><strong>Access:</strong> {form.is_public ? 'Public' : 'Private'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessPointForm;