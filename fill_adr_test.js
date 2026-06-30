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
    try {
      if (type === 'PDFTextField') {
        field.setText(name);
      } else if (type === 'PDFCheckBox') {
        // field.check();
      }
    } catch(e) {}
  });

  const outBytes = await pdfDoc.save();
  fs.writeFileSync('public/adr-form-mapped.pdf', outBytes);
}

main().catch(console.error);
