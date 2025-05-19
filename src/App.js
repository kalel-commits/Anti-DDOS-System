import React from 'react';
import { SocketProvider } from './context/SocketContext';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <SocketProvider>
        {/* Your existing app content */}
      </SocketProvider>
    </ErrorBoundary>
  );
}

export default App; 