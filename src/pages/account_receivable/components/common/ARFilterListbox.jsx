import FilterListbox from "../../../../components/filter/FilterListbox";

const FILTER_BUTTON_CLASS =
  "relative h-9 w-full cursor-default rounded-lg border border-gray-300 bg-white pl-3 pr-8 text-left text-[13px] text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

export default function ARFilterListbox(props) {
  return <FilterListbox {...props} buttonClassName={FILTER_BUTTON_CLASS} />;
}
