const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function main() {
  const pdfBytes = fs.readFileSync('public/adr-form.pdf');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  
  fields.forEach(field => {
    const type = field.constructor.name;
    const name = field.getName();
    let additionalInfo = '';
    
    if (type === 'PDFTextField') {
      try {
        const textWidget = field.acroField.getWidgets()[0];
        const rect = textWidget.getRectangle();
        additionalInfo = `| Rect: x=${rect.x.toFixed(1)} y=${rect.y.toFixed(1)}`;
      } catch(e) {}
    }
    
    console.log(`${type}: ${name} ${additionalInfo}`);
  });
}

main().catch(console.error);
