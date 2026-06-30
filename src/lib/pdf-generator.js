import { PDFDocument } from 'pdf-lib';

export async function generateCiomsPdf(data) {
  // Fetch the PDF from the public folder
  const url = '/cioms-form1.pdf';
  const existingPdfBytes = await fetch(url).then((res) => res.arrayBuffer());

  // Load a PDFDocument from the existing PDF bytes
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  // Get the form containing all the fields
  const form = pdfDoc.getForm();

  // Fill in the basic text fields
  try { form.getTextField('Initials').setText(data.initials || ''); } catch(e){}
  try { form.getTextField('Country').setText(data.country || ''); } catch(e){}
  try { form.getTextField('Age').setText(data.age || ''); } catch(e){}
  try { form.getTextField('Sex').setText(data.sex || ''); } catch(e){}
  try { form.getTextField('Description').setText(data.description || ''); } catch(e){}
  
  // Dates
  try { form.getTextField('Day').setText(data.onsetDay || ''); } catch(e){}
  try { form.getTextField('Month').setText(data.onsetMonth || ''); } catch(e){}
  try { form.getTextField('Year').setText(data.onsetYear || ''); } catch(e){}

  try { form.getTextField('Day2').setText(data.endDay || ''); } catch(e){}
  try { form.getTextField('Month2').setText(data.endMonth || ''); } catch(e){}
  try { form.getTextField('Year2').setText(data.endYear || ''); } catch(e){}

  // Drugs
  try { form.getTextField('Suspect_Drugs').setText(data.suspectDrug || ''); } catch(e){}
  try { form.getTextField('Daily_Doses').setText(data.dailyDose || ''); } catch(e){}
  try { form.getTextField('Routes_of_Admin').setText(data.route || ''); } catch(e){}
  try { form.getTextField('Indications').setText(data.indication || ''); } catch(e){}
  try { form.getTextField('Therapy').setText(data.therapyDates || ''); } catch(e){}
  try { form.getTextField('Duration').setText(data.duration || ''); } catch(e){}

  try { form.getTextField('Concomitant').setText(data.concomitant || ''); } catch(e){}
  try { form.getTextField('History').setText(data.history || ''); } catch(e){}

  // Manufacturer
  try { form.getTextField('Manu_Name-Add').setText(data.manufacturer || ''); } catch(e){}
  try { form.getTextField('Control').setText(data.controlNo || ''); } catch(e){}
  try { form.getTextField('Date_Rec').setText(data.dateReceived || ''); } catch(e){}
  try { form.getTextField('Report_Date').setText(data.reportDate || ''); } catch(e){}

  // Checkboxes (Spontaneous report, etc.)
  try { if (data.isSpontaneous) form.getCheckBox('Check14').check(); } catch(e){} // Example checkbox

  // Serialize the PDFDocument to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save();

  // Trigger the browser to download the PDF document
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `CIOMS_Form_${data.controlNo || 'Generated'}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}

export async function generateAdrPdf(data) {
  // Fetch the PDF from the public folder
  const url = '/adr-form.pdf';
  const existingPdfBytes = await fetch(url).then((res) => res.arrayBuffer());

  // Load a PDFDocument from the existing PDF bytes
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  // Get the form containing all the fields
  const form = pdfDoc.getForm();

  // 1. Patient Details
  try { form.getTextField('Text Field0').setText(data.initials || ''); } catch(e){} // Initials
  try { form.getTextField('Text Field1').setText(data.age || ''); } catch(e){} // Age
  try { form.getTextField('Text Field2').setText(data.sex || ''); } catch(e){} // Sex
  try { form.getTextField('Text Field4').setText(data.weight || ''); } catch(e){} // Weight

  // 2. Suspected Adverse Reaction
  const onset = [data.onsetDay, data.onsetMonth, data.onsetYear].filter(Boolean).join('-');
  try { form.getTextField('Text Field5').setText(onset); } catch(e){} // Date of reaction started
  const end = [data.endDay, data.endMonth, data.endYear].filter(Boolean).join('-');
  try { form.getTextField('Text Field6').setText(end); } catch(e){} // Date of recovery
  try { form.getTextField('Text Field7').setText(data.description || ''); } catch(e){} // Description of reaction

  // 3. Suspected Medication(s)
  try { form.getTextField('Text Field10').setText(data.suspectDrug || ''); } catch(e){} // Name
  try { form.getTextField('Text Field11').setText(data.manufacturer || ''); } catch(e){} // Manufacturer
  try { form.getTextField('Text Field14').setText(data.dailyDose || ''); } catch(e){} // Dose
  try { form.getTextField('Text Field15').setText(data.route || ''); } catch(e){} // Route
  try { form.getTextField('Text Field17').setText(data.therapyDates || ''); } catch(e){} // Date Started
  try { form.getTextField('Text Field19').setText(data.indication || ''); } catch(e){} // Reason for prescription

  // Concomitant
  try { form.getTextField('Text Field21').setText(data.concomitant || ''); } catch(e){} // Concomitant Name

  // 4. Reporter Details
  try { form.getTextField('Text Field38').setText(data.reporterName || ''); } catch(e){} // Name and Professional Address
  try { form.getTextField('Text Field46').setText(data.reportDate || ''); } catch(e){} // Date of this report

  // AMC / Office Use
  try { form.getTextField('Text Field3').setText(data.controlNo || ''); } catch(e){} // AMC Report No

  // Serialize the PDFDocument to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save();

  // Trigger the browser to download the PDF document
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `ADR_Form_${data.controlNo || 'Generated'}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
