import React, { createContext, ReactNode } from 'react';

export const SalonContext = createContext<string>('SALON');

interface SalonProviderProps {
    children: ReactNode;
}

export const SalonProvider: React.FC<SalonProviderProps> = ({ children }) => (
    <SalonContext.Provider value="SALON">{children}</SalonContext.Provider>
);
