import Button from "../../../../components/Button/Button";

export default function SectionTabs() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="h-10 w-1.5 rounded-full bg-indigo-600" />
        <div>
          <Button
            variant="link"
            size="medium"
            className="px-0 py-0 text-xl font-semibold text-indigo-600 hover:no-underline"
          >
            Headcount by Demographics
          </Button>
          <p className="mt-1 text-sm text-slate-500">
            Review workforce distribution across key demographic dimensions.
          </p>
        </div>
      </div>
    </div>
  );
}
