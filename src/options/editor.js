let saveTimeout;
let editor;
const SAVE_DEBOUNCE_DELAY = 1000;

const invalidKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Shift", "Enter", "Tab"];

const showAlert = message => {
  const status = document.getElementById("status-css");
  status.innerText = message;
  status.classList.add("active");

  setTimeout(() => {
    status.classList.remove("active");
    setTimeout(() => {
      status.innerText = "";
    }, 200);
  }, 2000);
};

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

document.getElementById("import-btn").addEventListener("click", () => {
  navigator.clipboard.readText().then(text => {
    try {
      if (!text.startsWith("blyrics-")) {
        throw new Error("Invalid prefix");
      }
      const css = atob(text.substring(8));
      editor.setValue(css);
      showAlert("Styles imported from clipboard!");
    } catch {
      showAlert("Invalid styles in clipboard! Please try again.");
    }
  });
});

document.getElementById("export-btn").addEventListener("click", () => {
  const css = editor.getValue(); // Use CodeMirror's getValue method
  if (!css) {
    showAlert("No styles to export!");
    return;
  }
  const base64 = "blyrics-" + btoa(css);
  navigator.clipboard.writeText(base64).then(() => {
    showAlert("Styles copied to clipboard!");
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const syncIndicator = document.getElementById("sync-indicator");

  // Initialize CodeMirror
  editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineWrapping: true,
    smartIndent: true,
    lineNumbers: true,
    foldGutter: true,
    autoCloseTags: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    autoRefresh: true,
    mode: "css",
    theme: "seti",
    extraKeys: {
      "Ctrl-Space": "autocomplete",
    },
  });

  editor.refresh();

  editor.setSize(null, 300);

  function saveToStorage() {
    const css = editor.getValue();
    chrome.storage.sync
      .set({ customCSS: css })
      .then(() => {
        syncIndicator.innerText = "Saved!";
        syncIndicator.classList.add("success");
        setTimeout(() => {
          syncIndicator.style.display = "none";
          syncIndicator.innerText = "Saving...";
          syncIndicator.classList.remove("success");
        }, 1000);

        // Send message to all tabs to update CSS
        chrome.tabs.query({ url: "*://music.youtube.com/*" }, tabs => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { action: "updateCSS", css: css });
          });
        });
      })
      .catch(() => {
        syncIndicator.innerText = "Something went wrong!";
        syncIndicator.classList.add("error");
        setTimeout(() => {
          syncIndicator.style.display = "none";
          syncIndicator.innerText = "Saving...";
          syncIndicator.classList.remove("error");
        }, 1000);
      });
  }

  function debounceSave() {
    syncIndicator.style.display = "block";
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveToStorage, SAVE_DEBOUNCE_DELAY);
  }

  editor.on("change", function () {
    debounceSave();
  });

  // Load saved content
  chrome.storage.sync.get("customCSS", function (data) {
    if (data.customCSS) {
      editor.setValue(data.customCSS);
    }
  });

  editor.on("keydown", function (cm, event) {
    const isInvalidKey = invalidKeys.includes(event.key);
    if (!cm.state.completionActive && !isInvalidKey) {
      cm.showHint({ completeSingle: false });
    }
  });
});

// Themes

const generateDefaultFilename = () => {
  const date = new Date();
  const timestamp = date.toISOString().replace(/[:.]/g, "-").slice(0, -5);
  return `blyrics-theme-${timestamp}.css`;
};

const saveCSSToFile = (css, defaultFilename) => {
  const blob = new Blob([css], { type: "text/css" });
  const url = URL.createObjectURL(blob);

  chrome.downloads.download(
    {
      url: url,
      filename: defaultFilename,
      saveAs: true,
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        showAlert("Error saving file. Please try again.");
      } else {
        showAlert("CSS file save dialog opened. Choose where to save your file.");
      }
      URL.revokeObjectURL(url);
    }
  );
};

const loadCSSFromFile = file => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      resolve(event.target.result);
    };
    reader.onerror = error => {
      reject(error);
    };
    reader.readAsText(file);
  });
};

document.getElementById("file-import-btn").addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".css";
  input.onchange = event => {
    const file = event.target.files[0];
    loadCSSFromFile(file)
      .then(css => {
        editor.setValue(css);
        showAlert(`CSS file "${file.name}" imported!`);
      })
      .catch(() => {
        showAlert("Error reading CSS file! Please try again.");
      });
  };
  input.click();
});

document.getElementById("file-export-btn").addEventListener("click", () => {
  const css = editor.getValue();
  if (!css) {
    showAlert("No styles to export!");
    return;
  }
  const defaultFilename = generateDefaultFilename();
  saveCSSToFile(css, defaultFilename);
});