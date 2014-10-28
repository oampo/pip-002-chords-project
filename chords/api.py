import os.path
import json

from flask import request, Response, url_for, send_from_directory
from werkzeug.utils import secure_filename
from jsonschema import validate, ValidationError

import models
import decorators
import analysis
from chords import app
from database import session
from utils import upload_path


@app.route("/api/songs", methods=["GET"])
@decorators.accept("application/json")
def songs_get():
    songs = session.query(models.Song).all()

    data = [song.asDictionary() for song in songs]
    return Response(json.dumps(data), 200, mimetype="application/json")

@app.route("/api/songs", methods=["POST"])
@decorators.accept("application/json")
@decorators.require("application/json")
def songs_post():
    data = request.json
    file = session.query(models.File).get(data["file"]["id"])
    if not file:
        data = {"message": "Could not find file with id {}".format(id)}
        return Response(json.dumps(data), 404, mimetype="application/json")

    song = models.Song(file=file)
    session.add(song)
    session.commit()

    data = song.asDictionary()
    return Response(json.dumps(data), 201, mimetype="application/json")

@app.route("/api/songs/<int:id>/chords", methods=["GET"])
@decorators.accept("application/json")
def song_chords(id):
    song = session.query(models.Song).get(id)
    if not song:
        data = {"message": "Could not find song with id {}".format(id)}
        return Response(json.dumps(data), 404, mimetype="application/json")

    path = upload_path(song.file.filename)
    chords = analysis.calculate_chords(path)
    return Response(json.dumps(chords), 200, mimetype="application/json")

@app.route("/api/songs/<int:id>/analysis", methods=["GET"])
@decorators.accept("application/json")
def song_analysis(id):
    song = session.query(models.Song).get(id)
    if not song:
        data = {"message": "Could not find song with id {}".format(id)}
        return Response(json.dumps(data), 404, mimetype="application/json")

    path = upload_path(song.file.filename)
    data = analysis.analyse(path)
    return Response(json.dumps(data), 200, mimetype="application/json")

@app.route("/api/files", methods=["POST"])
@decorators.require("multipart/form-data")
@decorators.accept("application/json")
def file_post():
    file = request.files.get("file")
    if not file:
        data = {"message": "Could not find file data"}
        return Response(json.dumps(data), 422, mimetype="application/json")

    filename = secure_filename(file.filename)
    db_file = models.File(filename=filename)
    session.add(db_file)
    session.commit()
    file.save(upload_path(filename))

    data = db_file.asDictionary()
    return Response(json.dumps(data), 201, mimetype="application/json")

@app.route("/uploads/<filename>", methods=["GET"])
def uploaded_file(filename):
    return send_from_directory(upload_path(), filename)


