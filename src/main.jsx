import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import "./api/axiosInstance";
import App from './App.jsx';
import  WebSocketProvider  from "./pages/leave_management/websockets/WebSocketProvider.jsx";
import ApprovalWebSocketProvider from "./pages/expense-management/approval-engine/websocket/ApprovalWebSocketProvider.jsx";
import './index.css';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 60_000,
    },
  },
});


createRoot(document.getElementById('root')).render(
  // <StrictMode>
  <QueryClientProvider client={queryClient}>
    <WebSocketProvider>
      <ApprovalWebSocketProvider>
        <App />
      </ApprovalWebSocketProvider>
    </WebSocketProvider>
    {/* <ReactQueryDevtools initialIsOpen={false} /> */}
</QueryClientProvider>
  // {/* </StrictMode> */}
);
  