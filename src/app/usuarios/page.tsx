'use client';

import { Loading } from '@/components/loading';
import { obtenerNombreSalon } from '@/lib/nameSalon';
import { useEffect, useMemo, useState } from 'react';
import {
    Accordion,
    Badge,
    Button,
    Card,
    Col,
    Container,
    Dropdown,
    Form,
    InputGroup,
    Modal,
    Row,
    Table,
} from 'react-bootstrap';
import {
    EyeFill,
    EyeSlashFill,
    Key,
    PencilFill,
    TrashFill,
} from 'react-bootstrap-icons';
import Select from 'react-select';
import { Slide, toast, ToastContainer } from 'react-toastify';

interface User {
    id: number;
    username: string;
    salon: string;
    rol: string;
}

interface SelectOption {
    value: string;
    label: string;
}

const userEmpty: User = {
    id: 0,
    username: '',
    salon: '',
    rol: '',
};

const showToast = (
    type: 'success' | 'error' | 'warn' | 'info',
    message: string,
) => {
    toast[type](message, {
        position: 'bottom-right',
        theme: 'colored',
        transition: Slide,
    });
};

const capitalizar = (texto: string) =>
    texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();

const varianteRol = (rol: string) => {
    if (rol === 'admin') return 'danger';
    if (rol === 'editor') return 'primary';
    return 'secondary';
};

const selectStyles = {
    menu: (provided: Record<string, unknown>) => ({
        ...provided,
        zIndex: 9999,
    }),
};

export default function UsuariosPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [show, setShow] = useState(false);
    const [user, setUser] = useState<User>(userEmpty);
    const [userRequest, setUserRequest] = useState<User>(userEmpty);
    const [editarUser, setEditarUser] = useState(false);
    const [editarPassUser, setEditarPassUser] = useState(false);
    const [eliminarUser, setEliminarUser] = useState(false);
    const [salonSelected, setSalonSelected] = useState('');
    const [rolSelected, setRolSelected] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [repeatPass, setRepeatPass] = useState('');
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showRepeatPass, setShowRepeatPass] = useState(false);

    const salones: SelectOption[] = ['0', 'A', 'B'].map((opcion: string) => ({
        value: opcion,
        label: obtenerNombreSalon(opcion) || opcion,
    }));

    const roles: SelectOption[] = ['admin', 'editor', 'consultor'].map(
        (opcion: string) => ({
            value: opcion,
            label: capitalizar(opcion),
        }),
    );

    const cargarUsuarios = async () => {
        const res = await fetch('/api/usuarios');

        if (!res.ok) {
            throw new Error('No se pudieron cargar los usuarios');
        }

        const data = await res.json();
        setUsers(data.users || []);
        setUserRequest(data.userRequest || userEmpty);
    };

    useEffect(() => {
        cargarUsuarios()
            .catch(() => {
                showToast('error', 'No se pudieron cargar los usuarios');
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const limpiarPasswordState = () => {
        setCurrentPass('');
        setNewPass('');
        setRepeatPass('');
        setShowCurrentPass(false);
        setShowNewPass(false);
        setShowRepeatPass(false);
    };

    const resetFormulario = (nextUser: User) => {
        setUser(nextUser);
        setSalonSelected('');
        setRolSelected('');
        limpiarPasswordState();
    };

    const handleClose = () => {
        setShow(false);
        limpiarPasswordState();
    };

    const openEditUserModal = (selectedUser: User) => {
        resetFormulario(selectedUser);
        setEditarUser(true);
        setEliminarUser(false);
        setEditarPassUser(false);
        setShow(true);
    };

    const openDeleteUserModal = (selectedUser: User) => {
        resetFormulario(selectedUser);
        setEditarUser(false);
        setEliminarUser(true);
        setEditarPassUser(false);
        setShow(true);
    };

    const openPassModal = (selectedUser: User) => {
        resetFormulario(selectedUser);
        setEditarUser(false);
        setEliminarUser(false);
        setEditarPassUser(true);
        setShow(true);
    };

    const prepararAltaUsuario = () => {
        setEditarUser(false);
        setEliminarUser(false);
        setEditarPassUser(false);
        resetFormulario(userEmpty);
    };

    const editarUsuario = async () => {
        try {
            const res = await fetch('/api/usuarios', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user),
            });

            if (!res.ok) {
                throw new Error('No se pudo actualizar el usuario');
            }

            showToast('success', 'Usuario actualizado');
            await cargarUsuarios();
            handleClose();
        } catch {
            showToast('error', 'No se pudo actualizar el usuario');
        }
    };

    const eliminarUsuario = async () => {
        try {
            const res = await fetch('/api/usuarios?id=' + user.id, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!res.ok) {
                throw new Error('No se pudo eliminar el usuario');
            }

            showToast('success', 'Usuario eliminado con exito');
            await cargarUsuarios();
            handleClose();
        } catch {
            showToast('error', 'Hubo un error al eliminar el usuario');
        }
    };

    const editarPassword = async () => {
        if (!currentPass) {
            showToast('warn', 'Debe escribir su contraseña actual');
            return;
        }

        if (!newPass) {
            showToast('warn', 'Debe escribir una nueva contraseña');
            return;
        }

        if (newPass !== repeatPass) {
            showToast('error', 'Las contraseñas no coinciden');
            return;
        }

        try {
            const res = await fetch('/api/usuarios', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...user,
                    currentPassword: currentPass,
                    newPassword: newPass,
                }),
            });

            if (res.status === 400) {
                showToast('error', 'La contraseña es incorrecta');
                return;
            }

            if (!res.ok) {
                throw new Error('No se pudo cambiar la contraseña');
            }

            showToast('success', 'La contraseña se cambió correctamente');
            handleClose();
        } catch {
            showToast('error', 'No se pudo cambiar la contraseña');
        }
    };

    const agregarUsuario = async () => {
        const { username, rol, salon } = user;

        if (!username.trim()) {
            showToast('error', 'El nombre de usuario es obligatorio');
            return;
        }

        if (!rol) {
            showToast('error', 'El rol es obligatorio');
            return;
        }

        if (!salon) {
            showToast('error', 'El salon es obligatorio');
            return;
        }

        if (!newPass) {
            showToast('error', 'La contraseña es obligatoria');
            return;
        }

        if (newPass !== repeatPass) {
            showToast('error', 'Las contraseñas no coinciden');
            return;
        }

        try {
            const res = await fetch('/api/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...user,
                    username: user.username.trim(),
                    password: newPass,
                }),
            });

            if (!res.ok) {
                throw new Error('No se pudo crear el usuario');
            }

            showToast('success', 'El usuario se creó con exito');
            await cargarUsuarios();
            prepararAltaUsuario();
        } catch {
            showToast('error', 'Hubo un error al crear el usuario');
        }
    };

    const toggleShowPass = (field: 'current' | 'new' | 'repeat') => {
        switch (field) {
            case 'current':
                if (showCurrentPass) {
                    setShowCurrentPass(false);
                    break;
                }
                setShowCurrentPass(true);
                setTimeout(() => setShowCurrentPass(false), 5000);
                break;
            case 'new':
                if (showNewPass) {
                    setShowNewPass(false);
                    break;
                }
                setShowNewPass(true);
                setTimeout(() => setShowNewPass(false), 5000);
                break;
            case 'repeat':
                if (showRepeatPass) {
                    setShowRepeatPass(false);
                    break;
                }
                setShowRepeatPass(true);
                setTimeout(() => setShowRepeatPass(false), 5000);
                break;
        }
    };

    const confirmarModal = async () => {
        if (editarUser) {
            await editarUsuario();
            return;
        }

        if (eliminarUser) {
            await eliminarUsuario();
            return;
        }

        if (editarPassUser) {
            await editarPassword();
        }
    };

    const salonValue =
        salones.find((o) => o.value === (salonSelected || user.salon)) || null;
    const rolValue = roles.find((o) => o.value === (rolSelected || user.rol)) || null;

    const isAdmin = userRequest.rol === 'admin';

    const usuariosVisibles = useMemo(() => {
        const termino = searchTerm.trim().toLowerCase();

        return users
            .filter((item) => {
                if (isAdmin) return true;
                return userRequest.username === item.username;
            })
            .filter((item) => {
                if (!termino) return true;
                return item.username.toLowerCase().includes(termino);
            });
    }, [isAdmin, searchTerm, userRequest.username, users]);

    if (loading) {
        return <Loading />;
    }

    return (
        <Container className="py-4 py-md-5">
            <ToastContainer />

            <Modal
                size="lg"
                show={show}
                onHide={handleClose}
                centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {editarUser && `Editar usuario: ${user?.username}`}
                        {eliminarUser &&
                            `¿Estas seguro que desea eliminar este usuario?`}
                        {editarPassUser &&
                            `Cambiar contraseña: ${user?.username}`}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {editarUser && (
                        <Row className="g-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Salon</Form.Label>
                                    <Select
                                        options={salones}
                                        value={salonValue}
                                        onChange={(opcion) => {
                                            const selected = opcion?.value || '';
                                            setSalonSelected(selected);
                                            setUser({
                                                ...user,
                                                salon: selected,
                                            });
                                        }}
                                        placeholder="Selecciona un salon"
                                        styles={selectStyles}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Rol</Form.Label>
                                    <Select
                                        options={roles}
                                        value={rolValue}
                                        onChange={(opcion) => {
                                            const selected = opcion?.value || '';
                                            setRolSelected(selected);
                                            setUser({
                                                ...user,
                                                rol: selected,
                                            });
                                        }}
                                        placeholder="Selecciona un rol"
                                        styles={selectStyles}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    )}

                    {eliminarUser && (
                        <p className="mb-0 fw-medium">{user?.username}</p>
                    )}

                    {editarPassUser && (
                        <Row className="g-3">
                            <Col xs={12}>
                                <Form.Group>
                                    <Form.Label>Contraseña actual</Form.Label>
                                    <InputGroup>
                                        <Form.Control
                                            value={currentPass}
                                            onChange={(e) =>
                                                setCurrentPass(e.target.value)
                                            }
                                            type={
                                                showCurrentPass
                                                    ? 'text'
                                                    : 'password'
                                            }
                                        />
                                        <Button
                                            variant="outline-secondary"
                                            onClick={() =>
                                                toggleShowPass('current')
                                            }>
                                            {showCurrentPass ? (
                                                <EyeSlashFill />
                                            ) : (
                                                <EyeFill />
                                            )}
                                        </Button>
                                    </InputGroup>
                                </Form.Group>
                            </Col>
                            <Col xs={12}>
                                <Form.Group>
                                    <Form.Label>Contraseña nueva</Form.Label>
                                    <InputGroup>
                                        <Form.Control
                                            value={newPass}
                                            onChange={(e) =>
                                                setNewPass(e.target.value)
                                            }
                                            type={
                                                showNewPass
                                                    ? 'text'
                                                    : 'password'
                                            }
                                        />
                                        <Button
                                            variant="outline-secondary"
                                            onClick={() => toggleShowPass('new')}>
                                            {showNewPass ? (
                                                <EyeSlashFill />
                                            ) : (
                                                <EyeFill />
                                            )}
                                        </Button>
                                    </InputGroup>
                                </Form.Group>
                            </Col>
                            <Col xs={12}>
                                <Form.Group>
                                    <Form.Label>
                                        Repetir contraseña nueva
                                    </Form.Label>
                                    <InputGroup>
                                        <Form.Control
                                            value={repeatPass}
                                            onChange={(e) =>
                                                setRepeatPass(e.target.value)
                                            }
                                            type={
                                                showRepeatPass
                                                    ? 'text'
                                                    : 'password'
                                            }
                                        />
                                        <Button
                                            variant="outline-secondary"
                                            onClick={() =>
                                                toggleShowPass('repeat')
                                            }>
                                            {showRepeatPass ? (
                                                <EyeSlashFill />
                                            ) : (
                                                <EyeFill />
                                            )}
                                        </Button>
                                    </InputGroup>
                                </Form.Group>
                            </Col>
                        </Row>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={handleClose}>
                        Cerrar
                    </Button>
                    <Button
                        variant={
                            (editarUser && 'success') ||
                            (eliminarUser && 'danger') ||
                            'primary'
                        }
                        onClick={confirmarModal}>
                        {editarUser && 'Guardar Cambios'}
                        {eliminarUser && 'Eliminar Usuario'}
                        {editarPassUser && 'Cambiar Contraseña'}
                    </Button>
                </Modal.Footer>
            </Modal>

            <Row className="g-3 align-items-center mb-4">
                <Col>
                    <h2 className="mb-1">Usuarios</h2>
                    <p className="text-muted mb-0">
                        Administración de cuentas, roles y accesos por salón.
                    </p>
                </Col>
                <Col
                    xs="auto"
                    className="d-flex gap-2">
                    <Badge
                        bg="dark"
                        className="px-3 py-2 fw-normal">
                        Mi rol: {capitalizar(userRequest.rol || 'consultor')}
                    </Badge>
                    <Badge
                        bg="secondary"
                        className="px-3 py-2 fw-normal">
                        Total: {users.length}
                    </Badge>
                </Col>
            </Row>

            {isAdmin && (
                <Card className="border-0 shadow-sm mb-4">
                    <Card.Header className="bg-light fw-semibold">
                        Alta de usuario
                    </Card.Header>
                    <Card.Body>
                        <Accordion className="mb-0">
                            <Accordion.Item eventKey="0">
                                <Accordion.Header
                                    onClick={prepararAltaUsuario}>
                                    Agregar usuario
                                </Accordion.Header>
                                <Accordion.Body>
                                    <Row className="g-3 mb-3">
                                        <Col md={4}>
                                            <Form.Group>
                                                <Form.Label>Usuario</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    value={user.username}
                                                    onChange={(e) => {
                                                        setUser({
                                                            ...user,
                                                            username:
                                                                e.target.value,
                                                        });
                                                    }}
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={4}>
                                            <Form.Group>
                                                <Form.Label>
                                                    Contraseña
                                                </Form.Label>
                                                <InputGroup>
                                                    <Form.Control
                                                        value={newPass}
                                                        onChange={(e) =>
                                                            setNewPass(
                                                                e.target.value,
                                                            )
                                                        }
                                                        type={
                                                            showNewPass
                                                                ? 'text'
                                                                : 'password'
                                                        }
                                                    />
                                                    <Button
                                                        variant="outline-secondary"
                                                        onClick={() =>
                                                            toggleShowPass(
                                                                'new',
                                                            )
                                                        }>
                                                        {showNewPass ? (
                                                            <EyeSlashFill />
                                                        ) : (
                                                            <EyeFill />
                                                        )}
                                                    </Button>
                                                </InputGroup>
                                            </Form.Group>
                                        </Col>
                                        <Col md={4}>
                                            <Form.Group>
                                                <Form.Label>
                                                    Repetir contraseña
                                                </Form.Label>
                                                <InputGroup>
                                                    <Form.Control
                                                        value={repeatPass}
                                                        onChange={(e) =>
                                                            setRepeatPass(
                                                                e.target.value,
                                                            )
                                                        }
                                                        type={
                                                            showRepeatPass
                                                                ? 'text'
                                                                : 'password'
                                                        }
                                                    />
                                                    <Button
                                                        variant="outline-secondary"
                                                        onClick={() =>
                                                            toggleShowPass(
                                                                'repeat',
                                                            )
                                                        }>
                                                        {showRepeatPass ? (
                                                            <EyeSlashFill />
                                                        ) : (
                                                            <EyeFill />
                                                        )}
                                                    </Button>
                                                </InputGroup>
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                    <Row className="g-3 align-items-end">
                                        <Col md={4}>
                                            <Form.Group>
                                                <Form.Label>Salon</Form.Label>
                                                <Select
                                                    options={salones}
                                                    value={salonValue}
                                                    onChange={(opcion) => {
                                                        const selected =
                                                            opcion?.value || '';
                                                        setSalonSelected(
                                                            selected,
                                                        );
                                                        setUser({
                                                            ...user,
                                                            salon: selected,
                                                        });
                                                    }}
                                                    placeholder="Selecciona un salon"
                                                    styles={selectStyles}
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={4}>
                                            <Form.Group>
                                                <Form.Label>Rol</Form.Label>
                                                <Select
                                                    options={roles}
                                                    value={rolValue}
                                                    onChange={(opcion) => {
                                                        const selected =
                                                            opcion?.value || '';
                                                        setRolSelected(
                                                            selected,
                                                        );
                                                        setUser({
                                                            ...user,
                                                            rol: selected,
                                                        });
                                                    }}
                                                    placeholder="Selecciona un rol"
                                                    styles={selectStyles}
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={4}>
                                            <Button
                                                className="w-100 btn-success"
                                                onClick={agregarUsuario}>
                                                Agregar usuario
                                            </Button>
                                        </Col>
                                    </Row>
                                </Accordion.Body>
                            </Accordion.Item>
                        </Accordion>
                    </Card.Body>
                </Card>
            )}

            <Card className="border-0 shadow-sm">
                <Card.Header className="bg-dark text-white">
                    <Row className="g-2 align-items-center">
                        <Col md={6}>
                            <span className="fw-semibold">
                                Lista de usuarios
                            </span>
                        </Col>
                        <Col
                            md={6}
                            className="text-md-end text-white-50 small">
                            Mostrando {usuariosVisibles.length} de {users.length}
                        </Col>
                    </Row>
                </Card.Header>
                <Card.Body className="p-0">
                    <div className="p-3 border-bottom bg-light-subtle">
                        <InputGroup>
                            <InputGroup.Text>Buscar</InputGroup.Text>
                            <Form.Control
                                placeholder="Usuario..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                }}
                            />
                        </InputGroup>
                    </div>

                    <div className="table-responsive">
                        <Table
                            hover
                            className="mb-0 align-middle">
                            <thead className="table-dark">
                                <tr>
                                    <th style={{ width: 80 }}>Acciones</th>
                                    <th>Usuario</th>
                                    <th>Salón</th>
                                    <th>Rol</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usuariosVisibles.map((usuario) => {
                                    const { id, username, salon, rol } =
                                        usuario;

                                    return (
                                        <tr key={id}>
                                            <td className="text-center">
                                                <Dropdown
                                                    align="end"
                                                    className="btn btn-sm p-0">
                                                    <Dropdown.Toggle
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        id={`dropdown-user-${id}`}></Dropdown.Toggle>
                                                    <Dropdown.Menu>
                                                        {id === userRequest.id && (
                                                            <Dropdown.Item
                                                                onClick={() => {
                                                                    openPassModal(
                                                                        usuario,
                                                                    );
                                                                }}>
                                                                <Key /> Cambiar
                                                                contraseña
                                                            </Dropdown.Item>
                                                        )}
                                                        {isAdmin && (
                                                            <Dropdown.Item
                                                                onClick={() => {
                                                                    openEditUserModal(
                                                                        usuario,
                                                                    );
                                                                }}>
                                                                <PencilFill className="text-warning" />{' '}
                                                                Editar
                                                            </Dropdown.Item>
                                                        )}
                                                        {isAdmin && (
                                                            <Dropdown.Item
                                                                onClick={() => {
                                                                    openDeleteUserModal(
                                                                        usuario,
                                                                    );
                                                                }}>
                                                                <TrashFill className="text-danger" />{' '}
                                                                Eliminar
                                                            </Dropdown.Item>
                                                        )}
                                                    </Dropdown.Menu>
                                                </Dropdown>
                                            </td>
                                            <td className="fw-medium">
                                                {username}
                                            </td>
                                            <td>
                                                <Badge
                                                    bg="light"
                                                    text="dark"
                                                    className="border fw-normal">
                                                    {obtenerNombreSalon(salon)}
                                                </Badge>
                                            </td>
                                            <td>
                                                <Badge
                                                    bg={varianteRol(rol)}
                                                    className="fw-normal">
                                                    {capitalizar(rol)}
                                                </Badge>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {usuariosVisibles.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="text-center text-muted py-4">
                                            No se encontraron usuarios.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
}
