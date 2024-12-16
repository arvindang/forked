document.addEventListener("DOMContentLoaded", () => {
  const DOCUMENTS_KEY = "documents"; // LocalStorage key
  const originEditorElement = document.getElementById("origin-editor");
  const forkContainer = document.getElementById("editors");
  const forkTitle = document.getElementById("fork-title");

  // Load all documents or initialize with default "origin" content
  let documents = JSON.parse(localStorage.getItem(DOCUMENTS_KEY)) || {
    origin: {
      id: "origin",
      title: "Origin Document",
      content: "**# The Harmony of Nature**\n\nWrite your document here...",
      parentId: null,
    }
  };

  // Initialize Origin Editor
  const originEditor = new EasyMDE({
    element: originEditorElement,
    autofocus: true,
    spellChecker: false,
  });
  originEditor.value(documents["origin"].content);

  // Save changes to localStorage when the user edits the origin document
  originEditor.codemirror.on("change", () => {
    documents["origin"].content = originEditor.value();
    saveToLocalStorage();
  });

  // Function to save all documents to LocalStorage
  function saveToLocalStorage() {
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
  }

  // Generate a unique ID for forks
  function generateUUID() {
    return `fork-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Add a forked editor dynamically to the right column
  function addForkedEditor(forkId) {
    forkTitle.style.display = "block"; // Show fork title
    forkContainer.innerHTML = ""; // Clear previous forks for now

    // Create controls and editor dynamically
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
      <textarea id="editor-${forkId}"></textarea>
    `;
    forkContainer.appendChild(forkEditorContainer);

    const forkEditorElement = document.getElementById(`editor-${forkId}`);
    const forkEditor = new EasyMDE({
      element: forkEditorElement,
      autofocus: true,
      spellChecker: false,
    });
    forkEditor.value(documents[forkId].content);

    forkEditor.codemirror.on("change", () => {
      documents[forkId].content = forkEditor.value();
      saveToLocalStorage();
    });
  }

  // Event delegation for all fork buttons
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("fork-btn")) {
      const documentId = e.target.getAttribute("data-document-id");
      handleFork(documentId);
    }
  });

  // Handle Fork Button Click
  function handleFork(documentId) {
    const forkId = generateUUID();

    // Create a new fork with the same content as the specified document
    documents[forkId] = {
      id: forkId,
      title: `Fork of ${documents[documentId].title}`,
      content: documents[documentId].content,
      parentId: documentId,
    };
    saveToLocalStorage();

    // Load the forked document into the right column
    addForkedEditor(forkId);
    alert(`Document forked! New Fork ID: ${forkId}`);
  }
});
