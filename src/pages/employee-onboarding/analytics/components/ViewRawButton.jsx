import Button from "../../../../components/Button/Button";

export default function ViewRawButton({ onClick }) {
  return (
    <Button
      onClick={onClick}
      variant="primary"
      size="small"
    >
      View Raw Data
    </Button>
  );
}
