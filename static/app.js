const commands = ["brighten", "darken", "grayscale", "blur", "rotate"];
const requiredSamples = 5;
const counts = Object.fromEntries(commands.map((command) => [command, 0]));

const imageInput = document.querySelector("#image-input");
const preview = document.querySelector("#preview");
const previewPlaceholder = document.querySelector("#preview-placeholder");
const statusBox = document.querySelector("#status");
const trainButton = document.querySelector("#train-button");
const listenButton = document.querySelector("#listen-button");

let imageUrl = null;
const editorState = {
  brightness: 100,
  grayscale: 0,
  blur: 0,
  rotation: 0,
};

function setStatus(message) {
  statusBox.textContent = message;
}

function updateImage() {
  preview.style.filter = [
    `brightness(${editorState.brightness}%)`,
    `grayscale(${editorState.grayscale}%)`,
    `blur(${editorState.blur}px)`,
  ].join(" ");
  preview.style.transform = `rotate(${editorState.rotation}deg)`;
}

function applyCommand(command) {
  if (command === "brighten") {
    editorState.brightness = Math.min(180, editorState.brightness + 20);
  } else if (command === "darken") {
    editorState.brightness = Math.max(40, editorState.brightness - 20);
  } else if (command === "grayscale") {
    editorState.grayscale = editorState.grayscale === 0 ? 100 : 0;
  } else if (command === "blur") {
    editorState.blur = editorState.blur === 0 ? 4 : 0;
  } else if (command === "rotate") {
    editorState.rotation = (editorState.rotation + 90) % 360;
  }

  updateImage();
  setStatus(`Applied: ${command}`);
}

imageInput.addEventListener("change", () => {
  const [file] = imageInput.files;
  if (!file) {
    return;
  }

  if (imageUrl) {
    URL.revokeObjectURL(imageUrl);
  }

  imageUrl = URL.createObjectURL(file);
  preview.src = imageUrl;
  preview.hidden = false;
  previewPlaceholder.hidden = true;
  setStatus("Image loaded. Try the manual controls.");
});

document.querySelectorAll(".manual-command").forEach((button) => {
  button.addEventListener("click", () => applyCommand(button.dataset.command));
});

