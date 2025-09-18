import { MoonLoader } from 'react-spinners';

export function Loading() {
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 9999,
            }}>
            <MoonLoader
                color="#fff"
                speedMultiplier={0.5}
            />
        </div>
    );
}
