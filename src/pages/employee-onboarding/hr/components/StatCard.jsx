export default function StatCard({ title, value, icon: Icon, onClick, isActive, iconBg = "bg-indigo-50", iconColor = "text-indigo-600" }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white flex-1 min-w-[140px] px-4 py-3.5 rounded-xl flex items-center gap-3.5
                  transition-all duration-200 cursor-pointer ${
        isActive
          ? "border-[1.5px] border-indigo-500 shadow-md ring-1 ring-indigo-500/10"
          : "border border-gray-200 shadow-sm hover:border-gray-300 hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex flex-col min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5 truncate">
          {title}
        </p>
        <p className="text-xl font-bold text-gray-900 leading-none">
          {value}
        </p>
      </div>
    </div>
  );
}
