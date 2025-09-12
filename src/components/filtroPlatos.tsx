'use client';
import React from 'react';
import { Form } from 'react-bootstrap';

export function FiltroPlatos({
    filtro,
    setFiltro,
}: {
    filtro: string;
    setFiltro: (value: string) => void;
}) {
    return (
        <Form.Control
            type="text"
            placeholder="Buscar plato..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="col-md-4 mb-3"
        />
    );
}

export const SalonContext = React.createContext<string>('SALON');

export function SalonProvider({
    salon,
    children,
}: {
    salon: string;
    children: React.ReactNode;
}) {
    return (
        <SalonContext.Provider value={salon}>{children}</SalonContext.Provider>
    );
}
