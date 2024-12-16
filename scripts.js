document.addEventListener("DOMContentLoaded", () => {
  const DOCUMENTS_KEY = "documents"; // Single key to store all documents in localStorage

  // Function to generate a unique ID for forks
  function generateUUID() {
    return `fork-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Load all documents or initialize if empty
  let documents = JSON.parse(localStorage.getItem(DOCUMENTS_KEY)) || {};

  // Helper to get the current document ID dynamically
  function getCurrentDocumentId() {
    return document.querySelector(".editor-container.active")?.dataset.documentId || "origin";
  }

  // If the origin document doesn't exist in LocalStorage, initialize it
  if (!documents["origin"]) {
    documents["origin"] = {
      id: "origin",
      title: "Origin Document",
      content: "",
      parentId: null, // Origin has no parent
    };
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
  }

  /**
   * Load document content into the editor.
   */
  function loadDocumentContent(documentId, editor) {
    const savedContent = documents[documentId]?.content || "";
    editor.value(savedContent); // Set content in EasyMDE
    console.log(`Loaded content for document: ${documentId}`);
  }

  /**
   * Save the current document content back to LocalStorage.
   */
  function saveDocumentContent(documentId, editor) {
    documents[documentId].content = editor.value(); // Update content
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents)); // Save all documents
    console.log(`Saved content for document: ${documentId}`);
  }

  /**
   * Add a new editor dynamically to the page.
   */
  function addEditor(documentId) {
    // Create a new editor container
    const container = document.createElement("div");
    container.classList.add("editor-container", "active");
    container.dataset.documentId = documentId;

    // Create a unique ID for the editor element
    const editorId = `editor-${documentId}`;
    container.innerHTML = `
      <h5>${documents[documentId].title}</h5>
      <textarea id="${editorId}"></textarea>
    `;

    // Append the editor container to the page
    document.getElementById("editors").appendChild(container);

    // Initialize EasyMDE for the new editor
    const easyMDE = new EasyMDE({
      element: document.getElementById(editorId),
      autofocus: true,
      spellChecker: false,
      placeholder: `Write your markdown here...`,
    });

    // Load and save content for the new document
    loadDocumentContent(documentId, easyMDE);
    easyMDE.codemirror.on("change", () => saveDocumentContent(documentId, easyMDE));
  }

  /**
   * Fork the current document.
   */
  document.getElementById("fork-btn")?.addEventListener("click", () => {
    const currentDocumentId = getCurrentDocumentId(); // Get the ID of the current document being edited
    const forkId = generateUUID(); // Generate a unique ID for the fork

    // Create a new forked document
    documents[forkId] = {
      id: forkId,
      title: `Fork of ${documents[currentDocumentId].title}`,
      content: documents[currentDocumentId].content, // Copy content from the original document
      parentId: currentDocumentId, // Link the fork to its parent document
    };

    // Save to LocalStorage
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));

    // Add a new editor dynamically for the fork
    addEditor(forkId);

    // Notify user
    alert(`Document forked! New fork ID: ${forkId}`);
    console.log(`Fork created: ${forkId}`);
  });

  // Load the origin document initially
  addEditor("origin");
});
