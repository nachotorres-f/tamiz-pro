import { Navbar, Nav, Button, ToastContainer } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import logo from '../../public/logo_white.png'; // Adjust the path as necessary
import { Slide, toast } from 'react-toastify';
import { obtenerNombreSalon } from '@/lib/nameSalon';
import { useEffect, useState } from 'react';
import {
    PAGE_ACCESS_CATALOG,
    getAccessibleRoutes,
    getDefaultRedirectPath,
} from '@/lib/page-access';

interface Route {
    path: string;
    title: string;
}

interface User {
    id: number;
    rol: string;
    username: string;
    salon: string;
    allowedPageKeys: string[];
}

export default function AppNavbar({
    pathname,
    salon,
    setSalon,
    setRol,
}: {
    pathname: string;
    salon: string;
    setSalon: (salon: string) => void;
    setRol: (rol: string) => void;
}) {
    const router = useRouter();
    const [user, setUser] = useState<User>({
        id: 0,
        rol: '',
        username: '',
        salon: '',
        allowedPageKeys: [],
    });

    const handleLogout = async () => {
        await fetch('/api/logout', { method: 'POST' });
        router.push('/acceso');
    };

    useEffect(() => {
        fetch('/api/usuarios/actual')
            .then((res) => res.json())
            .then((data) => {
                if (!data.user) {
                    router.push('/acceso');
                    return;
                }

                setUser(data.user);
                const rolData = data.user?.rol || '';
                const salonData =
                    data.user?.salon === '0' ? 'A' : data.user?.salon;
                setSalon(salonData);
                setRol(rolData);
            });
    }, [setSalon, setRol, router]);

    function handleSalonChange(): void {
        const salonChange = salon === 'A' ? 'B' : 'A';

        toast.info('Salon cambiado a ' + obtenerNombreSalon(salonChange), {
            position: 'bottom-right',
            theme: 'colored',
            transition: Slide,
        });

        setSalon(salon === 'A' ? 'B' : 'A');
    }

    const routeList: Route[] = getAccessibleRoutes(user.allowedPageKeys).map(
        (route) => ({
            path: route.path,
            title: route.label,
        }),
    );
    const defaultPath =
        getDefaultRedirectPath(user.allowedPageKeys) ||
        PAGE_ACCESS_CATALOG[0]?.path ||
        '/acceso';

    return (
        <Navbar
            bg="dark"
            variant="dark"
            expand="lg"
            style={{ height: '10vh' }}>
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
                    className="d-inline-block align-top ms-3"
                    onClick={() => router.push(defaultPath)}
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

                {user?.salon === '0' && (
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
                <p className="text-white align-self-center mt-3 mx-3 fw-bold">
                    {user?.username}
                </p>
            </Navbar.Collapse>
        </Navbar>
    );
}
