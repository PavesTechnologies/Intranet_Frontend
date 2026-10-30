import { requestOverrideReason } from "../components/overrideReason/requestOverrideReason";

export const OVERRIDE_REASON_REQUIRED = "OVERRIDE_REASON_REQUIRED";

// A stage move against the system's screening outcome (or resolving a HOLD) needs a reason code.
// The server says so with a 422 whose data carries OVERRIDE_REASON_REQUIRED and the codes; this asks
// the person for one and sends the move again with it. `send(code)` makes the request - first with
// no code, then with the chosen one. Cancelling rejects with an error shaped like an API error, so
// the caller's usual error message ("Move cancelled ...") is shown.
export async function withOverrideReason(send) {
  try {
    return await send(undefined);
  } catch (error) {
    const body = error?.response?.data;
    const info = body?.data;
    if (error?.response?.status !== 422 || info?.code !== OVERRIDE_REASON_REQUIRED) throw error;
    const code = await requestOverrideReason(info, body?.message);
    if (!code) {
      const cancelled = new Error("Move cancelled: no reason was chosen.");
      cancelled.cancelled = true;
      cancelled.response = { status: 0, data: { message: "Move cancelled: no reason was chosen." } };
      throw cancelled;
    }
    return send(code);
  }
}
