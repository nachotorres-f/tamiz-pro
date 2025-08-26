/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// import { FiltroPlatos } from '@/components/filtroPlatos';
import { NavegacionSemanal } from '@/components/navegacionSemanal';
// import { SelectorDias } from '@/components/selectorDias';
import { addDays, format, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';
import {
    Accordion,
    Button,
    Col,
    // Col,
    Container,
    Form,
    Modal,
    Row,
    // Form,
    // Row,
    Table,
} from 'react-bootstrap';
import { FiletypePdf, ArrowRight } from 'react-bootstrap-icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MoonLoader } from 'react-spinners';
import { Slide, toast } from 'react-toastify';
import AgregarPlato from '@/components/agregarPlato';

export default function ProduccionPage() {
    //const [filtro, setFiltro] = useState('');
    const [filtro] = useState('');
    const [diasSemana, setDiasSemana] = useState<Date[]>([]);
    const [diaActivo, setDiaActivo] = useState('');
    const [semanaBase, setSemanaBase] = useState(new Date());
    const [datos, setDatos] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [platos, setPlatos] = useState<string[]>([]);
    const [filtroSalon, setFiltroSalon] = useState<string>('A');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        fetch(
            '/api/produccion?fechaInicio=' +
                startOfWeek(semanaBase, { weekStartsOn: 1 }).toISOString()
        )
            .then((res) => res.json())
            .then((res) => res.data)
            .then(setDatos)
            .finally(() => {
                setLoading(false);
            });
    }, [semanaBase]);

    useEffect(() => {
        const inicioSemana = addDays(
            startOfWeek(semanaBase, { weekStartsOn: 1 }),
            -4
        ); // jueves
        const dias = Array.from({ length: 13 }, (_, i) =>
            addDays(inicioSemana, i)
        );
        setDiasSemana(dias);
        setDiaActivo('');
    }, [semanaBase]);

    const filterDias = (dia: Date) => {
        if (diaActivo && format(dia, 'yyyy-MM-dd') !== diaActivo) {
            return false;
        }

        return true;
    };

    const filterPlatos = (dato: any) => {
        if (!filtro) return true;

        return dato.plato.toLowerCase().includes(filtro.toLowerCase());
    };

    const generarPDFFecha = async (i: number) => {
        const dia = diasSemana[i];
        const fecha = format(dia, 'yyyy-MM-dd');

        const platosEnFecha = datos
            .map((item) => {
                return {
                    ...item,
                    produccion: item.produccion.map((p: { fecha: string }) => ({
                        ...p,
                        fecha: format(new Date(p.fecha), 'yyyy-MM-dd'),
                    })),
                };
            })
            .filter((item) =>
                item.produccion.some((p: { fecha: string }) =>
                    p.fecha.startsWith(fecha)
                )
            )
            .map((item) => item.plato);

        // for (let index = 0; index < platosEnFecha.length; index++) {
        //     const element = platosEnFecha[index];
        //     await generarPDF(element);
        // }

        setPlatos(platosEnFecha);
        setShowModal(true);
    };

    const generarPDF = async (platosList: string[]) => {
        const doc = new jsPDF();

        for (let index = 0; index < platosList.length; index++) {
            if (index > 0) {
                doc.addPage();
            }

            const plato = platosList[index];

            await fetch(
                'api/generarPDF?plato=' +
                    plato +
                    '&fechaInicio=' +
                    startOfWeek(semanaBase, { weekStartsOn: 4 }).toISOString()
            )
                .then((res) => res.json())
                .then((res) => {
                    const data = res.data;
                    data.forEach((platoGrupo: any) => {
                        const ingredientesAgrupados = agruparIngredientes(
                            platoGrupo.ingredientes
                        );

                        const produccion: any = datos.find(
                            (dato) => dato.plato === plato
                        )?.produccion;

                        produccion.forEach(
                            (
                                {
                                    fecha,
                                    cantidad,
                                }: { fecha: Date; cantidad: number },
                                indexProd: number
                            ) => {
                                if (indexProd > 0) {
                                    doc.addPage();
                                }

                                ingredientesAgrupados.forEach(
                                    (ingredientes: any, index: number) => {
                                        if (index !== 0) {
                                            doc.addPage();
                                        }
                                        const pageWidth =
                                            doc.internal.pageSize.getWidth();
                                        const pageHeight =
                                            doc.internal.pageSize.getHeight();
                                        let yPosition = 40;

                                        doc.setFontSize(20);
                                        doc.setTextColor(0, 0, 0);

                                        const title = 'Produccion';
                                        const titleWidth =
                                            doc.getTextWidth(title);

                                        const titleX =
                                            (pageWidth - titleWidth) / 2;
                                        const titleY = yPosition;
                                        doc.text(title, titleX, titleY);

                                        // Agregar una imagen en la esquina superior izquierda
                                        const imgWidth = 40; // Ancho de la imagen
                                        const imgHeight = 40; // Alto de la imagen

                                        const imgUrl = '/logo_black.png'; // Ruta de la imagen
                                        const img = new Image();
                                        img.src = imgUrl;

                                        doc.addImage(
                                            img,
                                            'PNG',
                                            10,
                                            10,
                                            imgWidth,
                                            imgHeight
                                        );

                                        // Fecha de generación
                                        const dateCreate = `Generado el: ${format(
                                            new Date(),
                                            'dd/MM/yyyy HH:mm'
                                        )}`;
                                        const dateCreateWidth =
                                            doc.getTextWidth(dateCreate);
                                        const dateCreateX =
                                            pageWidth - dateCreateWidth + 35;
                                        const dateCreateY = pageHeight - 10;

                                        doc.setFontSize(10);
                                        doc.text(
                                            dateCreate,
                                            dateCreateX,
                                            dateCreateY
                                        );

                                        yPosition += 10;

                                        doc.setLineWidth(0.2); // grosor fino

                                        // linea horizontal
                                        doc.line(
                                            10,
                                            yPosition,
                                            doc.internal.pageSize.getWidth() -
                                                10,
                                            yPosition
                                        );

                                        yPosition += 10;

                                        // Título de la receta
                                        doc.setFontSize(16);
                                        doc.text(
                                            index > 0
                                                ? ingredientes[0].nombre.toString() +
                                                      ' - ' +
                                                      ingredientes[0].codigo
                                                : plato.toString(),
                                            14,
                                            yPosition
                                        );

                                        yPosition += 5;
                                        doc.setFontSize(10);

                                        if (index > 0) {
                                            const cantidad =
                                                ingredientesAgrupados.find(
                                                    (ingAgr: any) => {
                                                        if (
                                                            ingAgr[0].nombre ===
                                                            ingredientes[0]
                                                                .nombre
                                                        ) {
                                                            return true;
                                                        }
                                                    }
                                                )[0].porcionBruta;

                                            doc.text(
                                                'Cantidad a producir: ' +
                                                    cantidad +
                                                    ' porciones',
                                                14,
                                                yPosition
                                            );
                                        } else {
                                            doc.text(
                                                'Cantidad: ' + cantidad,
                                                14,
                                                yPosition
                                            );
                                        }

                                        yPosition += 5;
                                        doc.text(
                                            'Fecha Produccion: ' +
                                                format(
                                                    new Date(fecha),
                                                    'dd/MM/yyyy'
                                                ),
                                            14,
                                            yPosition
                                        );

                                        const headers = [
                                            [
                                                'Código',
                                                'Descripción',
                                                'Unidad',
                                                'Porción Bruta',
                                            ],
                                        ];

                                        const data = ingredientes
                                            .filter(
                                                (
                                                    _ingrediente: any,
                                                    i: number
                                                ) =>
                                                    (index > 0 && i !== 0) ||
                                                    index === 0
                                            )
                                            .map(
                                                (ingrediente: {
                                                    codigo: string;
                                                    nombre: string;
                                                    unidadMedida: string;
                                                    porcionBruta: number;
                                                }) => [
                                                    ingrediente.codigo,
                                                    ingrediente.nombre,
                                                    ingrediente.unidadMedida,
                                                    (
                                                        ingrediente.porcionBruta *
                                                        cantidad
                                                    ).toFixed(2),
                                                ]
                                            );

                                        const tableData = {
                                            head: headers,
                                            body: data,
                                        };
                                        autoTable(doc, {
                                            ...tableData,
                                            startY: yPosition + 10,
                                            margin: { left: 10 },
                                            theme: 'plain',
                                        });
                                    }
                                );
                            }
                        );
                    });

                    if (platosList.length === 1) {
                        const fechaHoy = format(new Date(), 'yyyy-MM-dd');
                        doc.save(fechaHoy + ' ' + plato + '.pdf');
                    }
                });
        }

        if (platosList.length > 1) {
            doc.save(format(new Date(), 'yyyy-MM-dd') + ' Produccion.pdf');
        }
    };

    const agruparIngredientes = (ingredientes: any) => {
        if (!ingredientes) return [];

        const ingredientesAgrupados: any = [];

        ingredientesAgrupados.push(
            ingredientes.filter((ingrediente: any) => ingrediente.depth === 0)
        );

        const gruposPT = ingredientes.filter(
            (ingrediente: any) => ingrediente.tipo === 'PT'
        );

        gruposPT.forEach((grupoPT: any) => {
            const subIngredientes = ingredientes.filter(
                (ingrediente: any) =>
                    (ingrediente.parentPT === grupoPT.nombre &&
                        ingrediente.depth > 0) ||
                    (ingrediente.tipo === 'PT' &&
                        ingrediente.nombre === grupoPT.nombre)
            );

            ingredientesAgrupados.push(subIngredientes);
        });

        return ingredientesAgrupados;
    };

    const handleClose = () => setShowModal(false);

    const handleImprimirJuntas = async () => {
        setShowModal(false);
        setLoading(true);
        await generarPDF(platos);
        setLoading(false);
    };

    const handleImprimirSeparadas = async () => {
        setShowModal(false);
        setLoading(true);
        for (let index = 0; index < platos.length; index++) {
            const list = [];
            list.push(platos[index]);
            await generarPDF(list);
        }
        setLoading(false);
    };

    const filterSalon = (dato: any) => {
        if (!filtroSalon) return true;

        return dato.salon === filtroSalon;
    };

    const formatFecha = (dia: Date) => {
        const nombreDia = format(dia, 'EEEE', { locale: es }); // "lunes"
        const letraDia = nombreDia.startsWith('mi')
            ? 'X'
            : nombreDia.charAt(0).toUpperCase(); // "L"
        const diaNumero = format(dia, 'd'); // "5"
        const mesNumero = format(dia, 'M'); // "8"
        return `${letraDia} ${diaNumero}-${mesNumero}`;
    };

    const pasarProduccion = async (
        nombre: string,
        cantidad: number,
        fecha: Date
    ) => {
        toast.warn('Pasando produccion', {
            position: 'bottom-right',
            theme: 'colored',
            transition: Slide,
        });

        fetch('api/produccion/pasar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                plato: nombre,
                cantidad: cantidad,
                fecha: fecha,
            }),
        })
            .then(() => {
                toast.success('Producción pasada al día siguiente', {
                    position: 'bottom-right',
                    theme: 'colored',
                    transition: Slide,
                });
                setLoading(true);
                fetch(
                    '/api/produccion?fechaInicio=' +
                        startOfWeek(semanaBase, {
                            weekStartsOn: 1,
                        }).toISOString()
                )
                    .then((res) => res.json())
                    .then((res) => res.data)
                    .then(setDatos)
                    .finally(() => {
                        setLoading(false);
                    });
            })
            .catch(() => {
                toast.error('Error al pasar la producción', {
                    position: 'bottom-right',
                    theme: 'colored',
                    transition: Slide,
                });
                setLoading(false);
            });
    };

    if (loading) {
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
                    size={100}
                    speedMultiplier={0.5}
                />
            </div>
        );
    }

    return (
        <>
            <Container className="mt-5">
                <h2 className="text-center mb-4">Produccion</h2>

                {/* <Form.Group>
                <Row>
                    <Col>
                        <FiltroPlatos
                            filtro={filtro}
                            setFiltro={setFiltro}
                        />
                    </Col>
                    <Col>
                        <SelectorDias
                            diasSemana={diasSemana}
                            setDiaActivo={setDiaActivo}
                        />
                    </Col>
                </Row>
            </Form.Group> */}

                <Modal
                    show={showModal}
                    onHide={handleClose}>
                    <Modal.Header closeButton>
                        <Modal.Title>Imprimir recetas</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        ¿Quieres imprimir las recetas separadas o juntas?
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="primary"
                            onClick={handleImprimirJuntas}>
                            Imprimir juntas
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleImprimirSeparadas}>
                            Imprimir separadas
                        </Button>
                    </Modal.Footer>
                </Modal>

                <Container className="mb-3">
                    <Row>
                        <Col>
                            <Accordion className="mb-5">
                                <Accordion.Item eventKey="0">
                                    <Accordion.Header>
                                        Agregar plato
                                    </Accordion.Header>
                                    <Accordion.Body>
                                        <AgregarPlato
                                            salon={filtroSalon || 'A'}
                                            produccion={true}
                                            setSemanaBase={setSemanaBase}
                                        />
                                    </Accordion.Body>
                                </Accordion.Item>
                            </Accordion>
                        </Col>
                    </Row>
                    <Row>
                        <Col xs={4}>
                            <Form.Group>
                                <Form.Label>Filtrar por salón</Form.Label>
                                <Form.Select
                                    value={filtroSalon || ''}
                                    onChange={(e) =>
                                        setFiltroSalon(e.target.value)
                                    }>
                                    <option value="A">
                                        Rut Haus - Origami
                                    </option>
                                    <option value="B">
                                        El Central - La Rural
                                    </option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col xs={4}></Col>
                        <Col xs={4}>
                            <Form.Group>
                                <Form.Label>Filtrar por dia</Form.Label>
                                <Form.Select
                                    value={diaActivo}
                                    onChange={(e) =>
                                        setDiaActivo(e.target.value)
                                    }>
                                    <option value="">Todos los dias</option>
                                    {diasSemana.map((dia, i) => {
                                        const fecha = format(dia, 'yyyy-MM-dd');
                                        return (
                                            <option
                                                key={i}
                                                value={fecha}>
                                                {' '}
                                                {formatFecha(dia)}
                                            </option>
                                        );
                                    })}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                </Container>

                <NavegacionSemanal
                    semanaBase={semanaBase}
                    setSemanaBase={setSemanaBase}
                />
            </Container>

            {/* <div
                className="mt-3 mx-auto"
                style={{
                    overflowY: 'auto',
                    height: '100vh',
                    width: '100%',
                }}>
                <Table
                    bordered
                    striped
                    id="tabla-produccion">
                    <thead className="table-dark sticky-top">
                        <tr style={{ textAlign: 'center' }}>
                            <th></th>
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
                                (i) => {
                                    return (
                                        <th key={i}>
                                            <Button
                                                className="btn-danger"
                                                size="sm"
                                                style={{
                                                    width: '2rem',
                                                    height: '2rem',
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    margin: '0 auto',
                                                }}
                                                onClick={() => {
                                                    generarPDFFecha(i);
                                                }}>
                                                <FiletypePdf />
                                            </Button>
                                        </th>
                                    );
                                }
                            )}
                        </tr>
                        <tr style={{ textAlign: 'center' }}>
                            <th>Plato</th>
                            {diasSemana.filter(filterDias).map((dia, idx) => (
                                <th key={idx}>{formatFecha(dia)}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {datos &&
                            datos
                                .filter(filterPlatos)
                                .filter(filterSalon)
                                .map((dato) => (
                                    <tr key={dato.plato}> */}
            {/* <td>
                                        <Button
                                            className="btn-danger"
                                            size="sm"
                                            style={{
                                                width: '2rem',
                                                height: '2rem',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                            }}
                                            onClick={() => {
                                                generarPDF(dato.plato);
                                            }}>
                                            <FiletypePdf />
                                        </Button>
                                    </td> */}
            {/* <td>{dato.plato}</td>

                                        {diasSemana
                                            .filter(filterDias)
                                            .map((dia, i) => {
                                                dia.setHours(0, 0, 0, 0);

                                                const produccion =
                                                    dato.produccion.find(
                                                        (prod: any) => {
                                                            const fecha =
                                                                new Date(
                                                                    prod.fecha
                                                                );
                                                            fecha.setHours(
                                                                0,
                                                                0,
                                                                0,
                                                                0
                                                            );

                                                            return (
                                                                fecha.getTime() ===
                                                                dia.getTime()
                                                            );
                                                        }
                                                    );
                                                const cantidad = produccion
                                                    ? produccion.cantidad
                                                    : 0;
                                                return (
                                                    <td key={i}>
                                                        {cantidad || ''}
                                                    </td>
                                                );
                                            })}
                                    </tr>
                                ))}
                    </tbody>
                </Table>
            </div> */}

            <div
                className="d-flex flex-row justify-content-evenly mt-3 mx-auto flex-wrap"
                style={{ width: '100%' }}>
                {diasSemana.filter(filterDias).map((dia, i) => {
                    // Primero filtramos y procesamos los datos para este día
                    const datosDelDia = datos
                        .filter(filterPlatos)
                        .filter(filterSalon)
                        .map((dato) => {
                            dia.setHours(0, 0, 0, 0);
                            const produccion = dato.produccion.find(
                                (prod: any) => {
                                    const fecha = new Date(prod.fecha);
                                    fecha.setHours(0, 0, 0, 0);
                                    return fecha.getTime() === dia.getTime();
                                }
                            );
                            const cantidad = produccion
                                ? produccion.cantidad
                                : 0;

                            // Solo incluimos los datos que tienen cantidad
                            if (cantidad > 0) {
                                return {
                                    plato: dato.plato,
                                    cantidad: cantidad,
                                };
                            }
                            return null;
                        })
                        .filter(Boolean); // Eliminamos los elementos null

                    return (
                        <Table
                            key={i}
                            className="table-striped "
                            style={{
                                width: '300px',
                                margin: '',
                                height: 'max-content',
                            }}
                            bordered>
                            <thead className="table-dark">
                                <tr>
                                    <th colSpan={4}>
                                        {formatFecha(dia)}{' '}
                                        {datosDelDia.length > 0 && (
                                            <Button
                                                className="btn-danger d-inline-block ms-3"
                                                size="sm"
                                                style={{
                                                    width: '2rem',
                                                    height: '2rem',
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    margin: '0 auto',
                                                }}
                                                onClick={() => {
                                                    generarPDFFecha(i);
                                                }}>
                                                <FiletypePdf />
                                            </Button>
                                        )}
                                    </th>
                                </tr>
                                <tr>
                                    <th></th>
                                    <th>Plato</th>
                                    <th>Cantidad</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {datosDelDia.length > 0 ? (
                                    datosDelDia.map((dato, i) => (
                                        <tr
                                            key={dato && dato.plato}
                                            style={{
                                                textAlign: 'center',
                                                height:
                                                    datosDelDia.length - 1 !== i
                                                        ? 'max-content'
                                                        : '',
                                            }}>
                                            <td>
                                                <Button
                                                    className="btn-danger"
                                                    size="sm"
                                                    style={{
                                                        width: '2rem',
                                                        height: '2rem',
                                                        display: 'flex',
                                                        justifyContent:
                                                            'center',
                                                        alignItems: 'center',
                                                    }}
                                                    onClick={() => {
                                                        if (dato)
                                                            generarPDF([
                                                                dato.plato,
                                                            ]);
                                                    }}>
                                                    <FiletypePdf />
                                                </Button>
                                            </td>
                                            <td>{dato && dato.plato}</td>
                                            <td>{dato && dato.cantidad}</td>
                                            <td>
                                                <Button
                                                    className="btn-primary"
                                                    size="sm"
                                                    style={{
                                                        width: '2rem',
                                                        height: '2rem',
                                                        display: 'flex',
                                                        justifyContent:
                                                            'center',
                                                        alignItems: 'center',
                                                    }}
                                                    onClick={() => {
                                                        if (dato)
                                                            pasarProduccion(
                                                                dato.plato,
                                                                dato.cantidad,
                                                                dia
                                                            );
                                                    }}>
                                                    <ArrowRight />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            style={{
                                                textAlign: 'center',
                                                fontStyle: 'italic',
                                                color: '#666',
                                            }}>
                                            No hay nada para producir
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    );
                })}
            </div>
        </>
    );
}
