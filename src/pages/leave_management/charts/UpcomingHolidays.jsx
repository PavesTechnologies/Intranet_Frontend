import React, { useState, useEffect } from "react";
import LoadingSpinner from "../../../components/LoadingSpinner";
import axios from "axios";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AllHolidaysGrid from "./AllHolidaysGrid";

export default function UpcomingHolidays({year}) {
  const today = new Date();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAllHolidays, setShowAllHolidays] = useState(false);

  // const token = localStorage.getItem("token");

  const handleViewHolidays = () => setShowAllHolidays(true);
  const handleHideHolidays = () => setShowAllHolidays(false);

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const res = await axios.get(
          `${window.__APP_CONFIG__.BASE_URL}/api/holidays/year/${year}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        setHolidays(res.data);
      } catch (err) {
        console.error("Error fetching holiday data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHolidays();
  }, [year]);

  // Compute today holiday once
  const todayHoliday = holidays.find(
    (h) => new Date(h.holidayDate).toDateString() === today.toDateString()
  );

  // Upcoming holidays carousel
  const upcoming = holidays
    .filter((h) => new Date(h.holidayDate) >= today)
    .sort((a, b) => new Date(a.holidayDate) - new Date(b.holidayDate));

  const prevHoliday = () =>
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  const nextHoliday = () =>
    setCurrentIndex((prev) => (prev < upcoming.length - 1 ? prev + 1 : prev));

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6 w-[100%] flex justify-center items-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div
      key={currentIndex}
      className="
    shadow-lg rounded-xl p-4 
    w-full sm:w-80 md:w-[28rem] lg:w-full
    flex flex-col 
    transition-all duration-300 
    bg-cover bg-center bg-no-repeat 
    relative overflow-hidden
  "
      // style={{
      //   backgroundImage: getHolidayBackground(
      //     upcoming[currentIndex].holidayName
      //   ),
      // }}
    >
      {/* Header */}
      <div className="flex justify-between items-center ">
        <h3 className="text-xs xs:text-xs font-bold bg-opacity-70 px-2 py-1 rounded">
          {todayHoliday ? "🎉 Today is a Holiday!" : "Upcoming Holidays"}
        </h3>
        <button
          className="text-blue-600 hover:underline text-xs xs:text-xs font-medium bg-opacity-60 px-2 py-1 rounded"
          onClick={() => setShowAllHolidays(true)}
        >
          View Details
        </button>
      </div>

      {/* Today’s Holiday */}
      {todayHoliday ? (
        <div
          key={todayHoliday.id}
          className="text-center  bg-opacity-70 rounded-lg p-3"
        >
          <p className="text-gray-800 font-semibold text-base sm:text-xs">
            {todayHoliday.holidayName}
          </p>
          <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-600 text-xs sm:text-sm font-medium rounded-full">
            {new Date(todayHoliday.holidayDate).toLocaleDateString("en-US", {
              day: "2-digit",
              month: "short",
            })}
          </span>
          {todayHoliday.holidayDescription && (
            <p className="text-gray-600 text-xs xs:text-xs  line-clamp-3">
              {todayHoliday.holidayDescription}
            </p>
          )}
          <p className="mt-3 text-green-500 font-medium text-sm sm:text-base">
            🎉 Enjoy your day off!
          </p>
        </div>
      ) : upcoming.length > 0 ? (
        /* Upcoming Holidays Carousel */
        <div className="flex items-center justify-between w-full  sm:mt-3">
          <button
            onClick={prevHoliday}
            disabled={currentIndex === 0}
            className={`p-2 rounded-full transition 
          ${
            currentIndex === 0
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-600 hover:bg-blue-50 hover:text-blue-500"
          }`}
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <div className="flex-1 text-center px-2 sm:px-4  bg-opacity-70 rounded-lg py-3">
            <p className="text-gray-800 font-semibold text-sm sm:text-base">
              {upcoming[currentIndex].holidayName}
            </p>
            <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-600 text-xs sm:text-sm font-medium rounded-full">
              {new Date(upcoming[currentIndex].holidayDate).toLocaleDateString(
                "en-US",
                { day: "2-digit", month: "short" }
              )}
            </span>
            {upcoming[currentIndex].holidayDescription && (
              <p className="text-gray-600 text-xs sm:text-sm mt-2 line-clamp-3">
                {upcoming[currentIndex].holidayDescription}
              </p>
            )}
          </div>

          <button
            onClick={nextHoliday}
            disabled={currentIndex === upcoming.length - 1}
            className={`p-2 rounded-full transition 
          ${
            currentIndex === upcoming.length - 1
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-600 hover:bg-blue-50 hover:text-blue-500"
          }`}
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      ) : (
        <p className="text-gray-500 text-sm sm:text-base text-center bg-white bg-opacity-70 rounded-lg p-3 mt-2">
          No upcoming holidays.
        </p>
      )}

      {/* All Holidays Modal */}
      {showAllHolidays && (
        <AllHolidaysGrid
          holidays={holidays}
          onClose={() => setShowAllHolidays(false)}
        />
      )}
    </div>
  );
}

// 🧠 AI-like background image chooser
function getHolidayBackground(holidayName) {
  const lower = holidayName.toLowerCase();

  if (lower.includes("diwali"))
    return "url('https://images.unsplash.com/photo-1603791440384-56cd371ee9a7?auto=format&fit=crop&w=800&q=60')";
  if (lower.includes("christmas Day"))
    return "url('https://images.unsplash.com/photo-1608889175150-9ef0d4b4e4be?auto=format&fit=crop&w=800&q=60')";
  if (lower.includes("new year"))
    return "url('https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=60')";
  if (lower.includes("Independence"))
    return "url('https://images.unsplash.com/photo-1595854341625-f33ee10dbf9d?auto=format&fit=crop&w=800&q=60')";
  if (lower.includes("republic"))
    return "url('https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=800&q=60')";
  if (lower.includes("eid"))
    return "url('https://images.unsplash.com/photo-1598887142485-4f22e9c8e9cb?auto=format&fit=crop&w=800&q=60')";
  if (lower.includes("pongal") || lower.includes("makar sankranti"))
    return "url('https://images.unsplash.com/photo-1673863664244-5f3b884b8ee7?auto=format&fit=crop&w=800&q=60')";
  if (lower.includes("holi"))
    return "url('https://images.unsplash.com/photo-1527766833261-b09c3163a791?auto=format&fit=crop&w=800&q=60')";
  if (lower.includes("Good Friday"))
    return "url('https://images.unsplash.com/photo-1558547724-2c4a46c7d4d4?auto=format&fit=crop&w=800&q=60')";
  if (lower.includes("ganesh"))
    return "url('https://images.unsplash.com/photo-1597167106573-8d3eab06d4b5?auto=format&fit=crop&w=800&q=60')";

  // Default fallback: abstract festive background
  return "url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=60')";
}

// const getHolidayBackground = (holidayName) => {
//   if (!holidayName)
//     return "url('https://images.unsplash.com/photo-1503264116251-35a269479413')";

//   // Encode the name for use in URL (e.g. "New Year" -> "new%20year")
//   const query = encodeURIComponent(
//     `${holidayName} celebration festival scenic`
//   );

//   // Use Unsplash Source API to fetch a relevant random image
//   return `url('https://source.unsplash.com/600x400/?${query}')`;
// };

/* All Holidays Grid Component */
// function AllHolidaysGrid({ holidays, onClose }) {
//   const today = new Date();

//   // Sort holidays from earliest to latest
//   const sortedHolidays = [...holidays].sort(
//     (a, b) => new Date(a.holidayDate) - new Date(b.holidayDate)
//   );

//   useEffect(() => {
//     const handleEsc = (event) => {
//       if (event.key === "Escape") {
//         onClose(); // Close when Esc pressed
//       }
//     };

//     window.addEventListener("keydown", handleEsc);
//     return () => window.removeEventListener("keydown", handleEsc);
//   }, [onClose]);

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start p-6 overflow-auto z-50">
//       <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6 relative">
//         {/* Close button */}
//         <button
//           onClick={onClose}
//           className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 font-bold text-lg"
//         >
//           ✕
//         </button>

//         <h2 className="text-lg text-start font-bold mb-6 text-gray-800">
//           All Holidays
//         </h2>

//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
//           {sortedHolidays.map((holiday) => {
//             const holidayDate = new Date(holiday.holidayDate);
//             const isPast = holidayDate < today;
//             const isToday = holidayDate.toDateString() === today.toDateString();

//             return (
//               <div
//                 key={holiday.id}
//                 className={`relative rounded-xl shadow-md p-5 flex flex-col bg-cover bg-center text-white`}
//                 style={{
//                   backgroundImage: getHolidayBackground(holiday.holidayName),
//                   backgroundBlendMode: "overlay",
//                   backgroundColor:
//                     isPast && !isToday
//                       ? "rgba(128,128,128,0.6)"
//                       : "rgba(0,0,0,0.3)",
//                 }}
//               >
//                 <div className="relative z-20 flex flex-col justify-between h-full">
//                   <p className="font-semibold text-lg">{holiday.holidayName}</p>

//                   <span
//                     className={`inline-block mt-3 px-3 py-1 text-xs font-medium rounded-full ${
//                       isToday
//                         ? "bg-green-100 text-green-800"
//                         : "bg-white/70 text-blue-700"
//                     }`}
//                   >
//                     {holidayDate.toLocaleDateString("en-US", {
//                       day: "2-digit",
//                       month: "short",
//                       year: "numeric",
//                     })}
//                   </span>

//                   {holiday.holidayDescription && (
//                     <p className="text-white text-sm mt-2 line-clamp-3 drop-shadow">
//                       {holiday.holidayDescription}
//                     </p>
//                   )}

//                   {isToday && (
//                     <p className="mt-2 text-green-300 font-semibold drop-shadow">
//                       🎉 Today!
//                     </p>
//                   )}
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       </div>
//     </div>
//   );
// }
