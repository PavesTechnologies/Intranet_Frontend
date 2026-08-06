import React from "react";
import Searchbar from "../../../../components/filter/Searchbar";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { EXCEPTION_TYPE_OPTIONS } from "../../constants/exceptionTypes";

const TYPE_OPTIONS = [{ value: "All", label: "All Exception Types" }, ...EXCEPTION_TYPE_OPTIONS];

const ExceptionFilterPanel = ({ search, onSearchChange, type, onTypeChange }) => (
  <div className="flex flex-col gap-3 md:flex-row md:items-center">
    <div className="w-full md:max-w-xs">
      <Searchbar
        value={search}
        onSearch={onSearchChange}
        placeholder="Search invoice # or vendor..."
        delay={300}
      />
    </div>
    <div className="w-full md:w-56">
      <FilterListbox options={TYPE_OPTIONS} value={type} onChange={onTypeChange} />
    </div>
  </div>
);

export default ExceptionFilterPanel;
