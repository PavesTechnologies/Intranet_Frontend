import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { FaSearch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import debounce from "lodash.debounce";
import { useAuth } from "../../../contexts/AuthContext"; // for cleaner context use

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth(); // get email, role, token from context

  const fetchResults = useCallback(
    debounce(async (q) => {
      if (q.length > 1) {
        try {
          const token = localStorage.getItem("token");

          const res = await axios.get(
            `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/general_user/search`,
            {
              params: { query: q },
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          setResults(res.data);
        } catch (err) {
          console.error("Search failed:", err);
        }
      } else {
        setResults([]);
      }
    }, 300),
    [],
  );

  useEffect(() => {
    fetchResults(query);
    return fetchResults.cancel;
  }, [query, fetchResults]);

  return (
    <>
      <div className="p-6 max-w-3xl mx-auto">
        {/* Search Bar */}
        <div className="relative mb-6">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Results */}
        <ul className="space-y-4">
          {results.map((u) => (
            <li
              key={u.user_id}
              className="p-4 border border-gray-200 rounded-lg bg-white shadow hover:shadow-md transition"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-blue-700 text-lg">
                    {u.name}
                  </p>
                  <p className="text-sm text-gray-600">{u.email}</p>
                  {u.contact && (
                    <p className="text-sm text-gray-500">📞 {u.contact}</p>
                  )}
                  {!u.is_active && (
                    <p className="text-xs text-red-500 mt-1">Inactive User</p>
                  )}
                </div>
                {u.can_edit && (
                  <button
                    onClick={() => navigate(`/edit-user/${u.user_id}`)}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Edit
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {!results.length && query.length > 1 && (
          <p className="text-center text-gray-500 mt-4">No results found.</p>
        )}
      </div>
    </>
  );
}
