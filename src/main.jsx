import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import  WebSocketProvider  from "./pages/leave_management/websockets/WebSocketProvider.jsx";
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
      <App />
    </WebSocketProvider>
    {/* <ReactQueryDevtools initialIsOpen={false} /> */}
</QueryClientProvider>
  // {/* </StrictMode> */}
);
  