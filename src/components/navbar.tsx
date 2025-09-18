import {
    Navbar,
    Nav,
    Container,
    Button,
    ToastContainer,
} from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import logo from '../../public/logo_white.png'; // Adjust the path as necessary
import { Slide, toast } from 'react-toastify';
import { obtenerNombreSalon } from '@/lib/nameSalon';
import { useEffect, useState } from 'react';

interface Route {
    path: string;
    title: string;
}

interface User {
    rol: string;
}

export default function AppNavbar({
    pathname,
    salon,
    setSalon,
}: {
    pathname: string;
    salon: string;
    setSalon: (salon: string) => void;
}) {
    const router = useRouter();
    const [user, setUser] = useState<User>({ rol: '' });

    const handleLogout = async () => {
        await fetch('/api/logout', { method: 'POST' });
        router.push('/acceso');
    };

    useEffect(() => {
        fetch('/api/usuarios/actual')
            .then((res) => res.json())
            .then((data) => {
                setUser(data.user);
                const salonData =
                    data.user?.salon === '0' ? 'A' : data.user?.salon;
                setSalon(salonData);
            });
    }, [setSalon]);

    function handleSalonChange(): void {
        const salonChange = salon === 'A' ? 'B' : 'A';

        toast.info('Salon cambiado a ' + obtenerNombreSalon(salonChange), {
            position: 'bottom-right',
            theme: 'colored',
            transition: Slide,
        });

        setSalon(salon === 'A' ? 'B' : 'A');
    }

    const routeList: Route[] = [
        {
            path: '/importar',
            title: 'Importar',
        },
        {
            path: '/calendario',
            title: 'Calendario',
        },
        {
            path: '/planificacion',
            title: 'Planificacion',
        },
        {
            path: '/produccion',
            title: 'Produccion',
        },
        {
            path: '/entregaMP',
            title: 'Entrega de MP',
        },
        {
            path: '/expedicion',
            title: 'Expedicion',
        },
        {
            path: '/picking',
            title: 'Picking',
        },
        { path: 'usuarios', title: 'Usuarios' },
    ];

    return (
        <Navbar
            bg="dark"
            variant="dark"
            expand="lg"
            style={{ height: '10vh' }}>
            <Container>
                <ToastContainer />
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
                        onClick={() => router.push('/calendario')}
                    />
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="me-auto">
                        {routeList.map(({ path, title }) => (
                            <Nav.Link
                                active={pathname === path}
                                key={path}
                                onClick={() => router.push(path)}>
                                {title}
                            </Nav.Link>
                        ))}
                    </Nav>

                    <p className="text-white align-self-center mt-3 me-2 fw-bold">
                        {obtenerNombreSalon(salon)}
                    </p>

                    {user.rol === 'admin' && (
                        <Button
                            variant="light"
                            className="me-2 d-block btn-sm"
                            onClick={handleSalonChange}>
                            Cambiar salon
                        </Button>
                    )}

                    <Button
                        variant="outline-light"
                        className="d-block btn-sm"
                        onClick={handleLogout}>
                        Cerrar sesión
                    </Button>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}
