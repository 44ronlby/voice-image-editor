from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

COMMANDS = ["brighten", "darken", "grayscale", "blur", "rotate"]
SAMPLES_PER_COMMAND = 5


@app.route("/")
def index():
    return render_template(
        "index.html",
        commands=COMMANDS,
        required=SAMPLES_PER_COMMAND,
    )