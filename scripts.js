document.addEventListener("DOMContentLoaded", () => {
  // Initialize first EasyMDE editor
  const easyMDE1 = new EasyMDE({
    element: document.getElementById("markdown-editor-1"),
    autofocus: true,
    spellChecker: false,
    placeholder: "Write your markdown for Origin here...",
  });

  // Initialize second EasyMDE editor
  const easyMDE2 = new EasyMDE({
    element: document.getElementById("markdown-editor-2"),
    autofocus: true,
    spellChecker: false,
    placeholder: "Write your markdown for Adventure Arc here...",
  });
});
