document.addEventListener("DOMContentLoaded", () => {
  const DOCUMENTS_KEY = "documents"; // LocalStorage key
  const forkContainer = document.getElementById("editors"); // Right column container
  const forkTitle = document.getElementById("fork-title"); // Header for forked editors
  const originEditorElement = document.getElementById("origin-editor"); // Origin editor textarea
  const singleColumnBtn = document.getElementById("single-column");
  const twoColumnsBtn = document.getElementById("two-columns");
  let isSingleColumn = false;

  let documents = loadDocuments();
  initializeOriginEditor();
  displayMostRecentFork();

  document.body.addEventListener("click", handleButtonClick);
  singleColumnBtn.addEventListener("click", (e) => {
    e.preventDefault();
    setColumnLayout(true);
  });
  twoColumnsBtn.addEventListener("click", (e) => {
    e.preventDefault();
    setColumnLayout(false);
  });

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
      const mostRecentForkId = forkIds[forkIds.length - 1];
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
        const currentDocId = documents.origin.id;
        if (currentDocId) {
            documents[currentDocId].content = originEditor.value();
            saveToLocalStorage();
        }
    });

    // Add controls above the editor
    const controls = updateEditorControls(originEditorElement.parentElement, documents.origin.id);
    originEditorElement.parentElement.insertBefore(controls, originEditorElement);
  }

  function handleButtonClick(e) {
    if (e.target.classList.contains("fork-btn")) {
      const documentId = e.target.getAttribute("data-document-id");
      handleFork(documentId);
    }
  }

  function handleFork(documentId) {
    const actualDocumentId = documentId === "origin" ? documents.origin.id : documentId;
    
    const forkId = generateUUID();
    documents[forkId] = {
        id: forkId,
        title: `Fork of ${documents[actualDocumentId].title}`,
        content: documents[actualDocumentId].content,
        parentId: actualDocumentId,
    };
    saveToLocalStorage();
    addForkedEditor(forkId);
  }

  function addForkedEditor(forkId) {
    forkTitle.style.display = "block";
    forkContainer.innerHTML = "";    

    const forkEditorContainer = document.createElement("div");
    forkEditorContainer.innerHTML = `
        <textarea id="editor-${forkId}" data-document-id="${forkId}"></textarea>
    `;
    
    // Add controls before the editor
    const controls = updateEditorControls(forkEditorContainer, forkId);
    forkEditorContainer.insertBefore(controls, forkEditorContainer.firstChild);
    
    forkContainer.appendChild(forkEditorContainer);

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
        documents[forkId].content = forkEditor.value();
        saveToLocalStorage();
    });
  }

  function setColumnLayout(showSingleColumn) {
    isSingleColumn = showSingleColumn;
    
    // More specific selectors to ensure we find the columns
    const leftColumn = document.querySelector('.container-fluid .row > .col-lg-6:first-child, .container-fluid .row > .col-lg-12');
    const rightColumn = document.querySelector('.container-fluid .row > .col-lg-6:last-child');
    
    if (!leftColumn || !rightColumn) {
        console.error('Could not find column elements');
        return;
    }
    
    // Toggle visibility of the buttons
    singleColumnBtn.style.display = isSingleColumn ? 'none' : 'block';
    twoColumnsBtn.style.display = isSingleColumn ? 'block' : 'none';
    
    if (isSingleColumn) {
      // Switch to single column
      leftColumn.classList.remove('col-lg-6', 'border-end');
      leftColumn.classList.add('col-lg-12');
      rightColumn.style.display = 'none';  // Hide entire right column
    } else {
      // Switch back to two columns
      leftColumn.classList.remove('col-lg-12');
      leftColumn.classList.add('col-lg-6', 'border-end');
      rightColumn.style.display = 'block';  // Show entire right column
    }
    
    // Trigger resize event to make editors adjust their size
    window.dispatchEvent(new Event('resize'));
  }

  function createForkSelectorPanel(currentDocId, onSelect) {
    const panel = document.createElement('div');
    panel.className = 'fork-selector-panel';
    
    // Create header with close button
    const header = document.createElement('div');
    header.className = 'fork-selector-header';
    header.innerHTML = `
        <h5>Select Document</h5>
        <button class="btn-close" aria-label="Close"></button>
    `;
    panel.appendChild(header);

    // Create content container
    const content = document.createElement('div');
    content.className = 'fork-selector-content';
    
    // Build tree structure
    const tree = buildDocumentTree();
    content.appendChild(renderDocumentTree(tree, currentDocId, onSelect));
    panel.appendChild(content);

    // Handle close button
    header.querySelector('.btn-close').addEventListener('click', () => {
        panel.remove();
    });

    return panel;
  }

  function buildDocumentTree() {
    const tree = { children: [] };
    const docMap = new Map();

    // Add origin document as root
    const originDoc = {
        ...documents[documents.origin.id],
        children: [],
        title: "Origin Document"
    };
    tree.children.push(originDoc);
    docMap.set(documents.origin.id, originDoc);

    // Create nodes for all documents except the 'origin' key and origin document
    Object.entries(documents).forEach(([id, doc]) => {
        // Skip the 'origin' reference object and the origin document itself
        if (id === 'origin' || id === documents.origin.id) return;
        
        // Create node if it doesn't exist
        if (!docMap.has(id)) {
            docMap.set(id, {
                ...doc,
                children: [],
                title: doc.title || `Document ${id}`
            });
        }
    });

    // Build parent-child relationships
    docMap.forEach((doc, id) => {
        // Skip the origin document since it's already at root
        if (id === documents.origin.id) return;
        
        if (doc.parentId) {
            const parent = docMap.get(doc.parentId);
            if (parent) {
                parent.children.push(doc);
            } else {
                // If parent not found, add to root
                tree.children.push(doc);
            }
        } else {
            // If no parent, add to root level
            tree.children.push(doc);
        }
    });

    // For debugging
    console.log('Documents:', documents);
    console.log('Tree structure:', tree);
    console.log('DocMap:', docMap);

    return tree;
  }

  function renderDocumentTree(node, currentDocId, onSelect) {
    const container = document.createElement('div');
    container.className = 'document-tree';

    if (node.id) {
        const item = document.createElement('div');
        item.className = `tree-item ${node.id === currentDocId ? 'active' : ''}`;
        item.innerHTML = `
            <div class="tree-item-content">
                <span class="tree-item-title">${node.title || 'Untitled'}</span>
                <span class="tree-item-id">(${node.id})</span>
            </div>
        `;
        item.addEventListener('click', () => {
            onSelect(node.id);
        });
        container.appendChild(item);
    }

    if (node.children && node.children.length > 0) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-children';
        node.children.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        node.children.forEach(child => {
            childrenContainer.appendChild(
                renderDocumentTree(child, currentDocId, onSelect)
            );
        });
        container.appendChild(childrenContainer);
    }

    return container;
  }

  function updateEditorControls(editorContainer, documentId) {
    const controls = document.createElement('div');
    controls.className = 'editor-controls';
    controls.innerHTML = `
        <button class="btn btn-outline-secondary select-fork-btn">
            Select Different Fork
        </button>
        <button class="fork-btn btn btn-outline-secondary" data-document-id="${documentId}">
            Fork
        </button>
    `;
    
    // Add event listener for select fork button
    controls.querySelector('.select-fork-btn').addEventListener('click', (e) => {
        const panel = createForkSelectorPanel(documentId, (selectedId) => {
            if (documentId === documents.origin.id || documentId === 'origin') {
                // For origin editor
                documents.origin.id = selectedId;
                saveToLocalStorage();
                originEditor.value(documents[selectedId].content);
            } else {
                // For fork editor
                addForkedEditor(selectedId);
            }
            panel.remove();
        });
        document.body.appendChild(panel);
    });

    return controls;
  }

  function handleOriginSelection(event) {
    const selectedId = event.target.value;
    if (selectedId) {
        documents.origin.id = selectedId;
        saveToLocalStorage();
        originEditor.value(documents[selectedId].content);
    }
  }

  function handleForkSelection(event) {
    const selectedId = event.target.value;
    if (selectedId) {
        addForkedEditor(selectedId);
    }
  }
});