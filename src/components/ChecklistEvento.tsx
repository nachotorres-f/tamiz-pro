/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect } from 'react';

export const ChecklistEvento = ({ idEvent }: { idEvent: number }) => {
    const [, setData] = React.useState<any>(null);

    useEffect(() => {
        fetch('/api/expedicion/evento?id=' + idEvent)
            .then((res) => res.json())
            .then((data) => {
                setData(data);
            });
    }, [idEvent]);

    return <></>;
};
