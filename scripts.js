document.addEventListener("DOMContentLoaded", () => {
  const DOCUMENTS_KEY = "documents";
  let documents = loadDocuments();

  // Editors
  let originEditor;
  let forkEditor; // We'll keep track of the most recent fork's editor here

  // HTML elements
  const forkContainer = document.getElementById("editors");
  const forkTitle = document.getElementById("fork-title");
  const originEditorElement = document.getElementById("origin-editor");
  const singleColumnBtn = document.getElementById("single-column");
  const twoColumnsBtn = document.getElementById("two-columns");
  const diffToggleBtn = document.getElementById("toggle-diff");
  const editorContainer = document.getElementById("editor-container");
  const diffViewContainer = document.getElementById("diff-view");

  const leftColumn = document.getElementById("origin-column");
  const rightColumn = document.getElementById("fork-column");

  // Track which editor is "active" based on focus
  let lastFocusedEditor = "origin"; // default

  let isSingleColumn = false;
  let isDiffMode = false;

  initializeOriginEditor();
  displayMostRecentFork();

  // Hook up nav button events
  singleColumnBtn.addEventListener("click", (e) => {
    e.preventDefault();
    setColumnLayout(true);
  });
  twoColumnsBtn.addEventListener("click", (e) => {
    e.preventDefault();
    setColumnLayout(false);
  });
  diffToggleBtn.addEventListener("click", (e) => {
    e.preventDefault();
    toggleDiffView();
  });

  // Listen for "fork" button clicks
  document.body.addEventListener("click", (e) => {
    if (e.target.classList.contains("fork-btn")) {
      const documentId = e.target.getAttribute("data-document-id");
      handleFork(documentId);
    }
  });

  /**
   * -------------------------
   *      Load Documents
   * -------------------------
   */
  function loadDocuments() {
    let loadedDocs = JSON.parse(localStorage.getItem(DOCUMENTS_KEY));
    if (!loadedDocs || !loadedDocs.origin || !loadedDocs.origin.id) {
      loadedDocs = initializeDocuments();
    }
    return loadedDocs;
  }

  function initializeDocuments() {
    const originId = generateUUID();
    const initialDocs = {
      origin: { id: originId },
      [originId]: {
        id: originId,
        title: "Origin Document",
        content: "Write in Markdown here...",
        parentId: null,
      },
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

  /**
   * -------------------------
   *  Initialize Origin Editor
   * -------------------------
   */
  function initializeOriginEditor() {
    const originId = documents.origin.id;
    originEditor = new EasyMDE({
      element: originEditorElement,
      autofocus: true,
      spellChecker: false,
    });

    // Load content
    originEditor.value(documents[originId].content);

    // Save changes
    originEditor.codemirror.on("change", () => {
      documents[originId].content = originEditor.value();
      saveToLocalStorage();
    });

    // Track focus for "active editor"
    originEditor.codemirror.on("focus", () => {
      lastFocusedEditor = "origin";
    });

    // Insert controls above text area
    const controls = updateEditorControls(
      originEditorElement.parentElement,
      documents.origin.id,
      "origin"
    );
    originEditorElement.parentElement.insertBefore(controls, originEditorElement);
  }

  /**
   * -------------------------
   *     Display Fork Editor
   * -------------------------
   */
  function displayMostRecentFork() {
    const forkIds = getAllForkIds();
    if (forkIds.length > 0) {
      // If there's at least one real fork
      if (forkIds.length === 1 && documents[forkIds[0]].parentId == null) return;
      const mostRecentForkId = forkIds[forkIds.length - 1];
      setColumnLayout(false);
      addForkedEditor(mostRecentForkId);
    } else {
      // No forks found
      setColumnLayout(true);
    }
  }

  function getAllForkIds() {
    return Object.keys(documents).filter((key) => key !== "origin");
  }

  function addForkedEditor(forkId) {
    forkTitle.style.display = "block";
    forkContainer.innerHTML = "";

    // Editor container
    const forkEditorContainer = document.createElement("div");
    forkEditorContainer.innerHTML = `
      <textarea id="editor-${forkId}" data-document-id="${forkId}"></textarea>
    `;

    const controls = updateEditorControls(forkEditorContainer, forkId, "fork");
    forkEditorContainer.insertBefore(controls, forkEditorContainer.firstChild);
    forkContainer.appendChild(forkEditorContainer);

    // Create the EasyMDE editor
    forkEditor = new EasyMDE({
      element: document.getElementById(`editor-${forkId}`),
      autofocus: true,
      spellChecker: false,
    });

    forkEditor.value(documents[forkId].content);

    // Listen for changes to save
    forkEditor.codemirror.on("change", () => {
      documents[forkId].content = forkEditor.value();
      saveToLocalStorage();
    });

    // Track focus (active editor)
    forkEditor.codemirror.on("focus", () => {
      lastFocusedEditor = "fork";
    });
  }

  /**
   * -------------------------
   *       Fork Handling
   * -------------------------
   */
  function handleFork(documentId) {
    // Actual doc ID
    const actualDocumentId =
      documentId === "origin" ? documents.origin.id : documentId;

    const forkId = generateUUID();
    documents[forkId] = {
      id: forkId,
      title: `Fork of ${documents[actualDocumentId].title || "Untitled"}`,
      content: documents[actualDocumentId].content,
      parentId: actualDocumentId,
    };
    saveToLocalStorage();

    // Show two columns and add the new fork editor
    setColumnLayout(false);
    addForkedEditor(forkId);
  }

  /**
   * -------------------------
   *   Column Layout Toggle
   * -------------------------
   */
  function setColumnLayout(showSingleColumn) {
    isSingleColumn = showSingleColumn;

    // Toggle column classes
    if (showSingleColumn) {
      leftColumn.classList.remove("col-lg-6", "border-end");
      leftColumn.classList.add("col-lg-12");
      rightColumn.style.display = "none";
      forkTitle.style.display = "none";
      singleColumnBtn.style.display = "none";
      twoColumnsBtn.style.display = "block";
    } else {
      leftColumn.classList.remove("col-lg-12");
      leftColumn.classList.add("col-lg-6", "border-end");
      rightColumn.style.display = "block";
      forkTitle.style.display = "block";
      singleColumnBtn.style.display = "block";
      twoColumnsBtn.style.display = "none";

      // If we already have a fork doc, make sure we show it
      const forkIds = getAllForkIds();
      if (forkIds.length > 0) {
        const mostRecentForkId = forkIds[forkIds.length - 1];
        const existingEditor = document.querySelector(`#editor-${mostRecentForkId}`);
        if (!existingEditor) {
          addForkedEditor(mostRecentForkId);
        }
      }
    }
    // Force a re-layout
    window.dispatchEvent(new Event("resize"));

    // If we toggle columns while in diff mode, ensure we re-render the diff as needed
    if (isDiffMode) {
      showDiff();
    }
  }

  /**
   * -------------------------
   *  Diff View Toggle / Show
   * -------------------------
   */
  function toggleDiffView() {
    isDiffMode = !isDiffMode;
    if (isDiffMode) {
      diffToggleBtn.textContent = "Show Editor";
      showDiff();
    } else {
      diffToggleBtn.textContent = "Show Diff";
      hideDiff();
    }
  }

  function showDiff() {
    // Hide editors, show diff container
    editorContainer.style.display = "none";
    diffViewContainer.style.display = "block";

    // Determine active vs. inactive doc content
    let originId = documents.origin.id;
    let forkIds = getAllForkIds();
    let forkId = forkIds.length > 0 ? forkIds[forkIds.length - 1] : null;

    // If we only have one column or no fork, we fallback to just origin vs origin (no changes, obviously)
    if (isSingleColumn || !forkId) {
      const text = documents[originId].content || "";
      renderDiff(text, text, "Origin", "Origin");
      return;
    }

    // Decide which is the "new" content (active) vs "old" content (inactive)
    let newContent = "";
    let oldContent = "";
    let newTitle = "";
    let oldTitle = "";

    if (lastFocusedEditor === "origin") {
      newContent = documents[originId].content || "";
      oldContent = documents[forkId].content || "";
      newTitle = documents[originId].title || "Origin";
      oldTitle = documents[forkId].title || "Forked";
    } else {
      newContent = documents[forkId].content || "";
      oldContent = documents[originId].content || "";
      newTitle = documents[forkId].title || "Forked";
      oldTitle = documents[originId].title || "Origin";
    }

    renderDiff(oldContent, newContent, oldTitle, newTitle);
  }

  function hideDiff() {
    // Show editors, hide diff container
    editorContainer.style.display = "block";
    diffViewContainer.style.display = "none";
  }

  function renderDiff(oldStr, newStr, oldName, newName) {
    // Generate a unified diff text string
    // If you want word-level diff, can do:
    //   let diff = Diff.createPatch( ... ) is typically for file patch
    // We'll use createTwoFilesPatch for clarity
    const diffString = Diff.createTwoFilesPatch(
      oldName,
      newName,
      oldStr,
      newStr,
      "", // old header
      "", // new header
      { context: 3 } // optional config
    );

    // Use Diff2Html to turn this into nice side-by-side HTML
    const diffHtml = Diff2Html.html(diffString, {
      drawFileList: false,
      matching: "words",
      outputFormat: "side-by-side",
    });

    // Inject into the diff container
    diffViewContainer.innerHTML = diffHtml;
  }

  /**
   * -------------------------
   *    Fork Selector Panel
   * -------------------------
   */
  function createForkSelectorPanel(currentDocId, onSelect) {
    const panel = document.createElement("div");
    panel.className = "fork-selector-panel";
    panel.style.overflowY = "auto";
    panel.style.maxHeight = "80vh";
    panel.style.background = "white";
    panel.style.border = "1px solid #ccc";
    panel.style.padding = "1rem";

    const header = document.createElement("div");
    header.className = "fork-selector-header";
    header.innerHTML = `
      <h5>Select Document</h5>
      <button class="btn-close" aria-label="Close"></button>
    `;
    panel.appendChild(header);

    const content = document.createElement("div");
    content.className = "fork-selector-content";

    const tree = buildDocumentTree();
    content.appendChild(renderDocumentTree(tree, currentDocId, onSelect));
    panel.appendChild(content);

    header.querySelector(".btn-close").addEventListener("click", () => {
      panel.remove();
    });

    return panel;
  }

  function buildDocumentTree() {
    const tree = { children: [] };
    const docMap = new Map();

    // Build map
    Object.entries(documents).forEach(([id, doc]) => {
      if (id === "origin") return;
      docMap.set(id, {
        ...doc,
        children: [],
        title: doc.title || `Document ${id}`,
      });
    });

    // Link children
    docMap.forEach((doc, id) => {
      if (doc.parentId) {
        const parent = docMap.get(doc.parentId);
        if (parent) {
          parent.children.push(doc);
        } else {
          tree.children.push(doc);
        }
      } else {
        tree.children.push(doc);
      }
    });

    return tree;
  }

  function renderDocumentTree(node, currentDocId, onSelect) {
    const container = document.createElement("div");
    container.className = "document-tree";

    if (!node.id && node.children) {
      node.children.forEach((child) => {
        container.appendChild(renderDocumentTree(child, currentDocId, onSelect));
      });
      return container;
    }

    if (node.id) {
      const item = document.createElement("div");
      item.className = `tree-item ${node.id === currentDocId ? "active" : ""}`;
      item.innerHTML = `
        <div class="tree-item-content">
          <span class="tree-item-title">${node.title || "Untitled"}</span>
          <small class="tree-item-id">(${node.id})</small>
        </div>
      `;

      item.addEventListener("click", () => {
        onSelect(node.id);
      });
      container.appendChild(item);
    }

    if (node.children && node.children.length > 0) {
      const childrenContainer = document.createElement("div");
      childrenContainer.className = "tree-children";
      node.children.sort((a, b) =>
        (a.title || "").localeCompare(b.title || "")
      );

      node.children.forEach((child, index) => {
        const isLastChild = index === node.children.length - 1;
        const childElement = document.createElement("div");
        childElement.className = "tree-child";

        const prefix = document.createElement("span");
        prefix.className = "tree-prefix";
        prefix.textContent = isLastChild ? "└─ " : "├─ ";

        const childContent = renderDocumentTree(child, currentDocId, onSelect);
        childContent.classList.add("tree-child-content");

        childElement.appendChild(prefix);
        childElement.appendChild(childContent);
        childrenContainer.appendChild(childElement);
      });

      container.appendChild(childrenContainer);
    }

    return container;
  }

  /**
   * -------------------------
   *   Editor Controls
   * -------------------------
   */
  function updateEditorControls(editorContainer, documentId, editorType) {
    const controls = document.createElement("div");
    controls.className = "editor-controls";
    controls.innerHTML = `
      <button 
        class="btn btn-outline-secondary select-fork-btn" 
        data-editor="${editorType}" 
        data-current-doc-id="${documentId}"
      >
        Select Different Fork
      </button>
      <button 
        class="fork-btn btn btn-outline-secondary" 
        data-document-id="${documentId}"
      >
        Fork
      </button>
    `;

    controls.querySelector(".select-fork-btn").addEventListener("click", (e) => {
      const editor = e.target.getAttribute("data-editor");
      const currentDocId = e.target.getAttribute("data-current-doc-id");
      const panel = createForkSelectorPanel(currentDocId, (selectedId) => {
        if (editor === "origin") {
          documents.origin.id = selectedId;
          saveToLocalStorage();
          originEditor.value(documents[selectedId].content);
        } else {
          addForkedEditor(selectedId);
        }
        panel.remove();
      });
      document.body.appendChild(panel);
    });

    return controls;
  }
});
