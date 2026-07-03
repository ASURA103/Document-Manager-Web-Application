import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph } from "docx";

/* ---------------- TXT ---------------- */

export const exportTXT = (title, content) => {
  const fileName = title.trim() || "Untitled";

  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8",
  });

  saveAs(blob, `${fileName}.txt`);
};

/* ---------------- MARKDOWN ---------------- */

export const exportMD = (title, content) => {
  const fileName = title.trim() || "Untitled";

  const blob = new Blob([content], {
    type: "text/markdown;charset=utf-8",
  });

  saveAs(blob, `${fileName}.md`);
};

/* ---------------- PDF ---------------- */

export const exportPDF = (title, content) => {
  const fileName = title.trim() || "Untitled";

  const pdf = new jsPDF();

  const lines = pdf.splitTextToSize(content, 180);

  pdf.text(lines, 15, 20);

  pdf.save(`${fileName}.pdf`);
};

/* ---------------- DOCX ---------------- */

export const exportDOCX = async (title, content) => {
  const fileName = title.trim() || "Untitled";

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: content,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);

  saveAs(blob, `${fileName}.docx`);
};