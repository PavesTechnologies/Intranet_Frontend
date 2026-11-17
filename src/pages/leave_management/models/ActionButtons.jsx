import React from "react";
import Button from "../../../components/Button/Button";
import { Fonts } from "../../../components/Fonts/Fonts";
import { te } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const ActionButtons = ({ onRequestLeave, onRequestCompOff }) => {
  const navigate = useNavigate();

  return (
    <div className="flex  text-xs flex-col sm:flex-row gap-2">
      <Button
        onClick={onRequestLeave}
        variant="primary"
        size="small"
      // className="w-full sm:w-auto text-xs"
      >
        Request Leave
      </Button>

      <Button onClick={onRequestCompOff} variant="secondary" size="small">
        Request Compensatory Off
      </Button>

      {/* <a href="#" className={Fonts.link}>Leave Policy Explanation</a> */}

      {/* <Button
        variant="link"
        size="small"
      >
        Leave Policy Explanation
      </Button> */}
    </div>
  );
};

export default ActionButtons;
