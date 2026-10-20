from flask import Flask, jsonify, render_template, request
import librosa
import numpy as np

app = Flask(__name__)

COMMANDS = ["brighten", "darken", "grayscale", "blur", "rotate"]
SAMPLES_PER_COMMAND = 5
training_features = []
training_labels = []
model = None


def extract_features(audio_samples, sample_rate):
    audio = np.asarray(audio_samples, dtype=np.float32)
    if audio.size < 2048:
        raise ValueError("The recording is too short. Try again and speak clearly.")

    mfcc = librosa.feature.mfcc(
        y=audio,
        sr=float(sample_rate),
        n_mfcc=20,
    )
    return mfcc.mean(axis=1)


def sample_counts():
    return {
        command: training_labels.count(command)
        for command in COMMANDS
    }


@app.route("/")
def index():
    return render_template(
        "index.html",
        commands=COMMANDS,
        required=SAMPLES_PER_COMMAND,
    )


@app.route("/sample", methods=["POST"])
def add_sample():
    payload = request.get_json()
    command = payload.get("command")
    audio = payload.get("audio", [])
    sample_rate = payload.get("sampleRate")

    if command not in COMMANDS:
        return jsonify({"error": "Unknown command label."}), 400
    if not audio or not sample_rate:
        return jsonify({"error": "Audio samples and sample rate are required."}), 400

    try:
        features = extract_features(audio, sample_rate)
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    training_features.append(features)
    training_labels.append(command)

    return jsonify({
        "message": f"Saved example for {command}.",
        "counts": sample_counts(),
    })


@app.route("/predict", methods=["POST"])
def predict_command():
    if model is None:
        return jsonify({"error": "Train the model first."}), 400