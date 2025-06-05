import React, { createContext, useContext, useState } from 'react';

const Context = createContext({
  walletAddress: ''
});

export function usePageContext() {
  return useContext(Context);
}

export function PageProvider({ children }) {
  const [contextState, setContextState] = useState({
    walletAddress: ''
  });

  return <Context.Provider value={contextState}>{children}</Context.Provider>;
}
