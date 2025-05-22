import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST() {
    try {
        //const { platos } = await req.json();

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();

        // Crear HTML del PDF
        const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .evento-info { background: #f5f5f5; padding: 20px; margin-bottom: 30px; }
          .platos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .plato-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
          .plato-nombre { font-weight: bold; font-size: 16px; margin-bottom: 5px; }
          .plato-descripcion { color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Menú del Evento</h1>
        <h2>Evento Especial</h2>
        </div>
        
        <div class="evento-info">
          <p><strong>Fecha:</strong> ${'Por definir'}</p>
          <p><strong>Ubicación:</strong> ${'Por definir'}</p>
        </div>
        
        <div class="platos-grid">
        </div>
      </body>
      </html>
    `;

        await page.setContent(htmlContent);

        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '20mm',
                bottom: '20mm',
                left: '20mm',
            },
        });

        await browser.close();

        return new Response(pdf, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename=menu-evento.pdf',
            },
        });
    } catch {
        return NextResponse.json(
            { success: false, message: 'Error interno' },
            { status: 500 }
        );
    }
}
