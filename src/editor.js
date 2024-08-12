const openEditCSS = () => {
  const editCSS = document.getElementById("css");
  const options = document.getElementById("options");

  editCSS.style.display = "block";
  options.style.display = "none";
};

document.getElementById("edit-css-btn").addEventListener("click", openEditCSS);

const openOptions = () => {
  const editCSS = document.getElementById("css");
  const options = document.getElementById("options");

  editCSS.style.display = "none";
  options.style.display = "block";
};

document.getElementById("back-btn").addEventListener("click", openOptions);

document.addEventListener("DOMContentLoaded", function () {
  const editor = document.getElementById("editor");
  const highlight = document.querySelector("#highlight code");

  function updateHighlighting() {
    const code = editor.value;
    highlight.innerHTML = highlightCSS(code);
    syncScroll();
  }

  function syncScroll() {
    highlight.parentElement.scrollTop = editor.scrollTop;
    highlight.parentElement.scrollLeft = editor.scrollLeft;
  }

  function toggleComment() {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const lines = editor.value.split("\n");
    const startLine = editor.value.substring(0, start).split("\n").length - 1;
    const endLine = editor.value.substring(0, end).split("\n").length - 1;

    const isCommented = lines[startLine].trim().startsWith("/*") && lines[startLine].trim().endsWith("*/");

    if (isCommented) {
      // Uncomment lines
      if (startLine === endLine) {
        lines[startLine] = lines[startLine].replace(/^\/\*\s*/, "").replace(/\s*\*\/$/, "");
      } else {
        lines[startLine] = lines[startLine].replace(/^\/\*\s*/, "");
        lines[endLine] = lines[endLine].replace(/\s*\*\/$/, "");
      }
    } else {
      // Comment lines
      if (startLine === endLine) {
        lines[startLine] = `/* ${lines[startLine]} */`;
      } else {
        lines[startLine] = `/* ${lines[startLine]}`;
        lines[endLine] = `${lines[endLine]} */`;
      }
    }

    editor.value = lines.join("\n");
    editor.setSelectionRange(start, end); // Restore cursor position
    updateHighlighting();
  }

  editor.addEventListener("input", function () {
    chrome.storage.sync.set({ customCSS: editor.value });
    updateHighlighting();
  });

  // Load saved content
  chrome.storage.sync.get("customCSS", function (data) {
    if (data.customCSS) {
      editor.value = data.customCSS;
      updateHighlighting();
    }
  });

  editor.addEventListener("keydown", function (e) {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = this.selectionStart;
      const end = this.selectionEnd;
      this.value = this.value.substring(0, start) + "    " + this.value.substring(end);
      this.selectionStart = this.selectionEnd = start + 4;
      updateHighlighting();
    } else if ((e.metaKey || e.ctrlKey) && e.key === "/") {
      e.preventDefault();
      toggleComment();
    }
  });

  editor.addEventListener("scroll", syncScroll);

  updateHighlighting();
});

const highlightCSS = code => {
  // Escape HTML characters
  let escapedCode = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Initialize a hashmap and placeholders
  const tokenMap = [];
  let placeholderCount = 0;

  // Function to add a token to the map
  const addToken = (type, value) => {
    const placeholder = `__TOKEN_${placeholderCount}__`;
    tokenMap.push({ type, value, placeholder });
    placeholderCount++;
    return placeholder;
  };

  // Replace parts of the CSS with placeholders
  let highlightedCode = escapedCode
    .replace(/\/\*[\s\S]*?\*\//g, match => addToken("comment", match))
    .replace(/(["'])(?:\\.|[^\\])*?\1/g, match => addToken("string", match))
    .replace(/([^\{\s]+)(?=\s*\{)/g, match => addToken("selector", match))
    .replace(/([\w-]+)(?=\s*:)/g, match => addToken("property", match))
    .replace(/:\s*([^;\}\s]+(?:\s+[^\;\}\s]+)*)/g, match => addToken("value", match))
    .replace(/!important\b/gi, match => addToken("important", match))
    .replace(/[{}:;]/g, match => addToken("punctuation", match));

  // Convert tokens to HTML spans
  tokenMap.forEach(({ type, value, placeholder }) => {
    highlightedCode = highlightedCode.replace(placeholder, `<span class="${type}">${value}</span>`);
  });

  return highlightedCode;
};
