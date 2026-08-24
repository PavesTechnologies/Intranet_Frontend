// Centralized AIRS WS event routing. Backend messages arrive as
// { event: "stage.completed", timestamp: "...", data: {...} }. Consumers pass
// a flat map of event name -> handler instead of an if/else chain per event.
export function dispatchAirsEvent(message, handlers) {
  if (!message || typeof message !== "object") return;
  const handler = handlers?.[message.event];
  if (typeof handler === "function") {
    handler(message.data, message);
  }
}
