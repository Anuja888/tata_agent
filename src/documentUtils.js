import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const DOC_RULES = {
  "Aadhaar Card": {
    keywords: ["aadhaar", "uidai", "government of india", "unique identification"],
    regex: /(?:\b\d{4}\s?\d{4}\s?\d{4}\b|\b\d{12}\b)/,
    expectedFields: ["aadhaar", "uidai", "name", "dob", "address"],
  },
  "PAN Card": {
    keywords: ["pan", "income tax", "permanent account number"],
    regex: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/,
    expectedFields: ["pan", "name", "father", "dob", "income tax"],
  },
  "Bank Statement": {
    keywords: ["account number", "transactions", "bank", "balance", "ifsc"],
    expectedFields: ["account number", "transactions", "bank", "balance"],
  },
  "Salary Slip": {
    keywords: ["employee name", "net salary", "employer", "earnings", "deductions"],
    expectedFields: ["employee", "employer", "net salary", "salary", "deductions"],
  },
  "Address Proof": {
    keywords: ["address", "resident", "utility bill", "passport", "voter"],
    expectedFields: ["address", "name", "city", "state", "postal"],
  },
};

export async function extractTextFromFile(file) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return await extractTextFromPdf(file);
  }
  if (file.type.startsWith("image/")) {
    return await extractTextFromImage(file);
  }
  return "";
}

async function extractTextFromPdf(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    const maxPages = Math.min(pdf.numPages, 5);
    for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(" ");
      text += ` ${pageText}`;
    }
    return text.trim();
  } catch (error) {
    console.error("PDF extraction failed", error);
    return "";
  }
}

async function extractTextFromImage(file) {
  try {
    const result = await Tesseract.recognize(file, "eng", {
      logger: (m) => {
        // progress logging is optional and handled by UI if needed
      },
    });
    return result.data.text || "";
  } catch (error) {
    console.error("Image OCR failed", error);
    return "";
  }
}

export function buildVerificationPrompt({ docType, fileName, fileType, extractedText, notes, ocrError }) {
  return `The user uploaded a document claimed as ${docType}.
File name: ${fileName}
File MIME type: ${fileType}

Extracted content:
${extractedText || "<no text extracted>"}

Verification notes:
${notes}

Please respond as a Tata Capital Verification Specialist with a short verification summary. Include:
- document validity verdict (VERIFIED / NEEDS REVIEW / REJECTED)
- whether the format looks valid
- any missing expected fields
- document clarity
- status line at the end.

Do not add unrelated onboarding text.`;
}

export function verifyDocumentFields(docType, extractedText, file) {
  const lowerText = extractedText.toLowerCase();
  const rule = DOC_RULES[docType];
  const notes = [];
  const issues = [];
  let status = "VERIFIED";

  if (!extractedText || extractedText.trim().length < 15) {
    notes.push("OCR returned very little text; document may be blurry or unreadable.");
    issues.push("low_confidence_ocr");
    status = "NEEDS REVIEW";
  }

  if (file.type === "application/pdf") {
    notes.push("PDF document detected.");
  } else if (file.type.startsWith("image/")) {
    notes.push("Image document detected.");
  } else {
    notes.push("Unsupported file type.");
    issues.push("unsupported_file_type");
    status = "REJECTED";
  }

  if (rule) {
    const matches = rule.expectedFields.filter((field) => lowerText.includes(field));
    if (matches.length < 2) {
      notes.push("Expected document keywords are missing or incomplete.");
      issues.push("missing_fields");
      status = status === "REJECTED" ? status : "NEEDS REVIEW";
    }

    const containsKeyword = rule.keywords.some((keyword) => lowerText.includes(keyword));
    if (!containsKeyword) {
      notes.push(`Expected ${docType} keywords not found.`);
      issues.push("keyword_mismatch");
      status = status === "REJECTED" ? status : "NEEDS REVIEW";
    }

    const regexMatch = rule.regex.test(extractedText);
    if (!regexMatch) {
      notes.push(`${docType} specific format appears invalid.`);
      issues.push("format_mismatch");
      status = status === "REJECTED" ? status : "NEEDS REVIEW";
    }
  } else {
    notes.push("Unknown document type for verification.");
    issues.push("unknown_doc_type");
    status = "NEEDS REVIEW";
  }

  if (lowerText.includes("sample") || lowerText.includes("specimen")) {
    notes.push("Detected sample/specimen text; document may not be a real issued document.");
    issues.push("sample_text_detected");
    status = "REJECTED";
  }

  return {
    status,
    notes,
    issues,
    extractedText,
    confidence: Math.min(100, Math.max(20, Math.floor(extractedText.length / 5))),
  };
}
