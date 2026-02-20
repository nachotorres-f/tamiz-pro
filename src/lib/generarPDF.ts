import { addDays, format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface Plato {
    plato: string;
    cantidad: number;
    observacion: string | null;
    codigo: string;
    unidadMedida: string;
    fecha: Date;
    salon: string | null;
    ingredientes: [string, string, string, number][];
}

const head = [['Codigo', 'Descripcion', 'Unidad', 'Porcion Bruta']];

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
    console.log(entregaMP);

    if (modo === 'unico') {
        const doc = new jsPDF();

        data.forEach((plato: Plato, index: number) => {
            if (index > 0) {
                doc.addPage();
            }

            const yPosition = renderEncabezado(doc);
            renderReceta(doc, plato, yPosition, fecha);
        });

        doc.save(`Produccion_${fecha.toISOString().split('T')[0]}.pdf`);
    }

    if (modo === 'separado') {
        const zip = new JSZip();

        for (const plato of data) {
            const doc = new jsPDF();

            const yPosition = renderEncabezado(doc);
            renderReceta(doc, plato, yPosition, fecha, entregaMP);

            const pdfBlob = doc.output('blob');
            zip.file(
                `Produccion_${plato.plato}_${
                    fecha.toISOString().split('T')[0]
                }.pdf`,
                pdfBlob,
            );
        }

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(
            content,
            `Producciones_${fecha.toISOString().split('T')[0]}.zip`,
        );
    }
};

const renderEncabezado = (doc: jsPDF) => {
    let yPosition = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

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
    doc.setFontSize(16);
    doc.text(`${plato.codigo} - ${plato.plato}`, 14, yPosition);

    yPosition += 5;

    doc.setFontSize(10);
    doc.text(
        `${entregaMP ? 'Cantidad' : 'Cantidad a producir:'} ${plato.cantidad} ${plato.unidadMedida}`,
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
