document.addEventListener("DOMContentLoaded", () => {
  const DOCUMENTS_KEY = "documents";
  const forkContainer = document.getElementById("editors");
  const forkTitle = document.getElementById("fork-title");
  const originEditorElement = document.getElementById("origin-editor");
  const singleColumnBtn = document.getElementById("single-column");
  const twoColumnsBtn = document.getElementById("two-columns");
  let isSingleColumn = false;

  let documents = loadDocuments();
  initializeOriginEditor();
  forkTitle.style.display = "none";
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

  function displayMostRecentFork() {
    const forkIds = Object.keys(documents).filter(key => key !== "origin");
    if (forkIds.length > 0 && documents[forkIds[0]].parentId) {
      const mostRecentForkId = forkIds[forkIds.length - 1];
      addForkedEditor(mostRecentForkId);
      setColumnLayout(false);
    } else {
      setColumnLayout(true);
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
      const currentDocId = documents.origin.id;
      if (currentDocId) {
        documents[currentDocId].content = originEditor.value();
        saveToLocalStorage();
      }
    });

    const controls = updateEditorControls(originEditorElement.parentElement, documents.origin.id, "origin");
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
      title: `Fork of ${documents[actualDocumentId].title || "Untitled"}`,
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

    const controls = updateEditorControls(forkEditorContainer, forkId, "fork");
    forkEditorContainer.insertBefore(controls, forkEditorContainer.firstChild);

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

  function setColumnLayout(showSingleColumn) {
    isSingleColumn = showSingleColumn;

    const leftColumn = document.querySelector(
      ".container-fluid .row > .col-lg-6:first-child, .container-fluid .row > .col-lg-12"
    );
    const rightColumn = document.querySelector(
      ".container-fluid .row > .col-lg-6:last-child"
    );

    if (!leftColumn || !rightColumn) {
      console.error("Could not find column elements");
      return;
    }

    singleColumnBtn.style.display = isSingleColumn ? "none" : "block";
    twoColumnsBtn.style.display = isSingleColumn ? "block" : "none";

    if (isSingleColumn) {
      leftColumn.classList.remove("col-lg-6", "border-end");
      leftColumn.classList.add("col-lg-12");
      rightColumn.style.display = "none";
    } else {
      leftColumn.classList.remove("col-lg-12");
      leftColumn.classList.add("col-lg-6", "border-end");
      rightColumn.style.display = "block";
    }

    window.dispatchEvent(new Event("resize"));
  }

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

    Object.entries(documents).forEach(([id, doc]) => {
      if (id === "origin") return;

      docMap.set(id, {
        ...doc,
        children: [],
        title: doc.title || `Document ${id}`,
      });
    });

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
      node.children.sort((a, b) => (a.title || "").localeCompare(b.title || ""));

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

  function updateEditorControls(editorContainer, documentId, editorType) {
    const controls = document.createElement("div");
    controls.className = "editor-controls";
    controls.innerHTML = `
        <button class="btn btn-outline-secondary select-fork-btn" data-editor="${editorType}" data-current-doc-id="${documentId}">
            Select Different Fork
        </button>
        <button class="fork-btn btn btn-outline-secondary" data-document-id="${documentId}">
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
