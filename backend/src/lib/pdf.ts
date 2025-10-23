import { PDFDocument, PDFForm, PDFTextField, PDFButton, rgb } from 'pdf-lib';
import { FieldDef, FieldValue, FieldType } from '@grud-sign/shared';

export interface PDFProcessingResult {
  flattenedPdfBytes: Uint8Array;
  pageCount: number;
}

export class PDFProcessor {
  static async validatePDF(pdfBuffer: Buffer): Promise<{ isValid: boolean; pageCount?: number; error?: string }> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pageCount = pdfDoc.getPageCount();

      if (pageCount > 50) {
        return { isValid: false, error: 'PDF exceeds maximum page limit of 50' };
      }

      return { isValid: true, pageCount };
    } catch (error) {
      return { isValid: false, error: 'Invalid PDF file' };
    }
  }

  static async createSigningForm(pdfBuffer: Buffer, fields: FieldDef[]): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const form = pdfDoc.getForm();

    for (const field of fields) {
      const page = pdfDoc.getPage(field.page);
      const { width: pageWidth, height: pageHeight } = page.getSize();

      // Convert coordinates (PDF uses bottom-left origin, we use top-left)
      const pdfY = pageHeight - field.y - field.height;

      try {
        if (field.type === 'signature' || field.type === 'text') {
          const textField = form.createTextField(field.id);
          textField.addToPage(page, {
            x: field.x,
            y: pdfY,
            width: field.width,
            height: field.height,
            borderColor: rgb(0.5, 0.5, 0.5),
            backgroundColor: rgb(0.95, 0.95, 0.95),
          });

          if (field.placeholder) {
            textField.setText('');
          }

          if (field.type === 'signature') {
            textField.setFontSize(12);
          }
        } else if (field.type === 'date') {
          const dateField = form.createTextField(field.id);
          dateField.addToPage(page, {
            x: field.x,
            y: pdfY,
            width: field.width,
            height: field.height,
            borderColor: rgb(0.5, 0.5, 0.5),
            backgroundColor: rgb(0.95, 0.95, 0.95),
          });
          dateField.setText('');
        }
      } catch (error) {
        console.warn(`Failed to create field ${field.id}:`, error);
      }
    }

    return await pdfDoc.save();
  }

  static async fillAndFlattenPDF(
    pdfBuffer: Buffer,
    fieldValues: FieldValue[]
  ): Promise<PDFProcessingResult> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const form = pdfDoc.getForm();

    // Fill form fields
    for (const fieldValue of fieldValues) {
      try {
        const field = form.getField(fieldValue.fieldId);

        if (field instanceof PDFTextField) {
          let value = fieldValue.value;

          // Format date fields
          if (fieldValue.type === 'date' && value) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              value = date.toLocaleDateString('en-US');
            }
          }

          field.setText(value);
        }
      } catch (error) {
        console.warn(`Failed to fill field ${fieldValue.fieldId}:`, error);
      }
    }

    // Flatten the form (make fields non-editable)
    form.flatten();

    const flattenedPdfBytes = await pdfDoc.save();

    return {
      flattenedPdfBytes,
      pageCount: pdfDoc.getPageCount(),
    };
  }

  static async extractMetadata(pdfBuffer: Buffer): Promise<{
    pageCount: number;
    title?: string;
    author?: string;
    subject?: string;
  }> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    return {
      pageCount: pdfDoc.getPageCount(),
      title: pdfDoc.getTitle(),
      author: pdfDoc.getAuthor(),
      subject: pdfDoc.getSubject(),
    };
  }
}