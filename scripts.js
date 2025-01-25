document.addEventListener("DOMContentLoaded", () => {
  const DOCUMENTS_KEY = "documents";
  const editorContainer = document.getElementById("editor-container");
  const diffViewContainer = document.getElementById("diff-view");

  // For column layout
  const originColumn = document.getElementById("origin-column");
  const forkColumn = document.getElementById("fork-column");
  const forkContainer = document.getElementById("editors");
  const forkTitle = document.getElementById("fork-title");

  // Nav Buttons
  const singleColumnBtn = document.getElementById("single-column");
  const twoColumnsBtn = document.getElementById("two-columns");
  const diffToggleBtn = document.getElementById("toggle-diff");

  // Global State
  let documents = loadDocuments();
  let isSingleColumn = false;
  let isDiffMode = false;
  let lastFocusedEditor = "origin"; // tracks which side is active

  // Editor references
  let originEditor = null; // The EasyMDE instance for the origin side
  let forkEditor = null;   // The EasyMDE instance for the fork side

  // We also track which doc IDs are currently loaded in each editor
  let currentOriginDocId = documents.origin.id; 
  let currentForkDocId = null; // set once we create a fork

  // Init
  initOriginEditor(currentOriginDocId);
  displayMostRecentFork();

  // Listen for nav events
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

  // Listen for any "Fork" button
  document.body.addEventListener("click", (e) => {
    if (e.target.classList.contains("fork-btn")) {
      const documentId = e.target.getAttribute("data-document-id");
      handleFork(documentId);
    }
  });

  /**
   * -------------------------
   *       Load / Save
   * -------------------------
   */
  function loadDocuments() {
    let data = JSON.parse(localStorage.getItem(DOCUMENTS_KEY));
    if (!data || !data.origin || !data.origin.id) {
      data = initializeDocuments();
    }
    return data;
  }

  function initializeDocuments() {
    const originId = generateUUID();
    const initial = {
      origin: { id: originId },
      [originId]: {
        id: originId,
        title: "1",
        content: "Write in Markdown here...",
        parentId: null,
      },
    };
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(initial));
    return initial;
  }

  function saveToLocalStorage(data = documents) {
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(data));
  }

  function generateUUID() {
    return `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * -------------------------
   *   Origin Editor Setup
   * -------------------------o
   */
  function initOriginEditor(docId) {
    // If there's an existing editor, destroy it first
    if (originEditor) {
      originEditor.toTextArea();
      originEditor = null;
    }

    const originTextArea = document.getElementById("origin-editor");
    originEditor = new EasyMDE({
      element: originTextArea,
      autofocus: true,
      spellChecker: false,
    });

    // Load the doc content
    if (documents[docId]) {
      originEditor.value(documents[docId].content || "");
    }

    // Listen for changes
    originEditor.codemirror.on("change", () => {
      documents[docId].content = originEditor.value();
      saveToLocalStorage();
    });

    // Track focus
    originEditor.codemirror.on("focus", () => {
      lastFocusedEditor = "origin";
    });

    // Insert editor controls
    const controls = updateEditorControls(
      originTextArea.parentElement,
      docId,
      "origin"
    );
    // Make sure we place them above the text area
    const existingControls = originTextArea.parentElement.querySelector(".editor-controls");
    if (existingControls) existingControls.remove();
    originTextArea.parentElement.insertBefore(controls, originTextArea);
  }

  /**
   * -------------------------
   *   Fork Editor Setup
   * -------------------------
   */
  function initForkEditor(docId) {
    // Destroy any existing fork editor
    if (forkEditor) {
      forkEditor.toTextArea();
      forkEditor = null;
    }

    // Clear out the forkContainer first
    forkContainer.innerHTML = "";

    // Make a fresh <textarea>
    const forkEditorContainer = document.createElement("div");
    forkEditorContainer.innerHTML = `
      <textarea id="editor-${docId}" data-document-id="${docId}"></textarea>
    `;
    forkContainer.appendChild(forkEditorContainer);

    // Insert controls
    const textArea = forkEditorContainer.querySelector("textarea");
    const controls = updateEditorControls(forkEditorContainer, docId, "fork");
    forkEditorContainer.insertBefore(controls, textArea);

    // Create new EasyMDE
    forkEditor = new EasyMDE({
      element: textArea,
      autofocus: false,
      spellChecker: false,
    });

    // Load content
    if (documents[docId]) {
      forkEditor.value(documents[docId].content || "");
    }

    // Listen for changes
    forkEditor.codemirror.on("change", () => {
      documents[docId].content = forkEditor.value();
      saveToLocalStorage();
    });

    // Track focus
    forkEditor.codemirror.on("focus", () => {
      lastFocusedEditor = "fork";
    });
  }

  /**
   * -------------------------
   *    Display Fork Editor
   * -------------------------
   */
  function displayMostRecentFork() {
    const forkIds = getAllForkIds();
    if (!forkIds.length) {
      // No forks => single column
      setColumnLayout(true);
      return;
    }

    // If there's exactly 1 fork whose parent is null, might be special
    if (forkIds.length === 1 && documents[forkIds[0]].parentId == null) {
      return;
    }

    // Otherwise, show two columns
    setColumnLayout(false);

    // Show the most recently created fork
    // const mostRecentForkId = forkIds[forkIds.length - 1];
    // currentForkDocId = mostRecentForkId;
    // forkTitle.style.display = "block";
    // initForkEditor(mostRecentForkId);

    //Rather than show most recently created fork, we show the most recently opened fork
    let last_loaded = 0;
    let loaded_doc = {};
    let currentForkDocId;

    //we loop through all fork ids
    for (let forkId of getAllForkIds()) {
      //access each document, check its last loaded timestamp
      if (documents[forkId].last_loaded > last_loaded) {
        //assign last loaded to the most recently loaded document
        last_loaded = documents[forkId].last_loaded 
        loaded_doc = documents[forkId]
        currentForkDocId = forkId
      }
    }


      //display fork editor
      forkTitle.style.display = "block";
      initForkEditor(currentForkDocId)

  }

  function getAllForkIds() {
    return Object.keys(documents).filter((key) => key !== "origin");
  }

  /**
   * -------------------------
   *       Handle Fork
   * -------------------------
   */
  function handleFork(documentId) {
    // The actual doc we are forking
    const actualDocId = documentId === "origin"
      ? currentOriginDocId
      : documentId;

    

    const newForkId = generateUUID();

    //logic for determining title
    const tree = buildDocumentTree()
    let new_title = "";

    //for document being forked, check parent's id
    let parent_id = documents[actualDocId].id
    let parent_title = documents[actualDocId].title
    //if there is no parent, it is the origin.
    if (parent_id == undefined) {
      parent_title = "1"
    }


    //search through document tree untl matching document with parent id is found
    let parent = findDocumentByParentId(tree, parent_id)

        
    //after checking parent's id, check for siblings
    let siblings = parent.children.length

    //if no siblings, append .1 to parent's title
    if (siblings == 0) {
      new_title = parent_title + ".1"
    }
    //if siblings, append x # of siblings instead of 1
    else {
      new_title = parent_title + `.${siblings + 1}`
    }
    //overwrite title
    


    documents[newForkId] = {
      id: newForkId,
      title: `${new_title}`,
      content: documents[actualDocId].content,
      parentId: actualDocId,
    };
    saveToLocalStorage();

    // Show two columns
    setColumnLayout(false);
    currentForkDocId = newForkId;
    forkTitle.style.display = "block";
    initForkEditor(newForkId);
  }

  /**
   * -------------------------
   *  Editor Controls (Select)
   * -------------------------
   */
  function updateEditorControls(editorParent, docId, editorType) {
    const controls = document.createElement("div");
    controls.className = "editor-controls";
    controls.innerHTML = `
      <button 
        class="btn btn-outline-secondary select-fork-btn" 
        data-editor="${editorType}" 
        data-current-doc-id="${docId}"
      >
        Select Different Fork
      </button>
      <button 
        class="fork-btn btn btn-outline-secondary" 
        data-document-id="${docId}"
      >
        Fork
      </button>
    `;

    // Clicking "Select Different Fork"
    controls.querySelector(".select-fork-btn").addEventListener("click", (e) => {
      const editor = e.target.getAttribute("data-editor");
      const currentDocId = e.target.getAttribute("data-current-doc-id");

      const panel = createForkSelectorPanel(currentDocId, (selectedId) => {
        panel.remove();

        //on load, overwrite date
        documents[selectedId].last_loaded = Date.now();
        saveToLocalStorage()
        
        // If user selected a new doc for "origin"
        if (editor === "origin") {
          // 1) Save the old doc’s content
          //    (Actually, it’s already saved on every keystroke, but we can be safe.)
          documents[currentOriginDocId].content = originEditor.value();

          // 2) Switch the origin pointer & re‐init
          currentOriginDocId = selectedId;
          documents.origin.id = selectedId;
          initOriginEditor(selectedId);

        } else {
          // "fork" side
          documents[currentForkDocId].content = forkEditor ? forkEditor.value() : "";
          currentForkDocId = selectedId;
          initForkEditor(selectedId);
        }
      });

      document.body.appendChild(panel);
    });

    return controls;
  }

  /**
   * -------------------------
   *   Column Layout Toggle
   * -------------------------
   */
  function setColumnLayout(showSingleColumn) {
    isSingleColumn = showSingleColumn;

    if (showSingleColumn) {
      originColumn.classList.remove("col-lg-6", "border-end");
      originColumn.classList.add("col-lg-12");
      forkColumn.style.display = "none";
      forkTitle.style.display = "none";
      singleColumnBtn.style.display = "none";
      twoColumnsBtn.style.display = "block";
    } else {
      originColumn.classList.remove("col-lg-12");
      originColumn.classList.add("col-lg-6", "border-end");
      forkColumn.style.display = "block";
      forkTitle.style.display = "block";
      singleColumnBtn.style.display = "block";
      twoColumnsBtn.style.display = "none";

      // If we have at least one fork doc, show the most recent
      const forkIds = getAllForkIds();
      if (forkIds.length > 0) {
        if (!currentForkDocId) {
          currentForkDocId = forkIds[forkIds.length - 1];
        }
        // Make sure there's an active fork editor
        initForkEditor(currentForkDocId);
      }
    }

    window.dispatchEvent(new Event("resize"));

    // If we are in diff mode, re‐render the diff
    if (isDiffMode) {
      showDiff();
    }
  }

  /**
   * -------------------------
   *   Diff View (Toggle)
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
    editorContainer.style.display = "none";
    diffViewContainer.style.display = "block";

    // If there's no fork, or single column, just compare origin doc to itself
    const forkIds = getAllForkIds();
    if (isSingleColumn || !forkIds.length) {
      const text = documents[currentOriginDocId].content || "";
      renderDiff(text, text, "Origin", "Origin");
      return;
    }

    // Decide which doc is "old" vs "new" based on lastFocusedEditor
    // (If origin is last focused -> origin is "new", fork is "old", else reversed)
    let oldContent, newContent;
    let oldTitle, newTitle;

    if (lastFocusedEditor === "origin") {
      newContent = documents[currentOriginDocId]?.content || "";
      oldContent = documents[currentForkDocId]?.content || "";
      newTitle = documents[currentOriginDocId]?.title || "Origin";
      oldTitle = documents[currentForkDocId]?.title || "Fork";
    } else {
      newContent = documents[currentForkDocId]?.content || "";
      oldContent = documents[currentOriginDocId]?.content || "";
      newTitle = documents[currentForkDocId]?.title || "Fork";
      oldTitle = documents[currentOriginDocId]?.title || "Origin";
    }

    renderDiff(oldContent, newContent, oldTitle, newTitle);
  }

  function hideDiff() {
    editorContainer.style.display = "block";
    diffViewContainer.style.display = "none";
  }

  function renderDiff(oldStr, newStr, oldName, newName) {
    const diffString = Diff.createTwoFilesPatch(
      oldName,
      newName,
      oldStr,
      newStr,
      "",
      "",
      { context: 3 }
    );

    const diffHtml = Diff2Html.html(diffString, {
      drawFileList: false,
      matching: "words",
      outputFormat: "side-by-side",
    });

    diffViewContainer.innerHTML = diffHtml;
  }

  /**
   * -------------------------
   *  Fork Selector Panel
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
      docMap.set(id, { ...doc, children: [], title: doc.title || `Document ${id}` });
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

      // Sort children by title
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

      //search through document tree untl matching document with parent id is found
      function findDocumentByParentId(tree, targetParentId) {
        function search(node) {
          if (node.children) {
            for (const child of node.children) {
              if (child.id === targetParentId) return child;
              const found = search(child);
              if (found) return found;
            }
          }
          return null;
        }
        return search(tree);
      }
      
});
