import { useEffect, useRef, useMemo } from "react";
import { useWebSocket } from "./WebSocketProvider";

export const useLeaveWebSocket = (channel, eventTypes, onEvent, cooldown = 2000) => {
    const { subscribe } = useWebSocket();
    const cooldownRef   = useRef(false);

    // ✅ Stable string key from eventTypes array — prevents stale closure
    const eventKey = eventTypes.join(",");

    useEffect(() => {
        if (!subscribe) return;

        if (typeof onEvent !== "function") {
            console.error(`❌ useLeaveWebSocket: onEvent is not a function.
            Did you call fetchData() with () instead of passing the reference?`);
            return;
        }

        const types = eventKey.split(","); // recreate from stable string

        const handler = (data) => {
            console.log(`📨 [${channel}] received:`, data?.type, "| watching:", types);

            if (!types.includes(data?.type)) {
                console.log(`⏭️ Ignored — "${data?.type}" not in [${eventKey}]`);
                return;
            }
            if (cooldownRef.current) {
                console.log(`⏳ Cooldown active — skipping`);
                return;
            }

            cooldownRef.current = true;
            console.log(`🔄 Calling onEvent for: ${data.type}`);
            onEvent(data);

            setTimeout(() => { cooldownRef.current = false; }, cooldown);
        };

        console.log(`✅ Subscribing to "${channel}" for [${eventKey}]`);
        const unsub = subscribe(channel, handler);

        return () => {
            console.log(`🔌 Unsubscribing from "${channel}"`);
            unsub?.();
        };

    }, [subscribe, onEvent, channel, eventKey]); // ✅ all deps explicit
};



// // src/hooks/useLeaveWebSocket.js
// import { useEffect, useRef } from "react";
// import { useWebSocket } from "../websockets/WebSocketProvider";

// /**
//  * @param {string}   channel     "employee-update" | "manager-update"
//  * @param {string[]} eventTypes  e.g. ["LEAVE_APPLIED", "LEAVE_CANCELLED"]
//  * @param {function} onEvent     useCallback-wrapped handler
//  * @param {number}   cooldown    ms between refreshes (default 2000)
//  */
// export const useLeaveWebSocket = (channel, eventTypes, onEvent, cooldown = 2000) => {
//     const { subscribe } = useWebSocket();
//     const cooldownRef = useRef(false);

//     useEffect(() => {

//         console.log(`📡 WebSocket subscribe to ${channel, subscribe} ` );

//         if (!subscribe) return;

//         const handler = (data) => {
//             console.log(`📩 WebSocket message on ${channel}:`, data);
//             if (!eventTypes.includes(data.type)) return; // ignore irrelevant events
//             if (cooldownRef.current) return;             // ignore rapid duplicates

//             cooldownRef.current = true;
//             console.log(`🔄 ${data.type} → refreshing`);
//             onEvent(data);

//             setTimeout(() => { cooldownRef.current = false; }, cooldown);
//         };

//         const unsub = subscribe(channel, handler);
//         return () => unsub?.();

//     }, [subscribe, onEvent]);
// };
