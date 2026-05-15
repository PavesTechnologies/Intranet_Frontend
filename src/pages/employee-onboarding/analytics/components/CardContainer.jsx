export default function CardContainer({ children }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
      {children}
    </div>
  );
}
