document.addEventListener("DOMContentLoaded", () => {
  const DOCUMENTS_KEY = "documents"; // LocalStorage key
  const forkContainer = document.getElementById("editors"); // Right column container
  const forkTitle = document.getElementById("fork-title"); // Header for forked editors
  const originEditorElement = document.getElementById("origin-editor"); // Origin editor textarea
  const originSelect = document.getElementById("origin-select"); // Left column dropdown
  const forkSelect = document.getElementById("fork-select"); // Right column dropdown

  let documents = loadDocuments();
  initializeOriginEditor();
  displayMostRecentFork();
  populateForkSelector();

  document.body.addEventListener("click", handleButtonClick);
  forkSelect.addEventListener("change", handleForkSelection);
  originSelect.addEventListener("change", handleOriginSelection);

  function loadDocuments() {
    // return JSON.parse(localStorage.getItem(DOCUMENTS_KEY)) || initializeDocuments();

    let loadedDocs = JSON.parse(localStorage.getItem(DOCUMENTS_KEY));
    if (!loadedDocs || !loadedDocs.origin || !loadedDocs.origin.id) {
        loadedDocs = initializeDocuments();
    }
    return loadedDocs;
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

  function displayMostRecentFork() {
    const forkIds = Object.keys(documents).filter(key => key !== "origin");
    if (forkIds.length > 0) {
      const mostRecentForkId = forkIds[forkIds.length - 1]; // Assuming latest added key
      addForkedEditor(mostRecentForkId);
    }
  }

  function saveToLocalStorage(data = documents) {
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(data));
  }

  function generateUUID() {
    return `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  function initializeOriginEditor() {
    const originId = documents.origin.id;
    originEditor = new EasyMDE({
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

  function populateForkSelector() {
    const forkIds = Object.keys(documents).filter(key => key !== "origin");
    const originId = documents.origin.id;

    // Clear current options
    originSelect.innerHTML = '<option value="">Select a Fork</option>';
    forkSelect.innerHTML = '<option value="">Select a Fork</option>';

    // Add origin document to both dropdowns
    const originOption = document.createElement("option");
    originOption.value = originId;
    originOption.textContent = `${documents[originId].title} (${originId})`;
    originSelect.appendChild(originOption);

    // Populate both dropdowns with forks
    forkIds.forEach(forkId => {
      const option = document.createElement("option");
      option.value = forkId;
      option.textContent = `${documents[forkId].title} (${forkId})`;

      originSelect.appendChild(option.cloneNode(true));
      forkSelect.appendChild(option);
    });
  }

  function handleButtonClick(e) {
    if (e.target.classList.contains("fork-btn")) {
      const documentId = e.target.getAttribute("data-document-id");
      handleFork(documentId);
    }
  }

  function handleFork(documentId) {
    // Get the actual document ID if "origin" is passed
    const actualDocumentId = documentId === "origin" ? documents.origin.id : documentId;
    
    const forkId = generateUUID();
    documents[forkId] = {
        id: forkId,
        title: `Fork of ${documents[actualDocumentId].title}`,
        content: documents[actualDocumentId].content,
        parentId: actualDocumentId,  // Use the actual document ID
    };
    saveToLocalStorage();
    populateForkSelector();
    addForkedEditor(forkId);
    
    // Set the origin dropdown to show the document being forked
    originSelect.value = actualDocumentId;
  }

  function addForkedEditor(forkId) {
    forkTitle.style.display = "block";
    forkContainer.innerHTML = "";    

    const forkEditorContainer = document.createElement("div");
    forkEditorContainer.innerHTML = `
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

  function handleForkSelection(e) {
    const selectedForkId = e.target.value;
    if (selectedForkId) {
        addForkedEditor(selectedForkId);
    } else {
        // Clear both the fork container and fork button when no fork is selected
        forkContainer.innerHTML = "";
        document.getElementById('fork-button-container').innerHTML = "";
        forkTitle.style.display = "none";
    }
  }

  function handleOriginSelection(e) {
    const selectedDocumentId = e.target.value;
    if (selectedDocumentId) {
      // Update the origin editor with the selected document's content
      originEditor.value(documents[selectedDocumentId].content);
      documents.origin.id = selectedDocumentId;
      saveToLocalStorage();
    }
  }
});