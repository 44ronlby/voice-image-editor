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

async function recordAudio(durationMs = 1200) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks = [];
  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  });
  const stopped = new Promise((resolve, reject) => {
    recorder.addEventListener("stop", resolve, { once: true });
    recorder.addEventListener("error", (event) => reject(event.error), { once: true });
  });
  recorder.start();
  await new Promise((resolve) => setTimeout(resolve, durationMs));
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());
  const blob = new Blob(chunks, { type: recorder.mimeType });
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(await blob.arrayBuffer());
  const audio = Array.from(audioBuffer.getChannelData(0));
  const sampleRate = audioBuffer.sampleRate;
  await audioContext.close();
  return { audio, sampleRate };
}

async function postJSON(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}.`);
  }
  return data;
}
document.querySelectorAll(".record-command").forEach((button) => {
  button.addEventListener("click", async () => {
    const command = button.dataset.command;
    button.disabled = true;
    setStatus(`Recording “${command}” now...`);

    try {
      const recording = await recordAudio();
      const data = await postJSON("/sample", { command, ...recording });
      Object.assign(counts, data.counts);
      refreshTrainingState();
      setStatus(data.message);
    } catch (error) {
      setStatus(error.message);
    } finally {
      button.disabled = false;
    }
  });
});

listenButton.addEventListener("click", async () => {
  listenButton.disabled = true;
  setStatus("Listening for one command...");

  try {
    const recording = await recordAudio();
    const data = await postJSON("/predict", recording);
    setStatus(`Heard: ${data.command}`);
  } catch (error) {
    setStatus(error.message);
  } finally {
    listenButton.disabled = false;
  }
});

function refreshTrainingState() {
  for (const command of commands) {
    document.querySelector(`#count-${command}`).textContent =
      `${counts[command]}/${requiredSamples}`;
  }

  trainButton.disabled = !commands.every(
    (command) => counts[command] >= requiredSamples,
  );
}

refreshTrainingState();
updateImage();