export default function StatCard({ title, value, icon: Icon, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white p-4 rounded-xl border border-black/20 shadow-sm 
                 flex gap-4 transition-all duration-300 
                 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
    >
      <Icon className="text-indigo-600" />
      <div>
        <p className="text-sm text-gray-500">
          {title}
        </p>
        <p className="text-xl font-semibold text-gray-900">
          {value}
        </p>
      </div>
    </div>
  );
}
