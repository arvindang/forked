document.addEventListener("DOMContentLoaded", () => {
  const DOCUMENTS_KEY = "documents"; // LocalStorage key
  const forkContainer = document.getElementById("editors"); // Right column container
  const forkTitle = document.getElementById("fork-title"); // Header for forked editors
  const originEditorElement = document.getElementById("origin-editor"); // Origin editor textarea
  const originSelect = document.getElementById("origin-select"); // Left column dropdown
  const forkSelect = document.getElementById("fork-select"); // Right column dropdown

  let documents = loadDocuments();
  populateForkSelector();
  initializeOriginEditor();
  displayMostRecentFork();

  // Update originSelect to show current origin
  originSelect.value = documents.origin.id;

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
    
    // Set initial value without triggering change event
    const originalChangeHandler = originEditor.codemirror.getOption('onChange');
    originEditor.codemirror.setOption('onChange', null);
    originEditor.value(documents[originId].content);
    originEditor.codemirror.setOption('onChange', originalChangeHandler);

    // Add change handler for future changes
    originEditor.codemirror.on("change", () => {
        // Save changes only to the currently selected document
        const currentDocId = originSelect.value;
        if (currentDocId) {
            documents[currentDocId].content = originEditor.value();
            saveToLocalStorage();
        }
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

    // Set the fork selector to match the current fork
    forkSelect.value = forkId;

    // Create a new editor instance for this fork
    const forkEditor = new EasyMDE({
      element: document.getElementById(`editor-${forkId}`),
      autofocus: true,
      spellChecker: false,
    });
    
    // Create a deep copy of the content for this fork
    if (!documents[forkId].content) {
        documents[forkId].content = documents[documents[forkId].parentId].content;
    }
    forkEditor.value(documents[forkId].content);

    forkEditor.codemirror.on("change", () => {
      // Update only this fork's content
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
        // Update only the origin editor with the selected document's content
        originEditor.value(documents[selectedDocumentId].content);

        // Simply change the active origin reference
        documents.origin.id = selectedDocumentId;
        saveToLocalStorage();
    }
  }

  function saveToLocalStorage(data = documents) {
    // Validate data integrity before saving
    Object.keys(data).forEach(key => {
        if (key !== "origin" && !data[key].content) {
            console.warn(`Missing content for document ID: ${key}`);
        }
    });
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(data));
  }
});