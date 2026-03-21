import { addDays, format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface Plato {
    plato: string;
    platoPadre: string;
    platoPadreCodigo: string;
    cantidad: number;
    observacion: string | null;
    codigo: string;
    unidadMedida: string;
    fecha: Date;
    salon: string | null;
    ingredientes: [string, string, string, number][];
}

interface SolicitudPDFReceta {
    fecha: Date;
    listaPlatos: string[];
}

const head = [['Codigo', 'Descripcion', 'Unidad', 'Porcion Bruta']];

const normalizarTexto = (valor: string | null | undefined) =>
    (valor ?? '').trim();

const formatearFechaArchivo = (fecha: Date) => fecha.toISOString().split('T')[0];

const sanitizarNombreArchivo = (valor: string | null | undefined) => {
    const nombreNormalizado = normalizarTexto(valor)
        .replace(/[\\/:*?"<>|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return nombreNormalizado || 'Sin_nombre';
};

const construirIdentificadorFechas = (fechas: Date[]) => {
    const fechasOrdenadas = [...fechas].sort(
        (a, b) => a.getTime() - b.getTime(),
    );

    if (fechasOrdenadas.length === 0) {
        return 'sin_fecha';
    }

    const primeraFecha = formatearFechaArchivo(fechasOrdenadas[0]);
    const ultimaFecha = formatearFechaArchivo(
        fechasOrdenadas[fechasOrdenadas.length - 1],
    );

    return primeraFecha === ultimaFecha
        ? primeraFecha
        : `${primeraFecha}_a_${ultimaFecha}`;
};

const construirLineaPlato = (
    etiqueta: 'Plato' | 'Elab',
    codigo: string | null | undefined,
    nombre: string | null | undefined,
) => {
    const codigoNormalizado = normalizarTexto(codigo);
    const nombreNormalizado = normalizarTexto(nombre);
    const detalle = [codigoNormalizado, nombreNormalizado]
        .filter(Boolean)
        .join(' - ');

    return `${etiqueta}: ${detalle || 'Sin datos'}`;
};

export const generarPDFReceta = async (
    listaPlatos: string[],
    fecha: Date,
    salon: string,
    modo: 'unico' | 'separado',
    entregaMP = false,
) => {
    const response = await fetch('api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listaPlatos, fecha, salon }),
    });

    if (!response.ok) {
        throw new Error('Error al obtener los datos para el PDF');
    }

    const data = await response.json();
    fecha = entregaMP ? addDays(fecha, -2) : fecha;
    const prefijoArchivo = entregaMP ? 'entregaMP' : 'Produccion';

    if (modo === 'unico') {
        const doc = new jsPDF();

        data.forEach((plato: Plato, index: number) => {
            if (index > 0) {
                doc.addPage();
            }

            const yPosition = renderEncabezado(doc, entregaMP);
            renderReceta(doc, plato, yPosition, fecha, entregaMP);
        });

        doc.save(`${prefijoArchivo}_${formatearFechaArchivo(fecha)}.pdf`);
    }

    if (modo === 'separado') {
        const zip = new JSZip();

        for (const plato of data) {
            const doc = new jsPDF();

            const yPosition = renderEncabezado(doc, entregaMP);
            renderReceta(doc, plato, yPosition, fecha, entregaMP);

            const pdfBlob = doc.output('blob');
            zip.file(
                `${prefijoArchivo}_${plato.plato}_${
                    formatearFechaArchivo(fecha)
                }.pdf`,
                pdfBlob,
            );
        }

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `${prefijoArchivo}_${formatearFechaArchivo(fecha)}.zip`);
    }
};

const obtenerDatosPDFReceta = async (
    listaPlatos: string[],
    fecha: Date,
    salon: string,
) => {
    const response = await fetch('api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listaPlatos, fecha, salon }),
    });

    if (!response.ok) {
        throw new Error('Error al obtener los datos para el PDF');
    }

    return (await response.json()) as Plato[];
};

export const generarPDFRecetasSeleccionadas = async (
    solicitudes: SolicitudPDFReceta[],
    salon: string,
    modo: 'unico' | 'separado',
    entregaMP = false,
    nombreArchivoBase?: string,
) => {
    if (solicitudes.length === 0) {
        throw new Error('No hay recetas seleccionadas para imprimir');
    }

    const prefijoArchivo = entregaMP ? 'entregaMP' : 'Produccion';
    const fechasDocumento = solicitudes.map((solicitud) =>
        entregaMP ? addDays(solicitud.fecha, -2) : solicitud.fecha,
    );
    const identificadorFechas = construirIdentificadorFechas(fechasDocumento);
    const nombreArchivoPdf = `${prefijoArchivo}_${sanitizarNombreArchivo(
        nombreArchivoBase,
    )}_${identificadorFechas}`;
    const nombreArchivoZip = `${prefijoArchivo}_${identificadorFechas}`;

    if (modo === 'unico') {
        const doc = new jsPDF();
        let paginaActual = 0;

        for (const solicitud of solicitudes) {
            const data = await obtenerDatosPDFReceta(
                solicitud.listaPlatos,
                solicitud.fecha,
                salon,
            );
            const fechaDocumento = entregaMP
                ? addDays(solicitud.fecha, -2)
                : solicitud.fecha;

            for (const plato of data) {
                if (paginaActual > 0) {
                    doc.addPage();
                }

                const yPosition = renderEncabezado(doc, entregaMP);
                renderReceta(doc, plato, yPosition, fechaDocumento, entregaMP);
                paginaActual += 1;
            }
        }

        doc.save(`${nombreArchivoPdf}.pdf`);
    }

    if (modo === 'separado') {
        const zip = new JSZip();
        let indiceArchivo = 1;

        for (const solicitud of solicitudes) {
            const data = await obtenerDatosPDFReceta(
                solicitud.listaPlatos,
                solicitud.fecha,
                salon,
            );
            const fechaDocumento = entregaMP
                ? addDays(solicitud.fecha, -2)
                : solicitud.fecha;

            for (const plato of data) {
                const doc = new jsPDF();
                const yPosition = renderEncabezado(doc, entregaMP);
                renderReceta(doc, plato, yPosition, fechaDocumento, entregaMP);

                zip.file(
                    `${prefijoArchivo}_${plato.plato}_${
                        formatearFechaArchivo(fechaDocumento)
                    }_${indiceArchivo}.pdf`,
                    doc.output('blob'),
                );
                indiceArchivo += 1;
            }
        }

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `${nombreArchivoZip}.zip`);
    }
};

const renderEncabezado = (doc: jsPDF, entregaMP: boolean) => {
    let yPosition = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);

    const title = entregaMP ? 'Entrega MP' : 'Produccion';
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
    doc.addImage(img, 'PNG', 10, 10, imgWidth, imgHeight);

    // Fecha de generación
    const dateCreate = `Generado el: ${format(new Date(), 'dd/MM/yyyy')}`;
    const dateCreateWidth = doc.getTextWidth(dateCreate);
    const dateCreateX = pageWidth - dateCreateWidth + 35;
    const dateCreateY = pageHeight - 10;

    doc.setFontSize(10);
    doc.text(dateCreate, dateCreateX, dateCreateY);

    yPosition += 10;

    // linea horizontal
    doc.setLineWidth(0.2); // grosor fino
    doc.line(10, yPosition, doc.internal.pageSize.getWidth() - 10, yPosition);

    yPosition += 10;

    return yPosition;
};

const renderReceta = (
    doc: jsPDF,
    plato: Plato,
    yPosition: number,
    fecha: Date,
    entregaMP: boolean = false,
) => {
    const codigoPadre = normalizarTexto(plato.platoPadreCodigo);
    const nombrePadre = normalizarTexto(plato.platoPadre);

    if (codigoPadre || nombrePadre) {
        doc.setFontSize(12);
        doc.text(
            construirLineaPlato('Plato', codigoPadre, nombrePadre),
            14,
            yPosition,
        );
        yPosition += 6;
    }

    doc.setFontSize(16);
    doc.text(
        construirLineaPlato('Elab', plato.codigo, plato.plato),
        14,
        yPosition,
    );

    yPosition += 5;

    doc.setFontSize(10);
    doc.text(
        `${entregaMP ? 'Cantidad' : 'Cantidad a producir:'} ${plato.cantidad}`,
        14,
        yPosition,
    );

    yPosition += 5;

    if (plato.observacion) {
        const observacionText = `Observacion: ${plato.observacion}`;
        doc.setFillColor(255, 255, 0); // Amarillo;
        doc.rect(
            13,
            yPosition - 4,
            doc.getTextWidth(observacionText) + 2,
            5, // PROBAR CON 6
            'F',
        );

        doc.text(observacionText, 14, yPosition);

        yPosition += 5;
    }

    doc.text(
        `${entregaMP ? 'Fecha:' : 'Fecha Produccion:'} ${format(fecha, 'dd/MM/yyyy')}`,
        14,
        yPosition,
    );

    const tableData = {
        head,
        body: plato.ingredientes,
    };

    autoTable(doc, {
        ...tableData,
        startY: yPosition + 10,
        margin: { left: 10 },
        theme: 'plain',
    });
};
