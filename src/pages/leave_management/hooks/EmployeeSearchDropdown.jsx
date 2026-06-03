import React, { useState, useEffect } from "react";
import Select from "react-select";
import api from "../../../api/axiosInstance";
import debounce from "lodash.debounce";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;

const EmployeeSearchDropdown = ({ value, onChange }) => {
  const [options, setOptions] = useState([]);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [hasMore, setHasMore] = useState(true);

  const fetchEmployees = async (searchText, pageNo, append = false) => {
    try {
      const res = await api.get(`${BASE_URL}/api/employees/search`, {
        params: { search: searchText, page: pageNo },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = res.data.data || []; // Fallback to empty array

      const formatted = data.map((emp) => ({
        value: emp.employeeId,
        label: `${emp.name} (${emp.employeeId})`,
      }));

      setOptions((prev) => (append ? [...prev, ...formatted] : formatted));
      setHasMore(data.length === 10);
    } catch (err) {
      console.error("API Error:", err);
    }
  };

  // 1. Stable debounced function
  const debouncedSearch = useCallback(
    debounce((input) => {
      fetchEmployees(input, 0, false);
      setPage(0);
    }, 500),
    [],
  );

  useEffect(() => {
    fetchEmployees("", 0);
  }, []);

  const handleInputChange = (inputValue, { action }) => {
    if (action === "input-change") {
      setSearch(inputValue);
      debouncedSearch(inputValue);
    }
  };

  const handleMenuScrollToBottom = () => {
    if (!hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEmployees(search, nextPage, true);
  };

  return (
    <Select
      // Ensure we find the object in options so it shows as "selected"
      value={options.find((o) => String(o.value) === String(value)) || null}
      onChange={(selected) => onChange(selected?.value)}
      onInputChange={handleInputChange}
      options={options}
      placeholder="Search employee..."
      onMenuScrollToBottom={handleMenuScrollToBottom}
      isClearable
      // Optional: adds a loading state while typing
      isLoading={false}
    />
  );
};

export default EmployeeSearchDropdown;
