'use client';

import { useEffect, useState } from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import logo from '../../public/logo_white.png'; // Adjust the path as necessary

export default function AppNavbar() {
    const [loggedIn, setLoggedIn] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/session')
            .then((res) => res.json())
            .then((data) => {
                setLoggedIn(data.loggedIn);
                if (data.loggedIn) {
                    router.push('/planificacion');
                } else {
                    router.push('/login');
                }
            })
            .catch(() => {
                setLoggedIn(false);
                router.push('/login');
            });
    }, [router]);

    const handleLogout = async () => {
        await fetch('/api/logout', { method: 'POST' });
        setLoggedIn(false);
        router.push('/login');
    };

    return (
        <Navbar
            bg="dark"
            variant="dark"
            expand="lg">
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
                                    onClick={() => router.push('/ocultos')}>
                                    Ocultos
                                </Nav.Link>
                            </>
                        )}
                    </Nav>
                    {loggedIn ? (
                        <Button
                            variant="outline-light"
                            onClick={handleLogout}>
                            Cerrar sesión
                        </Button>
                    ) : (
                        <></>
                    )}
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}
