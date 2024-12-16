document.addEventListener("DOMContentLoaded", () => {
  const DOCUMENTS_KEY = "documents"; // Single key to store all documents in localStorage

  // Function to generate a unique ID for forks
  function generateUUID() {
    return `fork-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Load all documents or initialize if empty
  let documents = JSON.parse(localStorage.getItem(DOCUMENTS_KEY)) || {};

  // Get the current document ID dynamically from the data attribute
  const editorElement = document.getElementById("markdown-editor");
  const documentId = editorElement.getAttribute("data-document-id");

  // If the current document doesn't exist in localStorage, initialize it
  if (!documents[documentId]) {
    documents[documentId] = {
      id: documentId,
      title: documentId === "origin" ? "Origin Document" : `Fork of ${documentId}`,
      content: "",
      parentId: documentId === "origin" ? null : "origin", // Origin has no parent
    };
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
  }

  // Initialize the EasyMDE editor
  const easyMDE = new EasyMDE({
    element: editorElement,
    autofocus: true,
    spellChecker: false,
    placeholder: `Write your markdown here...`,
  });

  /**
   * Load document content into the EasyMDE editor.
   */
  function loadDocumentContent() {
    const savedContent = documents[documentId]?.content || "";
    easyMDE.value(savedContent); // Set content in EasyMDE
    console.log(`Loaded content for document: ${documentId}`);
  }

  /**
   * Save the current document content back to localStorage.
   */
  function saveDocumentContent() {
    documents[documentId].content = easyMDE.value(); // Update content
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents)); // Save all documents
    console.log(`Saved content for document: ${documentId}`);
  }

  // Load the document content on initialization
  loadDocumentContent();

  // Save content to localStorage whenever the user makes changes
  easyMDE.codemirror.on("change", saveDocumentContent);

  // Save content one last time when the user is leaving the page
  window.addEventListener("beforeunload", saveDocumentContent);

  /**
   * Fork the current document.
   * Generates a new fork with the same content and a new ID.
   */
  document.getElementById("fork-btn")?.addEventListener("click", () => {
    const forkId = generateUUID();
    documents[forkId] = {
      id: forkId,
      title: `Fork of ${documents[documentId].title}`,
      content: documents[documentId].content,
      parentId: documentId,
    };

    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
    alert(`Document forked! New fork ID: ${forkId}`);
    console.log(`Fork created: ${forkId}`);
  });
});
