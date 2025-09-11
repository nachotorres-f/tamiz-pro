'use client';

import { useEffect, useState } from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import logo from '../../public/logo_white.png'; // Adjust the path as necessary

export default function AppNavbar({
    salon,
    setSalon,
}: {
    salon: string;
    setSalon: (salon: string) => void;
}) {
    const [loggedIn, setLoggedIn] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const salon = localStorage.getItem('filtroSalon');
        if (!salon) {
            localStorage.setItem('filtroSalon', 'A');
            setSalon('A');
        } else {
            setSalon(salon);
        }

        fetch('/api/session')
            .then((res) => res.json())
            .then((data) => {
                setLoggedIn(data.loggedIn);
                if (data.loggedIn) {
                    router.push('/calendario');
                } else {
                    router.push('/acceso');
                }
            })
            .catch(() => {
                setLoggedIn(false);
                router.push('/acceso');
            });
    }, [router]);

    const handleLogout = async () => {
        await fetch('/api/logout', { method: 'POST' });
        setLoggedIn(false);
        router.push('/acceso');
    };

    function handleSalonChange(): void {
        const savedFiltro = localStorage.getItem('filtroSalon');

        if (!savedFiltro) {
            localStorage.setItem('filtroSalon', 'A');
            setSalon('A');
        }

        if (savedFiltro === 'A') {
            localStorage.setItem('filtroSalon', 'B');
            setSalon('B');
        } else {
            localStorage.setItem('filtroSalon', 'A');
            setSalon('A');
        }
    }

    return (
        <Navbar
            bg="dark"
            variant="dark"
            expand="lg"
            style={{ height: '10vh' }}>
            <Container>
                <Navbar.Brand>
                    <Image
                        src={logo}
                        alt="Tamiz Comidas"
                        style={{
                            height: '100%',
                            maxHeight: '50px',
                            width: 'auto',
                        }}
                        className="d-inline-block align-top"
                    />
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="me-auto">
                        {loggedIn && (
                            <>
                                {/* <Nav.Link onClick={() => router.push('/')}>
                                    Inicio
                                </Nav.Link> */}

                                <Nav.Link
                                    onClick={() => router.push('/importar')}>
                                    Importar
                                </Nav.Link>

                                <Nav.Link
                                    onClick={() => router.push('/calendario')}>
                                    Calendario
                                </Nav.Link>

                                <Nav.Link
                                    onClick={() =>
                                        router.push('/planificacion')
                                    }>
                                    Planificación
                                </Nav.Link>

                                <Nav.Link
                                    onClick={() => router.push('/produccion')}>
                                    Produccion
                                </Nav.Link>

                                <Nav.Link
                                    onClick={() =>
                                        router.push('/produccionPrevia')
                                    }>
                                    Entrega de MP
                                </Nav.Link>

                                <Nav.Link
                                    onClick={() => router.push('/expedicion')}>
                                    Expedicion
                                </Nav.Link>

                                {/* <Nav.Link
                                    onClick={() => router.push('/entregaMP')}>
                                    Entrega de MP
                                </Nav.Link>

                                <Nav.Link
                                    onClick={() => router.push('/expedicion')}>
                                    Expedicion
                                </Nav.Link> */}
                            </>
                        )}
                    </Nav>
                    {loggedIn ? (
                        <>
                            <Button
                                variant="outline-light"
                                className="me-2 d-block"
                                onClick={handleLogout}>
                                Cerrar sesión
                            </Button>
                            <Button
                                variant="outline-light"
                                className="d-block"
                                onClick={handleSalonChange}>
                                Cambiar salon
                            </Button>
                            <p className="text-white align-self-center ms-3 mb-0 text-bold">
                                {salon === 'A'
                                    ? 'Rut Haus / Origami'
                                    : 'El Central / La Rural'}
                            </p>
                        </>
                    ) : (
                        <></>
                    )}
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}
