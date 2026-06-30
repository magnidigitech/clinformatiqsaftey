const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function main() {
  const pdfBytes = fs.readFileSync('public/cioms-form1.pdf');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  fields.forEach(field => {
    const type = field.constructor.name;
    const name = field.getName();
    console.log(`${type}: ${name}`);
  });
}

main().catch(console.error);
