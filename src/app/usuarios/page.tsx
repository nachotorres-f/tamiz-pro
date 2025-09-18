'use client';

import { Loading } from '@/components/loading';
import { obtenerNombreSalon } from '@/lib/nameSalon';
import { useEffect, useState } from 'react';
import {
    Accordion,
    Button,
    Col,
    Container,
    Dropdown,
    Form,
    Modal,
    Row,
    Table,
} from 'react-bootstrap';
import {
    TrashFill,
    PencilFill,
    Key,
    EyeSlashFill,
    EyeFill,
} from 'react-bootstrap-icons';
import Select from 'react-select';
import { Slide, toast, ToastContainer } from 'react-toastify';

interface User {
    id: number;
    username: string;
    salon: string;
    rol: string;
}

const userEmpty: User = {
    id: 0,
    username: '',
    salon: '',
    rol: '',
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

    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [repeatPass, setRepeatPass] = useState('');
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showRepeatPass, setShowRepeatPass] = useState(false);

    const salones = ['0', 'A', 'B'].map((opcion: string) => ({
        value: opcion,
        label: obtenerNombreSalon(opcion),
    }));

    const roles = ['admin', 'usuario'].map((opcion: string) => ({
        value: opcion,
        label: opcion.charAt(0).toUpperCase() + opcion.slice(1).toLowerCase(),
    }));

    useEffect(() => {
        fetch('/api/usuarios')
            .then((res) => res.json())
            .then(({ users, userRequest }) => {
                setUsers(users);
                setUserRequest(userRequest);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    const editUser = (user: User) => {
        setUser(user);
        setEditarUser(true);
        setEliminarUser(false);
        setEditarPassUser(false);

        setSalonSelected('');
        setRolSelected('');
    };

    const deleteUser = (user: User) => {
        setUser(user);
        setEditarUser(false);
        setEliminarUser(true);
        setEditarPassUser(false);

        setSalonSelected('');
        setRolSelected('');
    };

    const editPassUser = (user: User) => {
        setUser(user);
        setEditarUser(false);
        setEliminarUser(false);
        setEditarPassUser(true);

        setSalonSelected('');
        setRolSelected('');
    };

    const createUser = (user: User) => {
        setUser(user);
        setCurrentPass('');
        setNewPass('');
        setRepeatPass('');

        setSalonSelected('');
        setRolSelected('');
    };

    const editarUsuario = () => {
        fetch('/api/usuarios', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user),
        })
            .then(() => {
                toast.success('Usuario actualizado', {
                    position: 'bottom-right',
                    theme: 'colored',
                    transition: Slide,
                });

                fetch('/api/usuarios')
                    .then((res) => res.json())
                    .then((data) => {
                        console.log(data);
                        return data;
                    })
                    .then(({ users }) => setUsers(users));
            })
            .catch(() => {
                toast.error('No se pudo actualizar el usuario', {
                    position: 'bottom-right',
                    theme: 'colored',
                    transition: Slide,
                });
            });
    };

    const eliminarUsuario = () => {
        fetch('/api/usuarios?id=' + user.id, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        })
            .then(() => {
                toast.success('Usuario eliminado con exito', {
                    position: 'bottom-right',
                    theme: 'colored',
                    transition: Slide,
                });

                fetch('/api/usuarios')
                    .then((res) => res.json())
                    .then((data) => {
                        console.log(data);
                        return data;
                    })
                    .then(({ users }) => setUsers(users));
            })
            .catch(() => {
                toast.error('Hubo un error al eliminar el usuario', {
                    position: 'bottom-right',
                    theme: 'colored',
                    transition: Slide,
                });
            });
    };

    const editarPassword = async () => {
        if (newPass !== repeatPass) {
            toast.error('Las contraseñas no coinciden', {
                position: 'bottom-right',
                theme: 'colored',
                transition: Slide,
            });
        }

        if (!currentPass) {
            toast.warn('Debe escribir su contraseña actual', {
                position: 'bottom-right',
                theme: 'colored',
                transition: Slide,
            });
        }

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
            toast.error('La contraseña es incorrecta', {
                position: 'bottom-right',
                theme: 'colored',
                transition: Slide,
            });
        } else {
            toast.success('La contraña se cambio correctamente', {
                position: 'bottom-right',
                theme: 'colored',
                transition: Slide,
            });
        }
    };

    const agregarUsuario = () => {
        const { username, rol, salon } = user;

        console.log(user);

        if (!username) {
            toast.error('El nombre de usuario es obligatorio', {
                position: 'bottom-right',
                theme: 'colored',
                transition: Slide,
            });
            return;
        }

        if (!rol) {
            toast.error('El rol es obligatorio', {
                position: 'bottom-right',
                theme: 'colored',
                transition: Slide,
            });
            return;
        }

        if (!salon) {
            toast.error('El salon es obligatorio', {
                position: 'bottom-right',
                theme: 'colored',
                transition: Slide,
            });
            return;
        }

        if (newPass !== repeatPass) {
            toast.error('Las contraseñas no coinciden', {
                position: 'bottom-right',
                theme: 'colored',
                transition: Slide,
            });
            return;
        }

        fetch('/api/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...user, password: newPass }),
        })
            .then(() => {
                toast.success('El usuario se creo con exito', {
                    position: 'bottom-right',
                    theme: 'colored',
                    transition: Slide,
                });

                fetch('/api/usuarios')
                    .then((res) => res.json())
                    .then(({ users, userRequest }) => {
                        setUsers(users);
                        setUserRequest(userRequest);
                    })
                    .finally(() => {
                        setLoading(false);
                    });
            })
            .catch(() => {
                toast.error('Hubo un error al crear el usuario', {
                    position: 'bottom-right',
                    theme: 'colored',
                    transition: Slide,
                });
            });
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

    if (loading) {
        return <Loading />;
    }

    return (
        <Container className="">
            <ToastContainer />
            <Modal
                size="lg"
                show={show}
                onHide={handleClose}>
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
                        <Row>
                            <Col>
                                <Form.Group>
                                    <Form.Label>Salon</Form.Label>
                                    <Select
                                        options={salones}
                                        value={
                                            !salonSelected && user.salon
                                                ? {
                                                      value: user.salon,
                                                      label: obtenerNombreSalon(
                                                          user.salon
                                                      ),
                                                  }
                                                : salones.find(
                                                      (o) =>
                                                          o.value ===
                                                          salonSelected
                                                  )
                                        }
                                        onChange={(opcion) => {
                                            setSalonSelected(
                                                opcion?.value || ''
                                            );
                                            setUser({
                                                ...user,
                                                salon:
                                                    opcion?.value || user.salon,
                                            });
                                        }}
                                        placeholder="Selecciona un salon"
                                        styles={{
                                            menu: (provided) => ({
                                                ...provided,
                                                zIndex: 9999, // por si hay problemas de superposición
                                            }),
                                        }}
                                    />
                                </Form.Group>
                            </Col>
                            <Col>
                                <Form.Label>Rol</Form.Label>
                                <Select
                                    options={roles}
                                    value={
                                        !rolSelected && user.rol
                                            ? {
                                                  value: user.rol,
                                                  label:
                                                      user.rol
                                                          .charAt(0)
                                                          .toUpperCase() +
                                                      user.rol
                                                          .slice(1)
                                                          .toLowerCase(),
                                              }
                                            : roles.find(
                                                  (o) => o.value === rolSelected
                                              )
                                    }
                                    onChange={(opcion) => {
                                        setRolSelected(opcion?.value || '');
                                        setUser({
                                            ...user,
                                            rol: opcion?.value || user.rol,
                                        });
                                    }}
                                    placeholder="Selecciona un rol"
                                    styles={{
                                        menu: (provided) => ({
                                            ...provided,
                                            zIndex: 9999, // por si hay problemas de superposición
                                        }),
                                    }}
                                />
                            </Col>
                        </Row>
                    )}
                    {eliminarUser && user?.username}
                    {editarPassUser && (
                        <>
                            <Row>
                                <Col>
                                    <Form.Group>
                                        <Form.Label>
                                            Contraseña actual
                                        </Form.Label>
                                        <div className="d-flex">
                                            <Form.Control
                                                onChange={(e) =>
                                                    setCurrentPass(
                                                        e.target.value
                                                    )
                                                }
                                                type={
                                                    showCurrentPass
                                                        ? 'text'
                                                        : 'password'
                                                }
                                            />
                                            <Button
                                                variant="secondary"
                                                onClick={() =>
                                                    toggleShowPass('current')
                                                }>
                                                {showCurrentPass ? (
                                                    <EyeSlashFill />
                                                ) : (
                                                    <EyeFill />
                                                )}
                                            </Button>
                                        </div>
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <Form.Label>Contraseña nueva</Form.Label>
                                    <div className="d-flex">
                                        <Form.Control
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
                                            variant="secondary"
                                            onClick={() =>
                                                toggleShowPass('new')
                                            }>
                                            {showNewPass ? (
                                                <EyeSlashFill />
                                            ) : (
                                                <EyeFill />
                                            )}
                                        </Button>
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <Form.Label>
                                        Repetir contraseña nueva
                                    </Form.Label>
                                    <div className="d-flex">
                                        <Form.Control
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
                                            variant="secondary"
                                            onClick={() =>
                                                toggleShowPass('repeat')
                                            }>
                                            {showRepeatPass ? (
                                                <EyeSlashFill />
                                            ) : (
                                                <EyeFill />
                                            )}
                                        </Button>
                                    </div>
                                </Col>
                            </Row>
                        </>
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
                        onClick={() => {
                            if (editarUser) {
                                editarUsuario();
                                handleClose();
                            }

                            if (eliminarUser) {
                                eliminarUsuario();
                                handleClose();
                            }

                            if (editarPassUser) {
                                editarPassword();
                                handleClose();
                            }
                        }}>
                        {editarUser && 'Guardar Cambios'}
                        {eliminarUser && 'Eliminar Usuario'}
                        {editarPassUser && 'Cambiar Contraseña'}
                    </Button>
                </Modal.Footer>
            </Modal>

            <h2 className="text-center mt-5">Usuarios</h2>

            {userRequest.rol === 'admin' && (
                <Accordion className="mb-5">
                    <Accordion.Item eventKey="0">
                        <Accordion.Header
                            onClick={() => {
                                createUser(userEmpty);
                            }}>
                            Agregar usuario
                        </Accordion.Header>
                        <Accordion.Body>
                            <Row className="mb-3">
                                <Col>
                                    <Form.Label>Usuario</Form.Label>
                                    <Form.Control
                                        type="text"
                                        onChange={(e) => {
                                            setUser({
                                                ...user,
                                                username: e.target.value,
                                            });
                                        }}
                                    />
                                </Col>
                                <Col>
                                    <Form.Label>Contraseña</Form.Label>
                                    <div className="d-flex">
                                        <Form.Control
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
                                            variant="secondary"
                                            onClick={() =>
                                                toggleShowPass('new')
                                            }>
                                            {showNewPass ? (
                                                <EyeSlashFill />
                                            ) : (
                                                <EyeFill />
                                            )}
                                        </Button>
                                    </div>
                                </Col>
                                <Col>
                                    <Form.Label>Repetir contraseña</Form.Label>
                                    <div className="d-flex">
                                        <Form.Control
                                            onChange={(e) =>
                                                setRepeatPass(e.target.value)
                                            }
                                            type={
                                                showNewPass
                                                    ? 'text'
                                                    : 'password'
                                            }
                                        />
                                        <Button
                                            variant="secondary"
                                            onClick={() =>
                                                toggleShowPass('repeat')
                                            }>
                                            {showRepeatPass ? (
                                                <EyeSlashFill />
                                            ) : (
                                                <EyeFill />
                                            )}
                                        </Button>
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <Form.Label>Salon</Form.Label>
                                    <Select
                                        options={salones}
                                        value={
                                            !salonSelected && user.salon
                                                ? {
                                                      value: user.salon,
                                                      label: obtenerNombreSalon(
                                                          user.salon
                                                      ),
                                                  }
                                                : salones.find(
                                                      (o) =>
                                                          o.value ===
                                                          salonSelected
                                                  )
                                        }
                                        onChange={(opcion) => {
                                            setSalonSelected(
                                                opcion?.value || ''
                                            );
                                            setUser({
                                                ...user,
                                                salon:
                                                    opcion?.value || user.salon,
                                            });
                                        }}
                                        placeholder="Selecciona un salon"
                                        styles={{
                                            menu: (provided) => ({
                                                ...provided,
                                                zIndex: 9999, // por si hay problemas de superposición
                                            }),
                                        }}
                                    />
                                </Col>
                                <Col>
                                    <Form.Label>Rol</Form.Label>
                                    <Select
                                        options={roles}
                                        value={
                                            !rolSelected && user.rol
                                                ? {
                                                      value: user.rol,
                                                      label:
                                                          user.rol
                                                              .charAt(0)
                                                              .toUpperCase() +
                                                          user.rol
                                                              .slice(1)
                                                              .toLowerCase(),
                                                  }
                                                : roles.find(
                                                      (o) =>
                                                          o.value ===
                                                          rolSelected
                                                  )
                                        }
                                        onChange={(opcion) => {
                                            setRolSelected(opcion?.value || '');
                                            setUser({
                                                ...user,
                                                rol: opcion?.value || user.rol,
                                            });
                                        }}
                                        placeholder="Selecciona un rol"
                                        styles={{
                                            menu: (provided) => ({
                                                ...provided,
                                                zIndex: 9999, // por si hay problemas de superposición
                                            }),
                                        }}
                                    />
                                </Col>
                                <Col>
                                    <Button
                                        className="btn btn-success mx-auto mt-3 d-block"
                                        onClick={() => {
                                            agregarUsuario();
                                        }}>
                                        Agregar usuario
                                    </Button>
                                </Col>
                            </Row>
                        </Accordion.Body>
                    </Accordion.Item>
                </Accordion>
            )}

            <Table
                className="mx-auto table-hover"
                style={{ width: 'max-content' }}>
                <thead className="table-dark">
                    <tr>
                        <th></th>
                        <th>Usuario</th>
                        <th>Salones</th>
                        <th>Rol</th>
                    </tr>
                </thead>
                <tbody style={{ maxWidth: 'max-content' }}>
                    {users
                        .filter((user) => {
                            if (userRequest.rol === 'admin') return true;
                            return userRequest.username === user.username;
                        })
                        .map((user) => {
                            const { id, username, salon, rol } = user;
                            return (
                                <tr
                                    key={id}
                                    style={{
                                        maxWidth: 'max-content',
                                        verticalAlign: 'middle',
                                        textAlign: 'center',
                                    }}>
                                    <th>
                                        <Dropdown className="btn btn-sm">
                                            <Dropdown.Toggle
                                                variant="primary"
                                                id="dropdown-basic"></Dropdown.Toggle>

                                            <Dropdown.Menu>
                                                {id === userRequest.id && (
                                                    <Dropdown.Item
                                                        onClick={() => {
                                                            editPassUser(user);
                                                            handleShow();
                                                        }}>
                                                        <Key /> Cambiar
                                                        contraseña
                                                    </Dropdown.Item>
                                                )}
                                                {'admin' ===
                                                    userRequest.rol && (
                                                    <Dropdown.Item
                                                        onClick={() => {
                                                            editUser(user);
                                                            handleShow();
                                                        }}>
                                                        <PencilFill className="text-warning" />{' '}
                                                        Editar
                                                    </Dropdown.Item>
                                                )}
                                                {'admin' ===
                                                    userRequest.rol && (
                                                    <Dropdown.Item
                                                        onClick={() => {
                                                            deleteUser(user);
                                                            handleShow();
                                                        }}>
                                                        <TrashFill className="text-danger" />{' '}
                                                        Eliminar
                                                    </Dropdown.Item>
                                                )}
                                            </Dropdown.Menu>
                                        </Dropdown>
                                    </th>
                                    <td>{username}</td>
                                    <td className="px-5 d-block-inline">
                                        {obtenerNombreSalon(salon)}
                                    </td>
                                    <td>
                                        {rol.charAt(0).toUpperCase() +
                                            rol.slice(1).toLowerCase()}
                                    </td>
                                </tr>
                            );
                        })}
                </tbody>
            </Table>
        </Container>
    );
}
