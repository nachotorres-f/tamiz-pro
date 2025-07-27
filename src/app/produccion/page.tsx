/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// import { FiltroPlatos } from '@/components/filtroPlatos';
import { NavegacionSemanal } from '@/components/navegacionSemanal';
// import { SelectorDias } from '@/components/selectorDias';
import { addDays, format, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';
import {
    Button,
    // Col,
    Container,
    // Form,
    // Row,
    Table,
} from 'react-bootstrap';
import { FiletypePdf } from 'react-bootstrap-icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ProduccionPage() {
    //const [filtro, setFiltro] = useState('');
    const [filtro] = useState('');
    const [diasSemana, setDiasSemana] = useState<Date[]>([]);
    const [diaActivo, setDiaActivo] = useState('');
    const [semanaBase, setSemanaBase] = useState(new Date());
    const [datos, setDatos] = useState<any[]>([]);

    console.log('datos', datos);

    useEffect(() => {
        fetch(
            '/api/produccion?fechaInicio=' +
                startOfWeek(semanaBase, { weekStartsOn: 4 }).toISOString()
        )
            .then((res) => res.json())
            .then((res) => res.data)
            .then(setDatos);
    }, [semanaBase]);

    useEffect(() => {
        const inicioSemana = startOfWeek(semanaBase, { weekStartsOn: 4 }); // jueves
        const dias = Array.from({ length: 11 }, (_, i) =>
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
        const fechaMasUno = format(addDays(fecha, 2), 'yyyy-MM-dd');
        if (i === 0) {
            console.log(dia, fecha, fechaMasUno);
        }

        console.log('DIA', dia);
        console.log('FECHA', fecha);
        console.log('FECHA MAS UNO', fechaMasUno);

        const platosEnFecha = datos
            .filter((item) =>
                item.produccion.some(
                    (p: { fecha: string }) =>
                        // (p.fecha.startsWith(fecha) && !item.principal) ||
                        p.fecha.startsWith(fechaMasUno)
                    //&& item.principal
                )
            )
            .map((item) => item.plato);

        console.log('platosEnFecha', platosEnFecha);

        for (let index = 0; index < platosEnFecha.length; index++) {
            const element = platosEnFecha[index];
            generarPDF(element);
        }
    };

    const generarPDF = async (plato: string) => {
        const doc = new jsPDF();

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
                                    const titleWidth = doc.getTextWidth(title);

                                    const titleX = (pageWidth - titleWidth) / 2;
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
                                        doc.internal.pageSize.getWidth() - 10,
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
                                                        ingredientes[0].nombre
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
                                            (_ingrediente: any, i: number) =>
                                                (index > 0 && i !== 0) ||
                                                index === 0
                                        )
                                        .map((ingrediente: any) => [
                                            ingrediente.codigo,
                                            ingrediente.nombre,
                                            ingrediente.unidadMedida,
                                            parseFloat(
                                                (
                                                    ingrediente.porcionBruta *
                                                    cantidad
                                                ).toFixed(2)
                                            ),
                                        ]);

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

                const fechaHoy = format(new Date(), 'yyyy-MM-dd');
                doc.save(fechaHoy + ' ' + plato + '.pdf');
            });
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

    return (
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

            <NavegacionSemanal
                semanaBase={semanaBase}
                setSemanaBase={setSemanaBase}
            />

            <div style={{ overflowY: 'auto', height: 'calc(100vh - 300px)' }}>
                <Table
                    bordered
                    striped
                    id="tabla-produccion">
                    <thead className="table-dark sticky-top">
                        <tr style={{ textAlign: 'center' }}>
                            <th></th>
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => {
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
                            })}
                        </tr>
                        <tr style={{ textAlign: 'center' }}>
                            <th>Plato</th>
                            {diasSemana.filter(filterDias).map((dia, idx) => (
                                <th key={idx}>
                                    {format(dia, 'EEEE d MMMM', { locale: es })}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {datos &&
                            datos.filter(filterPlatos).map((dato) => (
                                <tr key={dato.plato}>
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
                                    <td>{dato.plato}</td>

                                    {diasSemana
                                        .filter(filterDias)
                                        .map((dia, i) => {
                                            dia.setHours(0, 0, 0, 0);

                                            const produccion =
                                                dato.produccion.find(
                                                    (prod: any) => {
                                                        const fecha = new Date(
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
            </div>
        </Container>
    );
}
