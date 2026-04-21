import { createContext, useContext, useEffect, useState } from 'react';

const TimerContext = createContext(Date.now());

export const TimerProvider = ({ children }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Shared global timer matching prompt specs
    // Updates every 10 seconds to save React rendering cycles on the feed
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <TimerContext.Provider value={now}>
      {children}
    </TimerContext.Provider>
  );
};

export const useSharedTimer = () => useContext(TimerContext);
