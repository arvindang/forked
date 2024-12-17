document.addEventListener("DOMContentLoaded", () => {
  const DOCUMENTS_KEY = "documents"; // LocalStorage key
  const forkContainer = document.getElementById("editors"); // Right column container
  const forkTitle = document.getElementById("fork-title"); // Header for forked editors
  const originEditorElement = document.getElementById("origin-editor"); // Origin editor textarea

  let documents = loadDocuments();
  initializeOriginEditor();
  document.body.addEventListener("click", handleButtonClick);

  function loadDocuments() {
    return JSON.parse(localStorage.getItem(DOCUMENTS_KEY)) || initializeDocuments();
  }

  function initializeDocuments() {
    const originId = generateUUID();
    const initialDocs = {
      [originId]: {
        id: originId,
        title: "Origin Document",
        content: "Write in Markdown here...",
        parentId: null,
      },
      origin: { id: originId },
    };
    saveToLocalStorage(initialDocs);
    return initialDocs;
  }

  function saveToLocalStorage(data = documents) {
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(data));
  }

  function generateUUID() {
    return `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  function initializeOriginEditor() {
    const originId = documents.origin.id;
    const originEditor = new EasyMDE({
      element: originEditorElement,
      autofocus: true,
      spellChecker: false,
    });
    originEditor.value(documents[originId].content);

    originEditor.codemirror.on("change", () => {
      documents[originId].content = originEditor.value();
      saveToLocalStorage();
    });
  }

  function handleButtonClick(e) {
    if (e.target.classList.contains("fork-btn")) {
      const documentId = e.target.getAttribute("data-document-id");
      handleFork(documentId);
    }
  }

  function handleFork(documentId) {
    const forkId = generateUUID();
    documents[forkId] = {
      id: forkId,
      title: `Fork of ${documents[documentId].title}`,
      content: documents[documentId].content,
      parentId: documentId,
    };
    saveToLocalStorage();
    addForkedEditor(forkId);
  }

  function addForkedEditor(forkId) {
    forkTitle.style.display = "block";
    forkContainer.innerHTML = "";

    const forkEditorContainer = document.createElement("div");
    forkEditorContainer.innerHTML = `
      <div class="row mb-2">
          <div class="col">
              <select class="form-select w-auto d-inline-block">
                  <option>${documents[forkId].title}</option>
              </select>
              <button class="fork-btn btn btn-outline-secondary mx-1" data-document-id="${forkId}">Fork</button>
              <button class="btn btn-outline-secondary mx-1">Export</button>
              <button class="btn btn-outline-secondary mx-1">Version History</button>
          </div>
      </div>
      <textarea id="editor-${forkId}" data-document-id="${forkId}"></textarea>
    `;
    forkContainer.appendChild(forkEditorContainer);

    const forkEditor = new EasyMDE({
      element: document.getElementById(`editor-${forkId}`),
      autofocus: true,
      spellChecker: false,
    });
    forkEditor.value(documents[forkId].content);

    forkEditor.codemirror.on("change", () => {
      documents[forkId].content = forkEditor.value();
      saveToLocalStorage();
    });
  }
});
