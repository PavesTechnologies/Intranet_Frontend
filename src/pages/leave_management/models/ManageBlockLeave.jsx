import { useParams } from "react-router-dom";
import BlockLeaveSection from "./BlockLeaveSection";

export default function ManageBlockLeave() {
    const { employeeId } = useParams();
    // console.log("Employee ID from params:", employeeId);
    return (
        <div className="w-full mt-2">
            <BlockLeaveSection employeeId={employeeId} />
        </div>
    );
}