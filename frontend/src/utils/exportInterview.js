function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function filenameFor(interview, extension) {
  const label = `${interview.role || "interview"}-${interview.company || "practice"}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `interviewai-${label}.${extension}`;
}

function interviewDocument({ interview, candidate, questions }) {
  const date = interview.created_at ? new Date(interview.created_at).toLocaleString() : "Date unavailable";
  const questionMarkup = questions.map((item, index) => `
    <section class="question">
      <div class="question-title"><span>QUESTION ${String(index + 1).padStart(2, "0")}</span>${item.skill ? `<span class="skill">${escapeHtml(item.skill)}</span>` : ""}</div>
      <p class="prompt">${escapeHtml(item.question)}</p>
      <div class="answer-label">YOUR ANSWER</div>
      <p class="answer">${escapeHtml(item.answer?.trim() || "No answer was recorded.")}</p>
    </section>`).join("");
  const sourcesMarkup = (interview.research_sources || []).map((source) => `<li><a href="${escapeHtml(source.url)}">${escapeHtml(source.title || source.url)}</a></li>`).join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(interview.role)} · InterviewAI</title>
    <style>
      @page { size: A4; margin: 18mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #142238; background: #f5f4ef; font: 14px/1.6 Arial, sans-serif; }
      .sheet { max-width: 780px; margin: 28px auto; padding: 34px; border: 1px solid #25c6b0; background: #fffefa; }
      .brand { color: #25a995; font-size: 12px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
      h1 { margin: 9px 0 2px; font: 700 28px/1.2 Georgia, serif; }
      .company { margin: 0; color: #60716e; font-size: 16px; }
      .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; margin: 22px 0 26px; padding: 15px; border: 1px solid #d8e5df; background: #f2f8f5; }
      .meta div { min-width: 0; }.meta b { display: block; color: #238f82; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; }.meta span { overflow-wrap: anywhere; }
      .question { margin: 15px 0; padding: 17px 19px; border: 1px solid #d7e1dc; page-break-inside: avoid; }
      .question-title { display: flex; justify-content: space-between; gap: 10px; color: #238f82; font-size: 10px; font-weight: 800; letter-spacing: .1em; }
      .skill { padding: 2px 8px; border-radius: 20px; background: #e7f7f2; letter-spacing: 0; }
      .prompt { margin: 10px 0 15px; color: #142238; font-size: 14px; font-weight: 700; }
      .answer-label { color: #72837e; font-size: 10px; font-weight: 800; letter-spacing: .12em; }
      .answer { margin: 5px 0 0; color: #475956; font-size: 12px; white-space: pre-wrap; }
      .sources { margin-top: 24px; padding-top: 13px; border-top: 1px solid #cfded8; color: #53635f; font-size: 11px; }
      .sources strong { display: block; color: #238f82; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; }
      .sources a { color: #142238; }
      @media print { body { background: #fff; } .sheet { max-width: none; margin: 0; border: 1px solid #25c6b0; padding: 0; } }
    </style></head><body><main class="sheet">
      <div class="brand">InterviewAI · Practice record</div>
      <h1>${escapeHtml(interview.role || "Interview")}</h1>
      <p class="company">${escapeHtml(interview.company || "Company not provided")}</p>
      <div class="meta"><div><b>Interview date</b><span>${escapeHtml(date)}</span></div><div><b>Candidate</b><span>${escapeHtml(candidate?.name || "")}</span></div><div><b>Email</b><span>${escapeHtml(candidate?.email || "")}</span></div><div><b>Phone</b><span>${escapeHtml(candidate?.phone_number || "Not provided")}</span></div></div>
      ${questionMarkup || "<p>No questions were saved for this interview.</p>"}
      ${sourcesMarkup ? `<footer class="sources"><strong>Research references</strong><ul>${sourcesMarkup}</ul></footer>` : ""}
    </main></body></html>`;
}

async function saveBlob(blob, suggestedName, description, accept) {
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description, accept }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
      // Some browsers expose the picker but reject application/msword files.
      // Fall through to the regular download path in that case.
    }
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = suggestedName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function saveInterviewDoc(data) {
  try {
    const documentHtml = interviewDocument(data);
    const blob = new Blob([documentHtml], { type: "application/msword;charset=utf-8" });
    await saveBlob(blob, filenameFor(data.interview, "doc"), "Word document", { "application/msword": [".doc"] });
  } catch {
    window.alert("InterviewAI couldn't save the document. Check your browser's download permissions and try again.");
  }
}

export function printInterviewPdf(data) {
  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) {
    window.alert("Allow pop-ups for InterviewAI to prepare the PDF. Choose Save as PDF in the print dialog.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(interviewDocument(data));
  printWindow.document.close();
  printWindow.document.title = filenameFor(data.interview, "pdf");
  printWindow.focus();
  // about:blank print windows do not consistently fire `load` after document.write.
  // A short delay lets the stylesheet/layout settle before opening the native
  // dialog where the user can choose “Save as PDF”.
  window.setTimeout(() => printWindow.print(), 180);
}
