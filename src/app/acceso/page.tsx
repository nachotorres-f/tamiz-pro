'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Form, Button, Spinner } from 'react-bootstrap';
import Image from 'next/image';

export default function LoginPage() {
    const [user, setUser] = useState('');
    const [pass, setPass] = useState('');
    const [errors, setErrors] = useState<{
        user?: string;
        pass?: string;
        auth?: string;
    }>({});
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const validate = () => {
        const newErrors: typeof errors = {};
        if (!user.trim()) newErrors.user = 'El usuario es obligatorio';
        if (!pass.trim()) newErrors.pass = 'La contraseña es obligatoria';
        return newErrors;
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass }),
            });

            const data = await res.json();

            if (!res.ok) {
                setErrors({ auth: data.message || 'Credenciales incorrectas' });
                return;
            }

            setErrors({});
            router.push('/calendario');
        } catch {
            setErrors({ auth: 'Error de conexión con el servidor' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Image
                src={'/logo_white.png'}
                alt="Tamiz Comidas"
                height={400}
                width={400}
                style={{
                    margin: ' 0 auto',
                }}
                className="d-inline-block align-top"
            />
            <Container
                style={{
                    margin: '0 auto',
                    maxWidth: '500px',
                    backgroundColor: '#FAFAFA',
                    padding: '3rem',
                    borderRadius: '2rem',
                    boxShadow:
                        '0 4px 12px rgba(0, 0, 0, 0.4), 0 10px 20px rgba(0,0,0,0.2)',
                }}>
                <h3 className="text-center mb-4">Iniciar sesión</h3>

                <Form onSubmit={handleLogin}>
                    <Form.Group className="mb-3">
                        <Form.Label>Usuario</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Ingresá tu usuario"
                            value={user}
                            isInvalid={!!errors.user}
                            onChange={(e) => setUser(e.target.value)}
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.user}
                        </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-4">
                        <Form.Label>Contraseña</Form.Label>
                        <Form.Control
                            type="password"
                            placeholder="Ingresá tu contraseña"
                            value={pass}
                            isInvalid={!!errors.pass}
                            onChange={(e) => setPass(e.target.value)}
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.pass}
                        </Form.Control.Feedback>
                    </Form.Group>

                    <div className="d-grid">
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={loading}>
                            {loading ? (
                                <>
                                    <Spinner
                                        animation="border"
                                        size="sm"
                                        role="status"
                                        className="me-2"
                                    />{' '}
                                    Ingresando...
                                </>
                            ) : (
                                'Entrar'
                            )}
                        </Button>
                    </div>
                </Form>
            </Container>
        </>
    );
}
